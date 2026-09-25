# Verification record

Verified locally on Windows with Node.js 24, Next.js 16.3.6, the embedded PostgreSQL development backend, and desktop Chrome with a mobile viewport. No public deployment was performed.

## Supabase connection — 25 September 2026

- Connected the local app to the owner's Supabase project using its IPv4 session pooler. The direct IPv6 database endpoint was unavailable from this machine.
- Applied migrations 001–003, provisioned a separate `sbk_app` login, and verified client TLS encryption and certificate authorization with the official Supabase CA.
- Confirmed restricted runtime identity, anonymous/authenticated roles have no private schema access, and remote scoring returns 5/3/0 as expected. No demo rows were seeded remotely.
- Auth settings endpoint returned 200: email sign-up enabled, email confirmation required. Real email delivery, confirmation links, and authenticated remote member/admin journeys remain unverified.
- Supabase security advisor has no warnings; its informational no-policy notice for the migration ledger is intentional owner-only access. Performance advisor reports overlapping admin/read policies and unindexed foreign keys; these remain optimization work, not evidence of a security failure. See [Supabase performance advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).
- Re-ran all six database/domain tests and TypeScript successfully. Local production-mode configuration renders the sign-in page in the browser with no reported browser errors. The earlier full end-to-end checks below used the local database, not Supabase.
- Secrets and the local CA/configuration are ignored by Git. A new checkout requires its own configuration.

## Successful checks

- TypeScript: `npm run typecheck`.
- Optimized release compilation: `npm run build` — all application routes compiled as dynamic server-rendered routes.
- Database/domain suite: `npm test` — six test groups passed. These exercise actual PostgreSQL grants, RLS, triggers and SQL standings, not only mocked authorization.
- End-to-end suite: `npm run test:e2e` — three browser tests passed, covering member/admin journeys, organizer content tools, and accessibility.
- Dependency installation audit reported zero vulnerabilities.

| Requested flow               | Evidence                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New account requests access  | Registered through the form; pending screen shown; prediction endpoint returned 403                                                                         |
| Organizer approves           | Approval through membership-review dialog with a private note                                                                                               |
| Member signs in and predicts | Authenticated session, saved 1–0, edited to 2–1                                                                                                             |
| Lock rejects stale browser   | Admin moved kickoff earlier via normal endpoint; subsequent member write returned `prediction_locked`; UI disabled editing                                  |
| Admin finalizes              | Real result form, points preview, finalization confirmation                                                                                                 |
| Standings update             | Member received five points for exact score and appeared in the table                                                                                       |
| Correction recomputes        | Corrected final score changed the same member to three points; SQL test verifies before/after audit history                                                 |
| PNG download                 | Downloaded English and Malayalam PNG files; validated format and dimensions of 1080×1350; visually inspected Malayalam text and logo                        |
| Sharing fallback             | Browser without native PNG sharing downloaded the PNG and displayed an honest fallback message                                                              |
| Mobile / desktop / bilingual | Captured 390px and 1440px layouts; no primary horizontal overflow in checked mobile screens; no page errors in member flow                                  |
| Admin content                | Created and edited team translation; created a round with stage dates; published bilingual announcement and rules revision; opened audit values             |
| Reports/privacy              | Admin CSV downloads succeeded; member membership export returned 403; DB tests block pre-deadline cross-member/admin prediction reads                       |
| Accessibility                | Axe WCAG 2 A/AA, 2.1 AA, 2.2 AA tags: zero violations in welcome, desktop home, mobile home, Malayalam profile and admin-dialog checks after contrast fixes |

The domain suite checks exact scores, non-exact correct outcomes, draws, wrong outcomes, missing predictions, inclusive correct-outcome counts and shared competition ranks. It covers immediately before / at / after the deadline, rescheduling, postponed/cancelled prediction locks, idempotent saves, private revisions, member-versus-admin rights and correction-driven recalculation.

Local evidence files are in `.local/checks/`: English/Malayalam home screenshots, profile screenshot, `rank-en.png`, `rank-ml.png`, and `accessibility.json`. The latest Playwright report is in `playwright-report/`. These are ignored by source control because browser runs can contain private sample-account information.

## Limits of verification

- Supabase production Auth, confirmation/recovery emails, SMTP, real PostgreSQL network/TLS connections, owner-role migration/bootstrap against a hosted project and multi-process concurrency require your credentials and environment. They have not been verified against a live Supabase project.
- Row-lock behavior was exercised in embedded PostgreSQL. Cross-process races, load testing, disaster recovery and provider failover should be checked in your staging environment before launch.
- Native OS sharing to WhatsApp was not available in the automated browser. PNG generation/download and the no-native-sharing fallback were verified; no claim is made about delivery through WhatsApp.
- Browser checks used Chrome. Safari, iOS, Android devices, screen-reader testing and a full manual WCAG audit were not performed. Automated accessibility checks do not establish complete WCAG conformance.
- Malayalam font rendering was visually checked. An SBK/native-language editorial review should confirm preferred community wording.
- No real SLK fixture source was supplied. All seeded and test-created fixtures remain explicitly marked as samples. The authentic logo is a screenshot crop; a higher-resolution original would improve large exports.
