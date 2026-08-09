import { chromium, Page } from "playwright";
import { PageSummary } from "./ai";

export interface TestResult {
  category: "FUNCTIONAL" | "UI";
  title: string;
  expectedResult: string;
  actualResult: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  errorDetail?: string;
  // Visual/UI fields — only set for category "UI"
  viewport?: "desktop" | "tablet" | "mobile";
  screenshotAUrl?: string;
  screenshotBUrl?: string;
  diffImageUrl?: string;
  diffPercent?: number;
}

interface ExtractedPage {
  summary: PageSummary;
  loadTimeMs: number;
  httpStatus: number;
  links: string[];
}

/**
 * Loads a page with Playwright and pulls out everything the rule-based
 * test generator needs: structure, counts, console errors, timing.
 */
async function extractPage(url: string): Promise<ExtractedPage> {
  const browser = await chromium.launch();
  const page: Page = await browser.newPage();

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const start = Date.now();
  // "networkidle" waits for zero network activity for 500ms — many real
  // sites never fully go quiet (analytics beacons, live-reload sockets,
  // polling), so it can hang until timeout on perfectly normal pages.
  // "load" (fires when the page + its resources finish loading) plus a
  // short settle delay is far more reliable in practice. If even "load"
  // times out on an unusually slow/heavy page, fall back to
  // "domcontentloaded" rather than failing the whole run.
  let response;
  try {
    response = await page.goto(url, { waitUntil: "load", timeout: 45000 });
  } catch {
    response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await page.waitForTimeout(1000); // let late scripts/fonts/images settle
  const loadTimeMs = Date.now() - start;

  const title = await page.title();
  const headings = await page.$$eval("h1, h2, h3", (els) =>
    els.map((e) => e.textContent?.trim() || "").filter(Boolean)
  );
  const links = await page.$$eval("a[href]", (els) =>
    els.map((e) => (e as HTMLAnchorElement).href)
  );
  const formCount = await page.$$eval("form", (els) => els.length);
  const buttonTexts = await page.$$eval("button, [role='button'], input[type='submit']", (els) =>
    els.map((e) => e.textContent?.trim() || "").filter(Boolean)
  );
  const imageCount = await page.$$eval("img", (els) => els.length);

  await browser.close();

  return {
    summary: {
      url,
      title,
      headings,
      linkCount: links.length,
      formCount,
      buttonTexts,
      imageCount,
      consoleErrors,
    },
    loadTimeMs,
    httpStatus: response?.status() ?? 0,
    links: [...new Set(links)].slice(0, 15), // cap for link-check speed
  };
}

/**
 * Checks a batch of links for broken responses (4xx/5xx), capped and
 * run in parallel to keep total test time reasonable.
 */
async function checkBrokenLinks(links: string[]): Promise<{ url: string; status: number }[]> {
  const results = await Promise.all(
    links.map(async (url) => {
      try {
        const res = await fetch(url, { method: "HEAD", redirect: "follow" });
        return { url, status: res.status };
      } catch {
        return { url, status: 0 }; // unreachable/timeout
      }
    })
  );
  return results.filter((r) => r.status === 0 || r.status >= 400);
}

/**
 * Rule-based functional test suite comparing Source A (reference) vs
 * Source B (target/dev). This is the Phase 1 core — no AI, no visual
 * diffing yet, just deterministic checks any QA engineer would run by hand.
 */
export async function runFunctionalComparison(
  urlA: string,
  urlB: string
): Promise<{ results: TestResult[]; pageASummary: PageSummary; pageBSummary: PageSummary }> {
  const results: TestResult[] = [];

  const t0 = Date.now();
  const [pageA, pageB] = await Promise.all([extractPage(urlA), extractPage(urlB)]);

  // 1. Both pages load successfully
  results.push({
    category: "FUNCTIONAL",
    title: `Source A (${urlA}) loads with a successful HTTP status`,
    expectedResult: "HTTP status 200–299",
    actualResult: `HTTP ${pageA.httpStatus}`,
    status: pageA.httpStatus >= 200 && pageA.httpStatus < 300 ? "PASS" : "FAIL",
    durationMs: pageA.loadTimeMs,
  });

  results.push({
    category: "FUNCTIONAL",
    title: `Source B (${urlB}) loads with a successful HTTP status`,
    expectedResult: "HTTP status 200–299",
    actualResult: `HTTP ${pageB.httpStatus}`,
    status: pageB.httpStatus >= 200 && pageB.httpStatus < 300 ? "PASS" : "FAIL",
    durationMs: pageB.loadTimeMs,
  });

  // 2. No console errors
  results.push({
    category: "FUNCTIONAL",
    title: "Source A has no browser console errors",
    expectedResult: "0 console errors",
    actualResult: `${pageA.summary.consoleErrors.length} console error(s)`,
    status: pageA.summary.consoleErrors.length === 0 ? "PASS" : "FAIL",
    durationMs: 0,
    errorDetail: pageA.summary.consoleErrors.slice(0, 5).join("\n") || undefined,
  });

  results.push({
    category: "FUNCTIONAL",
    title: "Source B has no browser console errors",
    expectedResult: "0 console errors",
    actualResult: `${pageB.summary.consoleErrors.length} console error(s)`,
    status: pageB.summary.consoleErrors.length === 0 ? "PASS" : "FAIL",
    durationMs: 0,
    errorDetail: pageB.summary.consoleErrors.slice(0, 5).join("\n") || undefined,
  });

  // 3. Broken links (checked on Source B — the page under test)
  const brokenLinksStart = Date.now();
  const broken = await checkBrokenLinks(pageB.links);
  results.push({
    category: "FUNCTIONAL",
    title: `Source B has no broken links (sampled ${pageB.links.length})`,
    expectedResult: "All sampled links return < 400",
    actualResult:
      broken.length === 0
        ? "All links OK"
        : `${broken.length} broken: ${broken.map((b) => `${b.url} (${b.status || "timeout"})`).join(", ")}`,
    status: broken.length === 0 ? "PASS" : "FAIL",
    durationMs: Date.now() - brokenLinksStart,
  });

  // 4. Heading structure parity
  results.push({
    category: "FUNCTIONAL",
    title: "Heading count matches between Source A and Source B",
    expectedResult: `${pageA.summary.headings.length} heading(s) (from Source A)`,
    actualResult: `${pageB.summary.headings.length} heading(s)`,
    status: pageA.summary.headings.length === pageB.summary.headings.length ? "PASS" : "FAIL",
    durationMs: 0,
  });

  // 5. Form count parity (forms = functional surfaces: signup, contact, etc.)
  results.push({
    category: "FUNCTIONAL",
    title: "Form count matches between Source A and Source B",
    expectedResult: `${pageA.summary.formCount} form(s) (from Source A)`,
    actualResult: `${pageB.summary.formCount} form(s)`,
    status: pageA.summary.formCount === pageB.summary.formCount ? "PASS" : "FAIL",
    durationMs: 0,
  });

  // 6. Button/CTA parity
  results.push({
    category: "FUNCTIONAL",
    title: "Interactive button/CTA count matches",
    expectedResult: `${pageA.summary.buttonTexts.length} button(s) (from Source A)`,
    actualResult: `${pageB.summary.buttonTexts.length} button(s)`,
    status: pageA.summary.buttonTexts.length === pageB.summary.buttonTexts.length ? "PASS" : "FAIL",
    durationMs: 0,
  });

  // 7. Image count parity (missing images are a common regression)
  results.push({
    category: "FUNCTIONAL",
    title: "Image count matches between Source A and Source B",
    expectedResult: `${pageA.summary.imageCount} image(s) (from Source A)`,
    actualResult: `${pageB.summary.imageCount} image(s)`,
    status: pageA.summary.imageCount === pageB.summary.imageCount ? "PASS" : "FAIL",
    durationMs: 0,
  });

  // 8. Response time sanity check (dev shouldn't be drastically slower)
  const slowdownFactor = pageA.loadTimeMs > 0 ? pageB.loadTimeMs / pageA.loadTimeMs : 1;
  results.push({
    category: "FUNCTIONAL",
    title: "Source B load time is not significantly slower than Source A",
    expectedResult: `Within 2x of Source A (${pageA.loadTimeMs}ms)`,
    actualResult: `${pageB.loadTimeMs}ms (${slowdownFactor.toFixed(1)}x)`,
    status: slowdownFactor <= 2 ? "PASS" : "FAIL",
    durationMs: pageB.loadTimeMs,
  });

  void t0; // total run duration is computed by the caller

  return { results, pageASummary: pageA.summary, pageBSummary: pageB.summary };
}
