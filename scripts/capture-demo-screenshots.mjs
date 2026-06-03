import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from '@playwright/test';

const baseUrl = process.env.MONEYTRACK_SCREENSHOT_URL || 'http://127.0.0.1:5001';
const outputDir = path.resolve('docs', 'screenshots');

async function captureDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outputDir, 'login-desktop.png'), fullPage: false });
  await page.getByRole('button', { name: 'Explore Demo Workspace' }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.getByRole('heading', { name: 'What deserves attention' }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outputDir, 'dashboard-desktop.png'), fullPage: false });
  await page.getByRole('link', { name: /insights/i }).click();
  await page.waitForURL(/\/insights$/);
  await page.getByRole('heading', { name: 'Insights' }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outputDir, 'insights-desktop.png'), fullPage: false });
  await page.close();
}

async function captureMobile(browser) {
  const page = await browser.newPage({
    ...devices['iPhone 13'],
  });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Explore Demo Workspace' }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.getByRole('heading', { name: 'What deserves attention' }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outputDir, 'dashboard-mobile.png'), fullPage: false });
  await page.close();
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();

try {
  await captureDesktop(browser);
  await captureMobile(browser);
  console.log(`Saved screenshots to ${outputDir}`);
} finally {
  await browser.close();
}
