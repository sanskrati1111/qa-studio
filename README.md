# QA Test Studio — Phase 1 + 2 + Reliability (URL vs URL, Functional + Visual Testing, Background Execution)

This is a working local build: paste two URLs, it loads both with
Playwright, runs a functional test suite **and** a visual/pixel-diff
comparison across desktop/tablet/mobile viewports, asks Claude for a
few extra AI-suggested test cases, and shows a Pass/Fail report with
expected vs. actual results, duration, success rate, and an
interactive before/after image slider for every visual check.

Figma comparison is **not included yet** — that's Phase 4 in the plan.

> **Upgrading from an earlier version?** The database schema changed
> (new columns for screenshots/diff data on `TestCase`). Run
> `npm run db:push` again after pulling this update — it's non-destructive,
> your existing runs are kept, it just adds the new columns.

## What changed: background execution

Test runs no longer block the HTTP request. `POST /api/runs` now
returns almost instantly (just a DB insert), and the actual test suite
runs in the background — the report page polls automatically every 2s
and shows a live "Running tests…" state with an elapsed timer until
it's done.

**This changes the recommended hosting target.** Background execution
like this relies on the Node process staying alive after the response
is sent, which is true for a persistent server (`next start`, e.g. on
**Render's free web service**) but not for Vercel's serverless
functions, which typically freeze shortly after responding. So:
**deploy this whole app to Render**, not split across Vercel + Render
as in the original plan. If you later need serverless specifically,
swap this for a real queue (BullMQ + Upstash Redis) or a dispatched
GitHub Actions workflow — see `lib/executeRun.ts` for the exact
handoff point.

---

## 1. Install dependencies

```bash
cd qa-studio
npm install
```

This also runs `prisma generate` automatically (via `postinstall`).

> **Note**: this project is pinned to **Prisma 6** (`^6.16.0` in
> `package.json`), not Prisma 7. Prisma 7 moved database connection
> URLs out of `schema.prisma` into a separate `prisma.config.ts` and
> now requires an explicit driver adapter package even for SQLite —
> a bigger setup step that isn't worth it for this MVP. If `npm install`
> still tries to install Prisma 7, delete `node_modules` and
> `package-lock.json` and reinstall — a stale lockfile can override
> the version in `package.json`.

## 2. Install Playwright's browser binary

Playwright needs an actual browser to drive. This downloads Chromium
(~150MB) the first time:

```bash
npm run playwright:install
```

## 3. Set up your environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `DATABASE_URL` — leave as-is for local dev (`file:./dev.db`, SQLite, zero setup)
- `ANTHROPIC_API_KEY` — get one at https://console.anthropic.com/settings/keys

## 4. Create the database

```bash
npm run db:push
```

This creates `prisma/dev.db` (SQLite) with the `Run` and `TestCase`
tables from `prisma/schema.prisma`. No separate DB server needed for
local dev.

## 5. Run it

```bash
npm run dev
```

Open http://localhost:3000, paste two URLs (e.g. a staging site as
Source A and your dev branch as Source B), and click **Run comparison**.

---

## What it actually checks

**Functional** (always runs):
For each of Source A and Source B — page loads with a successful HTTP
status, no browser console errors, (Source B only) no broken links,
sampled up to 15 links. Comparing A vs. B — heading/form/button/image
count parity, load-time regression (flags if B is 2x+ slower than A).

**Visual/UI** (toggle on the form, on by default):
Screenshots both pages at **desktop (1440×900), tablet (768×1024), and
mobile (375×812)**, pixel-diffs each pair with `pixelmatch`, and fails
any viewport with **12%+ differing pixels**. Each result includes an
interactive before/after slider plus a diff-overlay view, so you can
see exactly what changed. Screenshots are saved to `/public/runs/{runId}/`.

Plus: one Claude API call per run proposes up to 5 additional,
context-aware functional test cases based on structural differences
between the pages — these show up marked "Needs manual review" since
Claude suggests them but doesn't auto-verify them.

---

## Known limitations (by design, for this phase)

- **Background execution works differently across hosts**: see the
  note above — this pattern needs a persistent Node process (Render
  free web service works; Vercel serverless functions don't reliably).
- **No retry on transient failures**: if a page genuinely fails to load
  (site down, DNS error), the run is marked FAILED rather than retried.
  Re-run manually for now — automatic retry is a reasonable next addition.
- **Fixed-viewport screenshots, not full-page**: keeps both images the
  same pixel dimensions for reliable diffing. Full-page diffing (which
  needs to handle different page heights) is a natural next upgrade.
- **Local file storage for screenshots**: fine for local dev; swap
  `writeAsset()` in `lib/visualTestRunner.ts` for an upload to
  Cloudflare R2 (free tier, see dev plan) before deploying, since a
  server's local filesystem may not persist across restarts/deploys.
- **No Figma integration yet** — that's Phase 4.
- **SQLite for local dev** — swap `provider = "sqlite"` to
  `"postgresql"` in `prisma/schema.prisma` and point `DATABASE_URL` at
  a free Supabase/Neon instance when you're ready to deploy.

## Deploying (when ready)

- Frontend + API routes → Vercel (free Hobby tier)
- Database → Supabase or Neon free Postgres (swap the Prisma provider first)
- Vercel's free tier has a 10s function timeout — Playwright runs will
  likely exceed that once you have more than a few test cases. At that
  point, move test execution to a dispatched GitHub Actions workflow
  (free compute, no timeout issue) and have the run status update
  asynchronously.

## Project structure

```
qa-studio/
├── app/
│   ├── page.tsx                     # Home — run form + recent runs
│   ├── history/page.tsx             # Trend chart + full run log
│   ├── runs/[id]/page.tsx           # Report view for one run (polls while running)
│   └── api/runs/
│       ├── route.ts                 # POST create (returns fast), GET list
│       └── [id]/
│           ├── route.ts             # GET single run
│           └── export/route.ts      # GET → CSV download
├── components/
│   ├── RunForm.tsx
│   ├── RunHistory.tsx
│   ├── SummaryBar.tsx
│   ├── TestCaseTable.tsx
│   ├── DiffViewer.tsx               # Before/after slider + diff overlay
│   ├── TrendChart.tsx               # Success rate over time (Recharts)
│   ├── AutoRefresh.tsx              # Polls report page while run is in progress
│   ├── RunInProgress.tsx            # Spinner + elapsed timer
│   └── StatusBadge.tsx
├── lib/
│   ├── prisma.ts                    # DB client
│   ├── testRunner.ts                # Playwright functional test suite
│   ├── visualTestRunner.ts          # Playwright + pixelmatch visual test suite
│   ├── executeRun.ts                # Background execution — runs after response is sent
│   └── ai.ts                        # Claude API — test case generation
├── public/runs/                     # Generated screenshots/diffs (gitignored)
└── prisma/schema.prisma             # Run + TestCase models
```
