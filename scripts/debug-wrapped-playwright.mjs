import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const TARGET_URL = process.env.WRAPPED_URL ?? "http://localhost:3000/wrapped/sahil";
const SCREENSHOT_TIMESTAMPS_MS = [0, 500, 1100, 1700, 2400, 3200];
const DEVICE_NAME = process.env.WRAPPED_DEVICE ?? "Pixel 7";
const headless = process.env.HEADLESS !== "false";

function slugify(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase();
}

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const urlSlug = slugify(TARGET_URL);
  const outputDir = path.join(
    process.cwd(),
    "artifacts",
    "wrapped-debug",
    `${ts}-${urlSlug}`,
  );
  await fs.mkdir(outputDir, { recursive: true });

  const consoleEvents = [];
  const pageErrors = [];
  const networkFailures = [];

  console.info("[wrapped-debug] Starting Playwright capture", {
    targetUrl: TARGET_URL,
    outputDir,
    device: DEVICE_NAME,
    headless,
    timestamps: SCREENSHOT_TIMESTAMPS_MS,
  });

  const browser = await chromium.launch({ headless });
  const device = devices[DEVICE_NAME] ?? devices["Pixel 7"];
  const context = await browser.newContext({
    ...device,
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    const line = {
      type: message.type(),
      text: message.text(),
      location: message.location(),
      time: Date.now(),
    };
    consoleEvents.push(line);
  });

  page.on("pageerror", (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack,
      time: Date.now(),
    });
  });

  page.on("requestfailed", (request) => {
    networkFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure(),
      time: Date.now(),
    });
  });

  const startedAt = Date.now();
  await page.goto(TARGET_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  for (const timestampMs of SCREENSHOT_TIMESTAMPS_MS) {
    const elapsed = Date.now() - startedAt;
    const waitMs = Math.max(timestampMs - elapsed, 0);
    if (waitMs > 0) {
      await page.waitForTimeout(waitMs);
    }
    const screenshotPath = path.join(outputDir, `${String(timestampMs).padStart(4, "0")}ms.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.info("[wrapped-debug] Captured screenshot", {
      timestampMs,
      screenshotPath,
    });
  }

  await fs.writeFile(
    path.join(outputDir, "console-events.json"),
    JSON.stringify(consoleEvents, null, 2),
    "utf-8",
  );
  await fs.writeFile(
    path.join(outputDir, "page-errors.json"),
    JSON.stringify(pageErrors, null, 2),
    "utf-8",
  );
  await fs.writeFile(
    path.join(outputDir, "network-failures.json"),
    JSON.stringify(networkFailures, null, 2),
    "utf-8",
  );
  await fs.writeFile(
    path.join(outputDir, "run-summary.json"),
    JSON.stringify(
      {
        targetUrl: TARGET_URL,
        outputDir,
        deviceUsed: DEVICE_NAME,
        headless,
        timestampsMs: SCREENSHOT_TIMESTAMPS_MS,
        consoleEventCount: consoleEvents.length,
        pageErrorCount: pageErrors.length,
        networkFailureCount: networkFailures.length,
      },
      null,
      2,
    ),
    "utf-8",
  );

  await context.close();
  await browser.close();
  console.info("[wrapped-debug] Capture complete", {
    outputDir,
    consoleEventCount: consoleEvents.length,
    pageErrorCount: pageErrors.length,
    networkFailureCount: networkFailures.length,
  });
}

main().catch((error) => {
  console.error("[wrapped-debug] Capture failed", { error });
  process.exitCode = 1;
});
