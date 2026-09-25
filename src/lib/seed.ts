import type { PGlite } from "@electric-sql/pglite";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
import { writeFile } from "node:fs/promises";
export async function seed(db: PGlite) {
  const password = randomBytes(15).toString("base64url");
  const accounts = [
    ["admin@sbk.test", "Demo Organizer", "admin"],
    ["member@sbk.test", "Demo Member", "member"],
    ["fan@sbk.test", "Demo Football Fan", "member"],
  ];
  for (const [email, name, role] of accounts) {
    const id = randomUUID(),
      salt = randomBytes(16).toString("hex");
    await db.query(
      "INSERT INTO sbk.profiles(id,email,display_name,role,membership) VALUES($1,$2,$3,$4,'approved')",
      [id, email, name, role],
    );
    await db.query("INSERT INTO sbk.local_credentials VALUES($1,$2)", [
      id,
      salt + ":" + scryptSync(password, salt, 64).toString("hex"),
    ]);
  }
  await writeFile(
    ".local/demo-accounts.txt",
    `LOCAL SAMPLE ACCOUNTS ONLY\nPassword (all accounts): ${password}\n${accounts.map((a) => a[0] + " — " + a[2]).join("\n")}\n`,
  );
  const round = randomUUID();
  await db.query(
    "INSERT INTO sbk.rounds(id,name_en,name_ml,sort_order) VALUES($1,'Demo · Opening round','മാതൃക · ആദ്യ റൗണ്ട്',1)",
    [round],
  );
  const teams = [
    ["Demo Coast FC", "മാതൃക കോസ്റ്റ് എഫ്‌സി", "CST"],
    ["Demo Hills FC", "മാതൃക ഹിൽസ് എഫ്‌സി", "HIL"],
    ["Demo City FC", "മാതൃക സിറ്റി എഫ്‌സി", "CTY"],
    ["Demo United", "മാതൃക യുണൈറ്റഡ്", "UNI"],
  ];
  const ids = [];
  for (const t of teams) {
    const id = randomUUID();
    ids.push(id);
    await db.query(
      "INSERT INTO sbk.teams(id,name_en,name_ml,short_name) VALUES($1,$2,$3,$4)",
      [id, ...t],
    );
  }
  for (let i = 0; i < 3; i++)
    await db.query(
      "INSERT INTO sbk.fixtures(round_id,home_id,away_id,kickoff,venue_en,venue_ml,demo) VALUES($1,$2,$3,$4,'Sample community stadium','മാതൃക കമ്മ്യൂണിറ്റി സ്റ്റേഡിയം',true)",
      [
        round,
        ids[i],
        ids[(i + 1) % 4],
        new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      ],
    );
  await db.query(
    "INSERT INTO sbk.announcements(title_en,title_ml,body_en,body_ml,published) VALUES('Welcome to the SBK matchday','എസ്‌ബികെ മത്സരദിനത്തിലേക്ക് സ്വാഗതം','This is a local demo. All fixtures and accounts are sample data. The organizer will add official fixtures.','ഇത് പ്രാദേശിക മാതൃകയാണ്. മത്സരങ്ങളും അക്കൗണ്ടുകളും പരീക്ഷണത്തിനുള്ളതാണ്. ഔദ്യോഗിക മത്സരങ്ങൾ സംഘാടകർ ചേർക്കും.',true)",
  );
}
