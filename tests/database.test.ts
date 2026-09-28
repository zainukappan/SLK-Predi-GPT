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
      "INSERT INTO sbk.fixtures(round_id,home_id,away_id,kickoff,match_number) VALUES($1,$2,$3,clock_timestamp()+interval '1 hour',(SELECT coalesce(max(match_number),0)+1 FROM sbk.fixtures WHERE NOT demo)) RETURNING id",
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
async function finalize(f: string, h: number, a: number, reason = "", shootoutWinner: "home"|"away"|null = h === a ? "home" : null) {
  return as(admin, (tx) =>
    tx.query(
      "INSERT INTO sbk.results(fixture_id,home_goals,away_goals,winner,first_goal,shootout_winner,updated_by,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(fixture_id) DO UPDATE SET home_goals=EXCLUDED.home_goals,away_goals=EXCLUDED.away_goals,winner=EXCLUDED.winner,first_goal=EXCLUDED.first_goal,shootout_winner=EXCLUDED.shootout_winner,reason=EXCLUDED.reason",
      [f, h, a, h > a ? "home" : h < a ? "away" : "draw", h === 0 && a === 0 ? "nobody" : "home", shootoutWinner, admin, reason],
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

test("only an admin can permanently delete a fixture and its contest data", async () => {
  const f = await fixture();
  await predict(alice, f, 2, 1);
  const prediction = (await db.query<{ id: string }>(
    "SELECT id FROM sbk.predictions WHERE fixture_id=$1 AND member_id=$2",
    [f, alice],
  )).rows[0];
  await db.query(
    "INSERT INTO sbk.prediction_revisions(prediction_id,home_goals,away_goals,predicted_winner,first_goal,saved_at) VALUES($1,1,0,'home','home',clock_timestamp())",
    [prediction.id],
  );
  await as(admin, (tx) => tx.query(
    "UPDATE sbk.fixtures SET kickoff=clock_timestamp()-interval '1 hour',status='awaiting_result',schedule_note_en='Played match',schedule_note_ml='കളിച്ച മത്സരം' WHERE id=$1",
    [f],
  ));
  await finalize(f, 2, 1);

  await assert.rejects(
    as(alice, (tx) => tx.query("SELECT sbk.admin_delete_fixture($1)", [f])),
    /forbidden/,
  );
  await as(admin, (tx) => tx.query("SELECT sbk.admin_delete_fixture($1)", [f]));

  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) count FROM sbk.fixtures WHERE id=$1", [f])).rows[0].count), 0);
  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) count FROM sbk.predictions WHERE fixture_id=$1", [f])).rows[0].count), 0);
  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) count FROM sbk.prediction_revisions WHERE prediction_id=$1", [prediction.id])).rows[0].count), 0);
  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) count FROM sbk.results WHERE fixture_id=$1", [f])).rows[0].count), 0);
  assert.equal(Number((await db.query<{ count: number }>("SELECT count(*) count FROM sbk.admin_audit_events WHERE action='DELETE_FIXTURE' AND before_value->>'id'=$1", [f])).rows[0].count), 1);
});

test("official fixtures require unique match numbers while demo fixtures do not", async () => {
  const f = await fixture();
  const matchNumber = (await db.query<{ match_number: number }>(
    "SELECT match_number FROM sbk.fixtures WHERE id=$1",
    [f],
  )).rows[0].match_number;
  assert.ok(matchNumber > 0);
  await assert.rejects(
    db.query(
      "INSERT INTO sbk.fixtures(round_id,home_id,away_id,kickoff,match_number) VALUES($1,$2,$3,clock_timestamp()+interval '2 hours',$4)",
      [round, home, away, matchNumber],
    ),
  );
  await db.query(
    "INSERT INTO sbk.fixtures(round_id,home_id,away_id,kickoff,demo) VALUES($1,$2,$3,clock_timestamp()+interval '3 hours',true)",
    [round, home, away],
  );
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

test("public football functions expose safe standings and finalized player statistics", async () => {
  const scorer = randomUUID(), assister = randomUUID(), f = await fixture();
  await as(admin, (tx) => tx.query(
    "INSERT INTO sbk.players(id,team_id,name_en,name_ml,shirt_number) VALUES($1,$3,'Public Scorer','സ്കോറർ',9),($2,$3,'Public Assister','അസിസ്റ്റർ',10)",
    [scorer, assister, home],
  ));
  await as(admin, (tx) => tx.query(
    "UPDATE sbk.fixtures SET kickoff=clock_timestamp()-interval '2 hours',status='awaiting_result',schedule_note_en='Test match completed',schedule_note_ml='ടെസ്റ്റ് മത്സരം പൂർത്തിയായി' WHERE id=$1",
    [f],
  ));
  await finalize(f, 1, 0);
  await as(admin, (tx) => tx.query(
    "INSERT INTO sbk.match_events(fixture_id,team_id,scorer_id,assist_id,minute,event_type,updated_by) VALUES($1,$2,$3,$4,42,'goal',$5)",
    [f, home, scorer, assister, admin],
  ));

  const publicData = await as(null, async (tx) => ({
    fixtures: (await tx.query("SELECT * FROM sbk.public_fixtures() WHERE id=$1", [f])).rows,
    table: (await tx.query("SELECT * FROM sbk.public_points_table() WHERE team_id=$1", [home])).rows,
    players: (await tx.query("SELECT * FROM sbk.public_player_stats() WHERE player_id=ANY($1::uuid[])", [[scorer, assister]])).rows,
    events: (await tx.query("SELECT * FROM sbk.public_match_events() WHERE fixture_id=$1", [f])).rows,
    predictions: (await tx.query("SELECT * FROM sbk.public_prediction_standings() LIMIT 1")).rows,
    rounds: (await tx.query("SELECT * FROM sbk.public_rounds() WHERE id=$1", [round])).rows,
  })) as any;
  assert.equal(publicData.fixtures.length, 1);
  assert.ok(Number(publicData.table[0].played) >= 1);
  assert.equal(Number(publicData.players.find((row: any) => row.player_id === scorer).goals), 1);
  assert.equal(Number(publicData.players.find((row: any) => row.player_id === assister).assists), 1);
  assert.equal(publicData.events[0].scorer_en, "Public Scorer");
  assert.ok(!("email" in publicData.predictions[0]));
  assert.ok("round_points" in publicData.predictions[0]);
  assert.equal(publicData.rounds[0].name_en, "Round");
  const anonymousDirect = await as(null, (tx) => tx.query("SELECT * FROM sbk.match_events")) as any;
  assert.equal(anonymousDirect.rows.length, 0);
});

test("SLK table awards 2/1 for a shootout while predictions remain based on 90 minutes", async () => {
  const f = await fixture();
  await predict(alice, f, 1, 1);
  await as(admin, (tx) => tx.query(
    "UPDATE sbk.fixtures SET kickoff=clock_timestamp()-interval '2 hours',status='awaiting_result',schedule_note_en='Draw test',schedule_note_ml='സമനില ടെസ്റ്റ്' WHERE id=$1",
    [f],
  ));
  await assert.rejects(finalize(f, 1, 1, "", null), /shootout_winner_mismatch/);
  await finalize(f, 1, 1, "", "home");
  const table = (await as(null, (tx) => tx.query(
    "SELECT team_id,points,shootout_wins,shootout_losses FROM sbk.public_points_table() WHERE team_id=ANY($1::uuid[])",
    [[home, away]],
  ))) as any;
  const homeRow=table.rows.find((row:any)=>row.team_id===home), awayRow=table.rows.find((row:any)=>row.team_id===away);
  assert.equal(Number(homeRow.shootout_wins), 1);
  assert.equal(Number(awayRow.shootout_losses), 1);
  assert.ok(Number(homeRow.points) > 0 && Number(awayRow.points) > 0);
  const prediction = await db.query<{points:number}>("SELECT sbk.prediction_points(1,1,'draw','home',1,1,'draw','home') points");
  assert.equal(Number(prediction.rows[0].points), 3);
});

test("SLK table awards zero points for a regulation-time loss", async () => {
  const winner=randomUUID(), loser=randomUUID();
  await db.query("INSERT INTO sbk.teams(id,name_en,short_name) VALUES($1,'Regulation Winner','RW'),($2,'Regulation Loser','RL')", [winner,loser]);
  const f=(await db.query<{id:string}>("INSERT INTO sbk.fixtures(round_id,home_id,away_id,kickoff,status,schedule_note_en,schedule_note_ml,match_number) VALUES($1,$2,$3,clock_timestamp()-interval '2 hours','awaiting_result','Completed','പൂർത്തിയായി',(SELECT coalesce(max(match_number),0)+1 FROM sbk.fixtures WHERE NOT demo)) RETURNING id", [round,winner,loser])).rows[0].id;
  await finalize(f,2,0);
  const rows=(await as(null,(tx)=>tx.query("SELECT team_id,points,regulation_losses FROM sbk.public_points_table() WHERE team_id=ANY($1::uuid[])",[[winner,loser]]))) as any;
  const winnerRow=rows.rows.find((row:any)=>row.team_id===winner), loserRow=rows.rows.find((row:any)=>row.team_id===loser);
  assert.equal(Number(winnerRow.points),3);
  assert.equal(Number(loserRow.points),0);
  assert.equal(Number(loserRow.regulation_losses),1);
});

test("public prediction details expose only deadline-locked answers without account identifiers", async () => {
  const locked=await fixture(), upcoming=await fixture();
  await as(admin,(tx)=>tx.query("UPDATE sbk.fixtures SET kickoff=clock_timestamp()-interval '1 hour',status='awaiting_result',schedule_note_en='Played',schedule_note_ml='കളിച്ചു' WHERE id=$1",[locked]));
  await as(admin,(tx)=>tx.query("SELECT sbk.admin_upsert_prediction($1,$2,1,0,'home','home')",[alice,locked]));
  await predict(alice,upcoming,2,1);
  const rows=(await as(null,(tx)=>tx.query("SELECT * FROM sbk.public_locked_predictions() WHERE fixture_id=ANY($1::uuid[])",[[locked,upcoming]]))) as any;
  assert.equal(rows.rows.length,1);
  assert.equal(rows.rows[0].fixture_id,locked);
  assert.ok(rows.rows[0].public_key);
  assert.ok("result_first_goal" in rows.rows[0]);
  assert.ok(!("member_id" in rows.rows[0]));
  assert.ok(!("email" in rows.rows[0]));
});

test("public prediction ties share rank and display in English alphabetical order", async () => {
  const alpha=randomUUID(), zebra=randomUUID();
  await db.query("INSERT INTO sbk.profiles(id,display_name,email,membership) VALUES($1,'Alpha Public','alpha-public@test.example','approved'),($2,'Zebra Public','zebra-public@test.example','approved')",[alpha,zebra]);
  const rows=await db.query<{display_name:string;rank:number}>("SELECT display_name,rank FROM sbk.public_prediction_standings() WHERE display_name IN ('Alpha Public','Zebra Public')");
  assert.deepEqual(rows.rows.map(row=>row.display_name),["Alpha Public","Zebra Public"]);
  assert.equal(Number(rows.rows[0].rank),Number(rows.rows[1].rank));
});

test("approved members can see only the aggregate prediction count", async () => {
  const f=await fixture();
  await predict(alice,f,1,0);
  await predict(bob,f,2,0);
  const result=(await as(alice,(tx)=>tx.query("SELECT sbk.fixture_prediction_count($1) count",[f]))) as any;
  assert.equal(Number(result.rows[0].count),2);
  await assert.rejects(as(null,(tx)=>tx.query("SELECT sbk.fixture_prediction_count($1)",[f])),/forbidden/);
});
