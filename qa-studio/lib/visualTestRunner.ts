import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "fs/promises";
import path from "path";
import { TestResult } from "./testRunner";

// Viewports checked for every run. Fixed (non-fullPage) screenshots keep
// both images the same pixel dimensions, which pixelmatch requires —
// full-page diffing (different page heights) is a good Phase 2.5 upgrade
// once basic viewport diffing is working.
const VIEWPORTS = [
  { name: "desktop" as const, width: 1440, height: 900 },
  { name: "tablet" as const, width: 768, height: 1024 },
  { name: "mobile" as const, width: 375, height: 812 },
];

// % of differing pixels above which a viewport is marked FAIL.
// Loose enough to tolerate font/anti-aliasing noise between machines,
// tight enough to catch real layout regressions. Tune per project.
const DIFF_THRESHOLD_PERCENT = 12;

// Screenshots/diffs are written to /public/runs so Next.js serves them
// as static files with zero extra code. Swap this for an upload to
// Cloudflare R2 (see dev plan) once you deploy — same interface,
// just change writeAsset() to an S3-compatible PUT and return the CDN URL.
const PUBLIC_DIR = path.join(process.cwd(), "public", "runs");

async function writeAsset(runId: string, filename: string, buffer: Buffer): Promise<string> {
  const dir = path.join(PUBLIC_DIR, runId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/runs/${runId}/${filename}`; // public URL, served from /public
}

async function screenshotAt(
  url: string,
  width: number,
  height: number
): Promise<Buffer> {
  const browser = await chromium.launch({ timeout: 30000 });
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await page.waitForTimeout(1000); // let late scripts/fonts/images settle before the screenshot
  const buffer = await page.screenshot({ type: "png" });
  await browser.close();
  return buffer;
}

/**
 * Captures Source A and Source B at each viewport, pixel-diffs them,
 * and returns one UI test case per viewport with the screenshots and
 * diff overlay saved for the report page's diff viewer.
 */
export async function runVisualComparison(
  runId: string,
  urlA: string,
  urlB: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const vp of VIEWPORTS) {
    const start = Date.now();

    const [bufferA, bufferB] = await Promise.all([
      screenshotAt(urlA, vp.width, vp.height),
      screenshotAt(urlB, vp.width, vp.height),
    ]);

    const pngA = PNG.sync.read(bufferA);
    const pngB = PNG.sync.read(bufferB);

    // Both screenshots share the same requested viewport, so dimensions
    // should already match — this guards against edge cases (e.g. a
    // page that ignores the viewport and renders wider).
    const width = Math.min(pngA.width, pngB.width);
    const height = Math.min(pngA.height, pngB.height);
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(pngA.data, pngB.data, diff.data, width, height, {
      threshold: 0.1, // per-pixel color sensitivity (0-1, lower = stricter)
    });

    const totalPixels = width * height;
    const diffPercent = totalPixels > 0 ? (diffPixels / totalPixels) * 100 : 0;
    const durationMs = Date.now() - start;

    const [screenshotAUrl, screenshotBUrl, diffImageUrl] = await Promise.all([
      writeAsset(runId, `${vp.name}-a.png`, PNG.sync.write(pngA)),
      writeAsset(runId, `${vp.name}-b.png`, PNG.sync.write(pngB)),
      writeAsset(runId, `${vp.name}-diff.png`, PNG.sync.write(diff)),
    ]);

    results.push({
      category: "UI",
      title: `Visual match at ${vp.name} (${vp.width}×${vp.height})`,
      expectedResult: `< ${DIFF_THRESHOLD_PERCENT}% pixel difference`,
      actualResult: `${diffPercent.toFixed(1)}% pixel difference`,
      status: diffPercent < DIFF_THRESHOLD_PERCENT ? "PASS" : "FAIL",
      durationMs,
      viewport: vp.name,
      screenshotAUrl,
      screenshotBUrl,
      diffImageUrl,
      diffPercent,
    });
  }

  return results;
}
