# SBK SLK Prediction Contest

A bilingual, mobile-first prediction app for approved Soccer Blues of Keralam members. Participation is free. There are no payments, wagers, prizes, or betting features. This project has **not been deployed**.

## Start locally — no external credentials needed

Install Node.js 24 LTS (the app requires at least Node 20.9; the included browser CLI requires 24). Open a terminal in this folder:

```sh
npm ci
```

Copy `.env.example` to `.env.local`. Keep `SBK_LOCAL_DEMO=true` and `APP_ORIGIN=http://localhost:3000`. Then run:

```sh
npm run db:local
npm run dev
```

Open **http://localhost:3000**, using that exact hostname. The server binds to loopback. Read `.local/demo-accounts.txt` for the randomly generated password and these sample accounts:

| Account           | Access             |
| ----------------- | ------------------ |
| `admin@sbk.test`  | Approved organizer |
| `member@sbk.test` | Approved member    |
| `fan@sbk.test`    | Approved member    |

The password is created on your machine; it is not committed or hardcoded. You can register another local account, then approve it from the organizer account. Local registration intentionally has no email delivery. All seeded fixtures, teams, accounts, and announcements are explicitly marked as samples. There is **no official SLK schedule** in this repository.

Local mode uses server-side PGlite, a PostgreSQL engine persisted in `.local/postgres`. It executes the same migration, policies, triggers, and scoring queries as production. It is a single-process development environment, not a multi-server production database. Do not run `db:local`, another dev server, or other tools against that directory while the app is running. To start over, stop the server, back up `.local`, then move it aside and run `db:local` again.

## Member and organizer flows

- Register → pending screen → organizer verifies WhatsApp membership → approve or reject.
- Approved members can save/edit one score per fixture before its database deadline, view standings and prediction history, and download bilingual PNG rank cards.
- Open **Organizer desk** in desktop navigation or Profile on mobile. The member queue supports search, status filters, pagination, multi-selection, and private review notes.
- Create teams in both languages, then rounds, then fixtures. Fixture date fields are explicitly **IST**; storage is UTC. For real fixtures turn off the sample flag. No live score feed is fabricated.
- Use fixture editing to postpone, reschedule, cancel, restore, or mark a match in progress / awaiting result. Reschedules require explanations in both languages.
- After regulation-time play ends, set the match to awaiting result, enter the full-time result, preview point changes, and confirm. Corrections require a reason and immediately update standings.
- Publish bilingual announcements with optional visibility windows. Add organizer contact details and rules revisions in **Announcements & rules**. Fixed scoring/deadline rules remain visible; organizer revisions add community guidance rather than silently changing the scoring algorithm.
- Download private CSV reports and inspect the audit log from the organizer desk. Prediction reports include only matches whose deadline has passed.

## Configure Supabase for production

Do not expose the local demo to the internet. A production instance requires your Supabase project, database credentials, email settings, HTTPS origin, and real organizer details.

1. Create a Supabase project. Obtain its project URL, publishable key, and owner PostgreSQL connection string. Enable email/password authentication, email confirmation, and an appropriate SMTP provider. Configure Supabase Auth rate limits and, if appropriate, its abuse controls. Set Site URL and allowlisted redirect URLs to your HTTPS origin and `/auth/confirm`.
2. Create a **separate, uncommitted** `.env.migration` file:

   ```dotenv
   MIGRATION_DATABASE_URL=postgresql://OWNER:OWNER_PASSWORD@DATABASE_HOST:5432/postgres?sslmode=verify-full
   SBK_DATABASE_PASSWORD=YOUR_OWN_RANDOM_PASSWORD_OF_AT_LEAST_24_CHARACTERS
   ```

   Use your provider's correct TLS connection settings / CA certificate. Never disable certificate validation. This file is loaded by CLI scripts only; do not put it on your application host.

3. Run `npm run db:migrate`. This applies versioned SQL transactionally and configures `sbk_app` as the application login. Migrations contain no seeds. A fresh database is expected: do not reuse an unrelated project's `sbk_app` role or `sbk` schema. The migration command records applied versions and skips them on subsequent runs.
4. Replace `.env.local` with:

   ```dotenv
   SBK_LOCAL_DEMO=false
   APP_ORIGIN=https://YOUR_PRIVATE_APP_DOMAIN
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   DATABASE_URL=postgresql://sbk_app:APP_PASSWORD@DATABASE_HOST:5432/postgres?sslmode=verify-full
   ```

   Use the dedicated `sbk_app` PostgreSQL connection, **never** `postgres`, `service_role`, or the owner connection. Runtime verifies `current_user='sbk_app'` and rejects an owner connection. With a Supabase pooler, use its documented custom-role username form and session/transaction settings for your project. URL-encode password characters in connection strings. Keep all database credentials server-side.

5. For email confirmation links, use the Supabase template action URL format `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. For recovery use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. The callback also supports the PKCE `code` flow. Test SMTP delivery and redirects against your actual project.
6. Register the organizer, confirm their email, and sign in once. That creates a pending profile using the authenticated Supabase user ID. From the trusted owner machine run:

   ```sh
   npm run db:bootstrap -- organizer@example.com
   ```

   This is the only application-provided promotion path and records a bootstrap audit event. Users cannot change their own role. Admins cannot suspend other admins through the ordinary membership UI. Remove the owner credentials from any shared machine after setup.

7. Sign in as organizer, enter genuine teams/rounds/fixtures, bilingual announcements and contact information. Invite members and verify their WhatsApp membership manually before approval.
8. Run checks and build:

   ```sh
   npm run typecheck
   npm test
   npm run build
   npm start
   ```

   `npm start` binds loopback by default. Hosting requires your own authenticated reverse proxy / HTTPS setup or supported Node host, network access to PostgreSQL, environment variables, origin and Auth redirect configuration, monitoring, backup policy, and verification with real Supabase sessions. No hosting has been configured here.

Local production-build testing is opt-in: `SBK_ALLOW_LOCAL_BUILD=true` permits local demo mode with `NODE_ENV=production`. Use this only on loopback. Without that explicit override, production runtime refuses to open the local database. Production deployment must set `SBK_LOCAL_DEMO=false`.

## Structure

```text
src/app/                 Next.js routes, protected server pages, auth callback, APIs
src/components/          Bilingual member screens, admin forms, navigation, PNG canvas
src/lib/auth.ts          Supabase server auth / isolated local sessions
src/lib/db.ts            Restricted-role transactions; PostgreSQL / local PGlite
src/lib/service.ts       Validation, permission checks, queries and mutations
src/lib/domain.ts        Pure scoring/ranking/deadline helpers used in tests
src/lib/i18n.ts          Typed English/Malayalam dictionary and fixed contest rules
src/proxy.ts             Supabase session refresh; authorization remains at data boundary
migrations/              Tables, indexes, constraints, RLS, triggers, aggregate standings
scripts/                 Migration, secure bootstrap, local setup, deterministic logo crop
tests/                   Domain, real PostgreSQL/RLS integration, browser end-to-end checks
public/sbk-logo.png       Authentic screenshot logo cropped with circular alpha mask
```

## Security and correctness

- Every member page, mutation, report, and preview checks the authenticated identity and membership on the server. Admin operations additionally require the current approved admin role.
- Production identity comes from Supabase `getUser()`, not a client-supplied ID or role. Proxy refreshes sessions; cookies are HTTP-only and SameSite Lax, and Secure in production. Local passwords use salted scrypt and random session tokens whose hashes are stored in the database.
- The browser has **no database access**. All `sbk` tables have either RLS or no application grants. Supabase `anon` and `authenticated` receive no schema/table/function grants. A private BFF uses a dedicated least-privilege PostgreSQL role and sets verified identity transaction-locally. Security-definer functions use a fixed search path, have public execution revoked, and expose only safe aggregates or narrow trusted-server provisioning/rate-limit functions. Never expose the application database credentials or add this schema to the public Data API.
- Profiles deliberately do not reference `auth.users`: the same schema supports local auth and external Supabase auth. Only verified server provisioning creates production profiles. Results revision history is stored in immutable audit before/after JSON instead of a separate results-revisions table. Prediction edits have their own private history table.
- Own predictions are visible only to approved members. Other individual scores, including to admins and CSV exports, remain inaccessible before the database deadline. Standings expose display names and aggregate statistics only, never email addresses.
- Prediction inserts/updates lock the fixture row, then check `clock_timestamp()` against its generated deadline. Fixture edits and result finalization use that same row lock. A write at or after the boundary is rejected. Unique `(fixture_id,member_id)` prevents duplicate current records, and identical saves preserve the existing revision timestamp.
- SQL grants and triggers protect roles, memberships, results, audit history, score ranges, team identity, and finalized fixtures. SQL values use parameters and table/column choices use validated allowlists.
- CSRF origin checks protect write APIs, payloads are bounded, Zod validates inputs, auth/write rates are persisted in PostgreSQL, and CSV cells are neutralized against spreadsheet formula injection. The production edge should additionally impose request-body, connection, and IP-level limits before requests reach Node.
- Sensitive pages are dynamic, `private, no-store`, noindex, frame-blocked, and covered by error/not-found boundaries. No secrets are included in audit payloads or PNG cards.
- Untrusted text renders as text. Badge URLs must be HTTPS. There is no HTML rules editor or arbitrary upload endpoint.

## Scoring, ranking and state transitions

SQL is authoritative. Finalized regulation-time exact score = **5**; otherwise correct outcome = **3**; otherwise **0**. Missing predictions and non-finalized matches score zero. Exact scores also count toward correct outcomes. Participation counts predictions on finalized fixtures only. Cancelled/postponed/unfinalized matches do not affect any ranking count.

Standings are derived in a database query, ordered by points, exact count, then inclusive correct-outcome count. SQL `rank()` produces honest ties (`1,1,3`). Pagination is on the server; display name/ID merely stabilize ordering within a shared rank, never break the rank tie. Round filtering occurs before aggregation. Corrections update the authoritative result in one transaction; there are no duplicated point totals to become stale. The displayed standings timestamp is the **calculation time**, not a claim that a match finished at that time.

| State           | Editing predictions                   | Scored | Permitted organizer transitions                                                             |
| --------------- | ------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| scheduled       | Until kickoff minus exactly 5 minutes | No     | Postpone, cancel, reschedule, in-progress / awaiting-result after kickoff                   |
| postponed       | No                                    | No     | Restore as scheduled (new future deadline reopens edits), cancel, mark played after kickoff |
| cancelled       | No                                    | No     | Restore as scheduled or postponed; preserves original predictions                           |
| in_progress     | No                                    | No     | Awaiting-result, postpone, cancel, reschedule, finalize                                     |
| awaiting_result | No                                    | No     | Finalize, postpone, cancel, reschedule                                                      |
| finalized       | No                                    | Yes    | Correct result with reason only; no fixture cancellation / team / round / kickoff changes   |

Team/round identity freezes after the first prediction. To replace an incorrectly identified fixture, cancel it and create a new one. Non-final states may be restored by an organizer with the above timestamp conditions; all changes are audited. Changing kickoff requires bilingual schedule notes and preserves predictions. “In progress” is always organizer-controlled, never inferred as a fake live feed.

## Sharing and branding

Rank cards are PNGs at 1080×1350 using bundled Malayalam-capable fonts, the authentic logo, display name, shared rank, points, exact count and current calculation time. They contain no email, phone, internal ID, private review note or required portrait. Local cards carry a sample label. Native file sharing is offered from a click only when `navigator.canShare({files})` permits it. Otherwise the same PNG downloads; the app does not claim to publish directly to WhatsApp or confirm delivery.

The provided logo was deterministically cropped from the screenshot without redrawing or changing lettering. The image is approximately 590×590 and retains screenshot compression. Replace `public/sbk-logo.png` with a higher-resolution transparent original from SBK when available, keeping its round silhouette and authentic design. No illustrative people, real club claims, ranks, scores, or dates from the concept were imported as official data. Malayalam text is complete in the dictionary; an organizer/native-language editorial review is recommended before launch.

## Tests and verification

`npm test` uses a fresh in-memory PostgreSQL engine and runs actual SQL RLS/grants/triggers, as well as pure scoring/ranking/deadline tests. It does not need Supabase.

Start `npm run dev`, then run `npm run test:e2e`. The browser suite uses installed Chrome (`channel: 'chrome'`). If Chrome is absent, install Playwright Chromium (`npx playwright install chromium`) and remove the `channel` setting in `playwright.config.ts`. The suite registers a clearly labeled sample member, approves via admin UI, saves/edits, forces a reschedule via the normal admin endpoint, verifies lock rejection, finalizes/corrects via UI, checks points, downloads English/Malayalam PNGs, tests share fallback, checks mobile overflow, and enforces export permissions. It creates durable sample data in the local database. Do not run against production. Screenshots/PNGs are written to `.local/checks`; HTML reports go to `playwright-report`.

See `VERIFICATION.md` for the checks actually executed and their limits.

## Backups and organizer handover

- Use Supabase's supported scheduled backups/PITR for your plan. Periodically test restoring to a separate project. Database-only backups do not replace Auth/config backups; include your provider's supported Auth backup procedure and secure environment/config records.
- An owner can take an encrypted `pg_dump --schema=sbk --format=custom` using a trusted connection. Never save dumps or owner credentials in source control or send them to the WhatsApp group. Membership exports contain email addresses; restrict access and set a retention policy.
- Browser exports are capped at 10,000 rows to avoid unbounded memory use. Larger organizer exports should use the trusted database backup/export procedure. Result previews display at most 500 affected predictions; scoring always covers **all** predictions. Team pickers support up to 250 records, more than needed for this competition.
- Keep two trusted organizers, document account recovery, test SMTP, verify fixture dates in IST, and use the audit view when correcting a result. Do not edit derived standings manually.
- Your remaining inputs: Supabase project and credentials, SMTP/email templates, a high-resolution original logo, genuine bilingual fixture/club data, organizer contact details, and any launch-specific community guidance. Public hosting remains your explicit future decision.

Official references checked during implementation: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), and [PGlite filesystems](https://pglite.dev/docs/filesystems). Installed exact versions are locked in `package-lock.json`.
