import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const admin = randomUUID(),
  alice = randomUUID(),
  bob = randomUUID(),
  pending = randomUUID(),
  round = randomUUID(),
  home = randomUUID(),
  away = randomUUID();
async function as<T>(id: string | null, fn: (tx: any) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE sbk_app");
    await tx.query("SELECT set_config('sbk.user_id',$1,true)", [id ?? ""]);
    return fn(tx);
  });
}
async function fixture() {
  return (
    await db.query<{ id: string }>(
      "INSERT INTO sbk.fixtures(round_id,home_id,away_id,kickoff) VALUES($1,$2,$3,clock_timestamp()+interval '1 hour') RETURNING id",
      [round, home, away],
    )
  ).rows[0].id;
}
async function predict(id: string, f: string, h = 2, a = 1) {
  return as(id, (tx) =>
    tx.query(
      "INSERT INTO sbk.predictions(fixture_id,member_id,home_goals,away_goals,predicted_winner,first_goal) VALUES($1,$2,$3,$4,$5,'home') ON CONFLICT(fixture_id,member_id) DO UPDATE SET home_goals=EXCLUDED.home_goals,away_goals=EXCLUDED.away_goals,predicted_winner=EXCLUDED.predicted_winner,first_goal=EXCLUDED.first_goal RETURNING *",
      [f, id, h, a, h > a ? "home" : h < a ? "away" : "draw"],
    ),
  );
}
async function finalize(f: string, h: number, a: number, reason = "") {
  return as(admin, (tx) =>
    tx.query(
      "INSERT INTO sbk.results(fixture_id,home_goals,away_goals,winner,first_goal,updated_by,reason) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(fixture_id) DO UPDATE SET home_goals=EXCLUDED.home_goals,away_goals=EXCLUDED.away_goals,winner=EXCLUDED.winner,first_goal=EXCLUDED.first_goal,reason=EXCLUDED.reason",
      [f, h, a, h > a ? "home" : h < a ? "away" : "draw", h === 0 && a === 0 ? "nobody" : "home", admin, reason],
    ),
  );
}
before(async () => {
  const migrationFiles = (
    await Promise.all(
      ["migrations", "supabase/migrations"].map(async (directory) =>
        (await readdir(directory))
          .filter((file) => file.endsWith(".sql"))
          .map((file) => ({ directory, file })),
      ),
    )
  ).flat().sort((a, b) => a.file.localeCompare(b.file));
  for (const { directory, file } of migrationFiles)
    await db.exec(await readFile(directory + "/" + file, "utf8"));
  for (const [id, n, role, status] of [
    [admin, "Admin", "admin", "approved"],
    [alice, "Alice", "member", "approved"],
    [bob, "Bob", "member", "approved"],
    [pending, "Pending", "member", "pending"],
  ])
    await db.query(
      "INSERT INTO sbk.profiles(id,display_name,email,role,membership) VALUES($1,$2,$3,$4,$5)",
      [id, n, n + "@test.example", role, status],
    );
  await db.query(
    "INSERT INTO sbk.rounds(id,name_en,name_ml) VALUES($1,'Round','റൗണ്ട്')",
    [round],
  );
  await db.query(
    "INSERT INTO sbk.teams(id,name_en,short_name) VALUES($1,'Home','H'),($2,'Away','A')",
    [home, away],
  );
});
test("only an approved admin can promote an approved member and the change is audited", async () => {
  await assert.rejects(
    as(alice, (tx) => tx.query("SELECT sbk.promote_member($1)", [bob])),
    /forbidden/,
  );
  await assert.rejects(
    as(admin, (tx) => tx.query("SELECT sbk.promote_member($1)", [pending])),
    /admin_protected/,
  );
  await as(admin, (tx) => tx.query("SELECT sbk.promote_member($1)", [bob]));
  const promoted = await db.query<{ role: string }>(
    "SELECT role FROM sbk.profiles WHERE id=$1",
    [bob],
  );
  assert.equal(promoted.rows[0].role, "admin");
  const audit = await db.query<{ after_value: { role: string } }>(
    "SELECT after_value FROM sbk.admin_audit_events WHERE target='profiles' AND after_value->>'id'=$1 ORDER BY created_at DESC LIMIT 1",
    [bob],
  );
  assert.equal(audit.rows[0].after_value.role, "admin");
});
after(() => db.close());
test("database enforces approval, cross-member privacy, and protected writes", async () => {
  const f = await fixture();
  await predict(alice, f);
  assert.equal(
    (
      (await as(bob, (tx) =>
        tx.query("SELECT * FROM sbk.predictions WHERE fixture_id=$1", [f]),
      )) as any
    ).rows.length,
    0,
  );
  assert.equal(
    (
      (await as(admin, (tx) =>
        tx.query("SELECT * FROM sbk.predictions WHERE fixture_id=$1", [f]),
      )) as any
    ).rows.length,
    0,
  );
  assert.equal(
    ((await as(pending, (tx) => tx.query("SELECT * FROM sbk.fixtures"))) as any)
      .rows.length,
    0,
  );
  assert.equal(
    (
      (await as(null, (tx) =>
        tx.query("SELECT * FROM sbk.standings(NULL)"),
      )) as any
    ).rows.length,
    0,
  );
  await assert.rejects(predict(pending, f));
  assert.equal(
    ((await as(alice, (tx) => tx.query("SELECT * FROM sbk.profiles"))) as any)
      .rows.length,
    1,
  );
  await assert.rejects(
    as(alice, (tx) =>
      tx.query("UPDATE sbk.profiles SET role='admin' WHERE id=$1", [alice]),
    ),
  );
  await assert.rejects(
    as(alice, (tx) =>
      tx.query("UPDATE sbk.profiles SET membership='approved' WHERE id=$1", [
        pending,
      ]),
    ).then((r: any) => {
      if (r.affectedRows === 0) return Promise.reject(new Error("RLS denied"));
    }),
  );
  await assert.rejects(
    as(pending, (tx) =>
      tx.query("UPDATE sbk.profiles SET membership='approved' WHERE id=$1", [
        pending,
      ]),
    ),
  );
  await assert.rejects(
    as(alice, (tx) =>
      tx.query(
        "INSERT INTO sbk.results(fixture_id,home_goals,away_goals,updated_by) VALUES($1,2,1,$2)",
        [f, alice],
      ),
    ),
  );
  await assert.rejects(
    as(alice, (tx) =>
      tx.query(
        "INSERT INTO sbk.admin_audit_events(action,target) VALUES('fake','test')",
      ),
    ),
  );
  await assert.rejects(
    as(alice, (tx) => tx.query("SELECT * FROM sbk.local_credentials")),
  );
});
test("database deadline, idempotency, revision history, rescheduling, postponement, cancellation", async () => {
  const f = await fixture();
  await predict(alice, f, 1, 0);
  await predict(alice, f, 1, 0);
  assert.equal(
    (await db.query("SELECT * FROM sbk.predictions WHERE fixture_id=$1", [f]))
      .rows.length,
    1,
  );
  await predict(alice, f, 2, 1);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM sbk.prediction_revisions pr JOIN sbk.predictions p ON p.id=pr.prediction_id WHERE p.fixture_id=$1",
        [f],
      )
    ).rows.length,
    1,
  );
  await as(admin, (tx) =>
    tx.query(
      "UPDATE sbk.fixtures SET kickoff=clock_timestamp()+interval '5 minutes',schedule_note_en='Earlier kickoff',schedule_note_ml='നേരത്തെ ആരംഭിക്കും' WHERE id=$1",
      [f],
    ),
  );
  await assert.rejects(predict(alice, f), /prediction_locked/);
  await as(admin, (tx) =>
    tx.query(
      "UPDATE sbk.fixtures SET kickoff=clock_timestamp()+interval '2 hours',schedule_note_en='Later kickoff',schedule_note_ml='സമയം മാറ്റി' WHERE id=$1",
      [f],
    ),
  );
  await predict(alice, f, 3, 1);
  await as(admin, (tx) =>
    tx.query("UPDATE sbk.fixtures SET status='postponed' WHERE id=$1", [f]),
  );
  await assert.rejects(predict(alice, f), /prediction_locked/);
  await assert.rejects(finalize(f, 2, 1), /result_state/);
  await as(admin, (tx) =>
    tx.query("UPDATE sbk.fixtures SET status='cancelled' WHERE id=$1", [f]),
  );
  await assert.rejects(predict(alice, f), /prediction_locked/);
  assert.equal(
    (await db.query("SELECT * FROM sbk.predictions WHERE fixture_id=$1", [f]))
      .rows.length,
    1,
  );
  await as(admin, (tx) =>
    tx.query("UPDATE sbk.fixtures SET status='scheduled' WHERE id=$1", [f]),
  );
  await predict(alice, f, 2, 0);
});
test("admin can import a locked WhatsApp prediction and update a member identifier", async () => {
  const f = await fixture();
  await assert.rejects(
    as(admin, (tx) => tx.query("SELECT sbk.admin_upsert_prediction($1,$2,2,1,'home','home')", [alice, f])),
    /prediction_not_locked/,
  );
  await as(admin, (tx) => tx.query("UPDATE sbk.fixtures SET kickoff=clock_timestamp()-interval '1 hour',status='awaiting_result',schedule_note_en='Played',schedule_note_ml='കളിച്ചു' WHERE id=$1", [f]));
  await as(admin, (tx) => tx.query("SELECT sbk.admin_upsert_prediction($1,$2,2,1,'home','home')", [alice, f]));
  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) FROM sbk.predictions WHERE fixture_id=$1 AND member_id=$2", [f, alice])).rows[0].count), 1);
  await assert.rejects(
    as(admin, (tx) => tx.query("SELECT sbk.admin_upsert_prediction($1,$2,0,0,'draw','nobody')", [pending, f])),
    /member_not_approved/,
  );
  await assert.rejects(as(alice, (tx) => tx.query("SELECT sbk.admin_update_identifier($1,$2)", [alice, "new@test.example"])), /forbidden/);
  await as(admin, (tx) => tx.query("SELECT sbk.admin_update_identifier($1,$2)", [alice, "new@test.example"]));
  assert.equal((await db.query<{ email: string }>("SELECT email FROM sbk.profiles WHERE id=$1", [alice])).rows[0].email, "new@test.example");
});
test("admin can permanently delete a member and dependent private data", async () => {
  const removable = randomUUID(), f = await fixture();
  await db.query("INSERT INTO sbk.profiles(id,display_name,email,membership) VALUES($1,'Remove Me','remove@test.example','approved')", [removable]);
  await predict(removable, f, 1, 0);
  await db.query("INSERT INTO sbk.membership_reviews(member_id,admin_id,action) VALUES($1,$2,'approved')", [removable, admin]);
  await assert.rejects(as(alice, (tx) => tx.query("SELECT sbk.admin_delete_member($1)", [removable])), /forbidden/);
  await assert.rejects(as(admin, (tx) => tx.query("SELECT sbk.admin_delete_member($1)", [admin])), /admin_protected/);
  await as(admin, (tx) => tx.query("SELECT sbk.admin_delete_member($1)", [removable]));
  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) count FROM sbk.profiles WHERE id=$1", [removable])).rows[0].count), 0);
  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) count FROM sbk.predictions WHERE member_id=$1", [removable])).rows[0].count), 0);
  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) count FROM sbk.membership_reviews WHERE member_id=$1", [removable])).rows[0].count), 0);
});
test("transactional finalization and correction recompute ranks with a private history", async () => {
  const f = await fixture();
  await predict(alice, f, 2, 1);
  await predict(bob, f, 1, 0);
  await as(admin, (tx) =>
    tx.query(
      "UPDATE sbk.fixtures SET kickoff=clock_timestamp()-interval '2 hours',status='awaiting_result',schedule_note_en='Test time shift',schedule_note_ml='പരീക്ഷണ സമയമാറ്റം' WHERE id=$1",
      [f],
    ),
  );
  await finalize(f, 2, 1);
  let rows = (
    (await as(alice, (tx) =>
      tx.query("SELECT * FROM sbk.standings($1)", [round]),
    )) as any
  ).rows;
  assert.equal(Number(rows.find((r: any) => r.member_id === alice).points), 3);
  assert.equal(Number(rows.find((r: any) => r.member_id === bob).points), 2);
  assert.equal(Number(rows.find((r: any) => r.member_id === alice).correct), 1);
  await assert.rejects(finalize(f, 1, 0), /correction_reason/);
  await finalize(f, 1, 0, "Correct official full-time score");
  rows = (
    (await as(bob, (tx) =>
      tx.query("SELECT * FROM sbk.standings($1)", [round]),
    )) as any
  ).rows;
  assert.equal(Number(rows.find((r: any) => r.member_id === alice).points), 2);
  assert.equal(Number(rows.find((r: any) => r.member_id === bob).points), 3);
  assert.equal(Number(rows.find((r: any) => r.member_id === bob).rank), 1);
  const audit = (await as(admin, (tx) =>
    tx.query(
      "SELECT * FROM sbk.admin_audit_events WHERE target='results' AND action='UPDATE'",
    ),
  )) as any;
  assert.ok(
    audit.rows.some(
      (r: any) =>
        r.before_value.home_goals === 2 && r.after_value.home_goals === 1,
    ),
  );
  assert.equal(
    (
      (await as(alice, (tx) =>
        tx.query("SELECT * FROM sbk.admin_audit_events"),
      )) as any
    ).rows.length,
    0,
  );
  await assert.rejects(
    as(admin, (tx) =>
      tx.query("UPDATE sbk.fixtures SET status='cancelled' WHERE id=$1", [f]),
    ),
    /finalized_immutable/,
  );
});
