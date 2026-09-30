# SBK SLK Prediction — Project Handover

Prepared: 30 September 2026. Audience: the developer/AI continuing this project in Google Antigravity.

This file transfers project context, not accounts, credentials, database contents, or chat history. Continue the existing application; do not rebuild or replace it merely because the development editor changes.

## Start here

- Existing workspace: `D:\Zainu\Website - App\GPT - SLK PRediction`
- Repository: https://github.com/zainukappan/SLK-Predi-GPT
- Live site: https://sbkpredictions.vercel.app/
- Public football hub: https://sbkpredictions.vercel.app/SuperLeagueKerala
- Hosting: Vercel. Production database and authentication: Supabase.
- Read `AGENTS.md` before changing code. Read the relevant installed Next.js guide under `node_modules/next/dist/docs/`; this version has breaking changes.
- Inspect `git status` and preserve existing uncommitted files. Attachments, local configuration and provider cache folders are not disposable just because they are untracked.

Moving development tools does not require moving the database or hosting. Keep the existing services and their data. Access to those accounts and local credentials must be arranged separately; this document contains no passwords or API keys.

## Important: older README instructions have drifted

Use README for setup background, but do not restore outdated behavior from it. In particular:

- The deadline is **90 minutes before kickoff**, not five minutes.
- Members **cannot edit a submitted prediction**. Rescheduling does not restore editing of an existing submission.
- Public visitors can expand eligible historical member predictions; the older claim that individual predictions are never public is obsolete.
- Admin promotion is available in the organizer UI; bootstrap is not the only promotion mechanism.
- Hosting is already configured. Do not follow new-project/bootstrap instructions against production as routine setup.
- The deadline is now maintained by a fixture trigger, not the original generated-column expression.

The latest migration definitions and current code determine actual behavior. If they disagree with product requirements below, investigate the discrepancy instead of silently changing the rules.

## Product rules that must remain intact

### Prediction contest

1. Participation is free for approved community members. No payments or betting features.
2. Predictions close exactly **90 minutes before kickoff**, using the database clock. A submission at or after the boundary is rejected.
3. A member may submit **once per fixture**. Enforce this on the server/database as well as the UI. Show a clear red English/Malayalam warning before submission that answers cannot subsequently be edited.
4. Three independent answers earn **one point each**, maximum **three points**:
   - Who will win the match? Home team, away team, or draw.
   - What will the score be? Exact home and away goals.
   - Who will score first? Home team, away team, or Nobody for 0–0.
5. Contest scoring uses **90 minutes plus stoppage time only**. Shootouts and extra time never change prediction answers or points.
6. A result must be finalized before points are awarded. Result corrections recalculate standings.
7. Equal total points share the same competition rank, e.g. `1, 1, 3`. Order tied members alphabetically by English display name; do not reintroduce exact-score or first-goal tiebreaks.
8. Admins retain a separate audited workflow for entering/correcting historical WhatsApp predictions. This exception must not reopen member editing.
9. Do not expose another member's answers before the fixture deadline. The admin fixture-predictor list can show participation names and submission times without revealing answers.

### SLK tournament — separate from prediction points

| Match outcome | Tournament points | Form label |
| --- | ---: | --- |
| Regulation-time win | 3 | W — green |
| Shootout win after a regulation draw | 2 | PW — light green |
| Shootout loss | 1 | PL — light red |
| Regulation-time loss | 0 | L — red |

- Standings tiebreak order: points, head-to-head points, head-to-head goal difference, overall goal difference, goals scored, Fair Play rank.
- A shootout winner belongs to the tournament result, not to the contest's regulation-time winner answer.
- Record individual shootout takers, team, and scored/missed status.
- **Explicit project requirement:** successful shootout kicks count in the public top-scorer/goal-contribution statistics. Preserve this custom requirement; do not substitute conventional football-statistics behavior without discussing it. Misses do not count as goals; shootout kicks do not earn assists.
- Highlight the table leader in yellow for the Shield and positions 1–4 as the semi-final places, with a legend. Team rows expand their latest ten performances.

## Existing user-facing scope

- Bilingual English/Malayalam UI; display match times in IST, store timestamps consistently in UTC.
- Organizer-managed members: email or mobile login, international country-code selection, manually set password, password show/hide, edit name/login/password, membership review, admin promotion and member deletion.
- Production passwords belong to Supabase Auth, never application profile tables or audit logs. Member deletion must handle authentication and dependent application records through the existing workflow.
- Fixtures support creation/editing/deletion and official match numbers. Preserve match numbers wherever match details appear; samples are exempt. Destructive fixture operations use the existing audit/data-cleanup behavior.
- Past-prediction entry loads the selected member's existing prediction for the selected fixture.
- Admins can inspect who submitted a prediction per match.
- Upcoming matches highlight participant count and closing countdown. The last hour before the prediction deadline uses a red warning with a gentle pulse and reduced-motion support.
- Submitted upcoming predictions show a locked/submitted state instead of an update action. Retain appropriate links to historical match details.
- Public `/SuperLeagueKerala` requires no login: match cards with team logos, tournament standings, scorers, assists, goal contributions, and prediction leaderboard.
- Public prediction leaderboard initially shows ten members with a full-list expand/collapse control and a prediction/login call to action.
- Member names expand/collapse compact prediction cards, including all three answers and earned points. Correct answers are green after results are known. Preserve pre-deadline privacy.
- Leaderboard includes serial number, rank, question columns, Matches Predicted, dynamic round columns and Total Points.
- Prediction-share image includes all three answers, team logos, prominent yellow member name and white “Super League Kerala Prediction Contest” heading.
- Keep the navy/blue/yellow visual identity, readable mobile layouts and compact desktop card grids.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/app/` | Routes, server pages and HTTP APIs |
| `src/app/api/action/route.ts` | Validated actions, authentication, origin checks and mutations |
| `src/components/admin.tsx` | Organizer tools |
| `src/components/dashboard.tsx` | Member/dashboard, fixtures, predictions, leaderboard and countdown UI |
| `src/components/public-sports-hub.tsx` | Public football hub |
| `src/components/member-predictions.tsx` | Compact expandable prediction history |
| `src/components/prediction-share-card.tsx` | Prediction image sharing |
| `src/components/shell.tsx` | Navigation and shared application shell |
| `src/lib/service.ts` | Validation, queries, page data and business operations |
| `src/lib/domain.ts` | Pure domain helpers |
| `src/lib/i18n.ts` | English/Malayalam copy and fixed rules |
| `src/lib/auth.ts`, `src/lib/account.ts` | Sessions and login-identifier normalization |
| `src/lib/admin-members.ts` | Organizer-managed account operations |
| `src/lib/db.ts` | PostgreSQL/PGlite access and trusted transaction identity |
| `src/proxy.ts` | Session refresh; not a replacement for data-layer authorization |
| `migrations/`, `supabase/migrations/` | Both directories form the database migration history |
| `scripts/` | Migration, bootstrap and local initialization tools |
| `tests/` | Domain/database and browser tests |

The project uses Next.js 16, React 19, TypeScript, PostgreSQL, Supabase Auth, Zod and PGlite for local development. Exact versions come from `package-lock.json`; use `npm ci` instead of casually upgrading dependencies.

## Running safely on another development tool/machine

### Existing working folder

Open the existing folder in Antigravity. Inspect its configuration without printing secret values. Existing `.env.local` may connect to the **real database**. Do not overwrite it with demo settings or perform test writes until the target environment is understood.

### Isolated local demo (recommended for initial inspection)

Use a separate clone/folder so the working production configuration remains intact. Use Node.js 24 LTS as recommended by the repository.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run db:local
npm run dev
```

These commands assume a fresh clone without an existing `.env.local`. Keep `SBK_LOCAL_DEMO=true` and `APP_ORIGIN=http://localhost:3000`. Open exactly `http://localhost:3000`.

Read `.local/demo-accounts.txt` privately for generated demo credentials. Local data lives in `.local/postgres`. Do not run two processes against that PGlite directory or run `db:local` while its dev server is running. Never deploy local demo mode.

### Configuration inventory

| Variable | Purpose |
| --- | --- |
| `SBK_LOCAL_DEMO` | `true` only for isolated local demo; production must be `false` |
| `APP_ORIGIN` | Exact browser origin used by write-request origin checks |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public client configuration |
| `SUPABASE_SECRET_KEY` | Server-only Auth administration |
| `DATABASE_URL` | Server-only connection using restricted `sbk_app` role |
| `DATABASE_SSL_CA` | Trusted PEM CA for hosted database TLS, if needed |
| `MIGRATION_DATABASE_URL` | Owner connection in separate CLI-only `.env.migration` |
| `SBK_DATABASE_PASSWORD` | Optional role-password setup consumed by migration script |

Never copy actual secrets into this document, AI messages, commits or screenshots. Git does not transfer ignored environment files. Configure necessary secrets securely on the new machine. Do not put owner credentials on Vercel or prefix server secrets with `NEXT_PUBLIC_`.

## Database architecture and migrations

- Application schema: `sbk`. Runtime role: `sbk_app`, not the owner/postgres role.
- Server authentication sets verified identity transaction-locally (`sbk.user_id`); RLS and protected functions enforce access.
- Keep security-definer functions narrowly scoped, with fixed search paths and public execution revoked. Do not expose the private schema through a browser Data API to simplify a feature.
- Mobile identities are normalized through the account helpers and mapped to internal Auth email identifiers. Creation, editing and login must use compatible normalization; do not invent a second scheme.
- `scripts/migrate.ts` reads **both** migration directories, orders SQL filenames, takes an advisory lock, and records applied filenames in `public.sbk_schema_migrations`. Each migration runs transactionally.
- Apply intended migrations using `npm run db:migrate` with the appropriate separate `.env.migration`. Review the target and pending changes first: this command modifies a database.
- Do not replace the custom runner with `supabase db push` without reconciling the different migration histories.
- Add forward migrations; do not rewrite already-applied SQL or reset/reseed production.
- If `SBK_DATABASE_PASSWORD` is present, the migration runner also sets the runtime role password. Avoid unintended credential rotation.
- `db:bootstrap` is initial privileged organizer setup, not a routine startup command. Existing production already has organizers.

Recent migrations particularly relevant to future work:

- `20260928174537_shootout_kicks.sql`: individual shootout kicks.
- `20260929065500_lock_member_predictions_and_extend_deadline.sql`: 90-minute deadline and immutable member submissions, with audited admin-import exception.
- `20260929071140_admin_fixture_predictors.sql`: approved-admin-only participation listing without prediction answers.

## Verification and deployment

For application changes, run appropriate checks:

```powershell
npm run typecheck
npm test
npm run build
```

`npm run test:e2e` runs Playwright; inspect its configuration and use isolated test data. Database tests use an in-memory PGlite instance. Do not point browser tests or ad hoc test mutations at production. Local demo production-build testing requires the explicit `SBK_ALLOW_LOCAL_BUILD=true` override; never use that as production configuration.

Verify relevant flows in desktop/mobile and both languages. For scoring/auth changes, include server/database behavior, not only UI checks. In particular verify deadline boundaries, duplicate submission rejection, privacy before deadline, shootout separation and equal-points ranks when those areas change.

The existing GitHub-to-Vercel integration deploys the production branch. A push can publish changes: use a development branch for unreviewed work. Keep the existing project/domain and environment configuration. Coordinate schema changes with deployment; applying SQL and deploying the frontend are separate operations.

Check deployment completion and relevant live behavior after an authorized release. CLI access may require separate authentication in the new environment. A successful local build does not prove production deployment or database migration success.

## Handover status and next actions

This handover is documentation only. It does not migrate accounts, publish changes, run production migrations, verify current provider quotas, or certify every historical feature. The project has accumulated changes beyond README; inspect the current implementation before reporting a bug fixed or a feature complete.

Suggested first prompt in Antigravity:

> Read PROJECT_HANDOVER.md and AGENTS.md. Inspect the current repository and git status. Continue this existing SBK prediction project while preserving its database, hosting and business rules. First explain your understanding and any discrepancies you find. Use an isolated local demo for testing. Do not reset data, expose secrets, apply production migrations or deploy merely as part of onboarding. Wait for my next feature request before making functional changes.

