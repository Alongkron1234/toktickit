import { test, expect, request as playwrightRequest } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const screenshotsRoot = path.resolve(__dirname, '../../artifacts/lab-03/screenshots');
const queueDir = path.join(screenshotsRoot, 'staff-queue');
const detailDir = path.join(screenshotsRoot, 'staff-ticket-detail');

const captureResponsiveScreenshots = async (page: any, dir: string, baseName: string) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(dir, `desktop-${baseName}.png`), fullPage: true });

  await page.setViewportSize({ width: 834, height: 1194 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(dir, `tablet-${baseName}.png`), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(dir, `mobile-${baseName}.png`), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 900 });
};

const fillLoginForm = async (page: any, email: string, password: string) => {
  const emailInput = page.locator('input[placeholder="name@toktickit.com"]');
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(email);
  await page.fill('input[placeholder="••••••••"]', password);
  await page.click('button:has-text("Sign In")');
  // `networkidle` can resolve while the login request is still in flight
  // (the button is still showing "Signing in..."), so wait for the button's
  // own loading state to clear instead.
  await expect(page.locator('button:has-text("Signing in...")')).toHaveCount(0, { timeout: 15000 });
};

test.describe('Issue 7: IT Staff Ticket Queue & Detail Workflow End-to-End Tests with Screenshots (Lab 3)', () => {
  // See the identical note in user-administration.spec.ts: occasional
  // Playwright click-stability failures under local machine load, not a
  // reproducible app bug (confirmed via render/request-count
  // instrumentation during that investigation). Retries absorb it.
  test.describe.configure({ retries: 2 });

  let fixtureTicketNumber: string;

  test.beforeAll(async () => {
    ensureDir(queueDir);
    ensureDir(detailDir);

    // Create a fresh, unassigned NEW ticket via the API so the workflow below
    // (claim -> priority -> status -> comments -> notes) has a deterministic
    // starting point, independent of whatever manual/other test data exists.
    const api = await playwrightRequest.newContext({ baseURL: 'http://localhost:5001' });
    const created = await api.post('/api/tickets', {
      headers: { 'X-Dev-Requester-Id': '1' },
      data: {
        summary: 'E2E staff workflow fixture ticket',
        description: 'Created for the Lab 3 staff-ticket-flow E2E spec.',
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: 'MEDIUM',
      },
    });
    fixtureTicketNumber = (await created.json()).data.ticketNumber;
    await api.dispose();
  });

  test('E2E-STAFF-01: Ticket Queue search, filter, and pagination with screenshots', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await fillLoginForm(page, 'alex.thompson@toktickit.com', 'InitialPassword123!');

    await expect(page.locator('body')).toContainText('IT Staff Ticket Queue');
    await captureResponsiveScreenshots(page, queueDir, 'default-view');

    // Search by the fixture ticket's number.
    await page.fill('input[placeholder="Search by ticket number or summary..."]', fixtureTicketNumber);
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toContainText(fixtureTicketNumber);
    await captureResponsiveScreenshots(page, queueDir, 'search-results');

    // Filter by Status.
    await page.fill('input[placeholder="Search by ticket number or summary..."]', '');
    await page.selectOption('#staff-queue-status-select', 'NEW');
    await page.waitForTimeout(500);
    await captureResponsiveScreenshots(page, queueDir, 'status-filtered');
  });

  test('E2E-STAFF-02: Claim, IT Priority, status transition, Public Comments & Internal Notes with screenshots', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await fillLoginForm(page, 'alex.thompson@toktickit.com', 'InitialPassword123!');

    await page.fill('input[placeholder="Search by ticket number or summary..."]', fixtureTicketNumber);
    await page.waitForTimeout(500);
    await page.click('button:has-text("View Details")');
    await expect(page.locator('body')).toContainText(fixtureTicketNumber);
    await captureResponsiveScreenshots(page, detailDir, 'initial-view');

    // Claim the ticket.
    await page.click('button:has-text("🙋 Claim Ticket")');
    await expect(page.locator('body')).toContainText('Alex Thompson');
    await captureResponsiveScreenshots(page, detailDir, 'claimed');

    // Adjust IT Priority.
    await page.selectOption('#staff-detail-it-priority', 'HIGH');
    await page.waitForTimeout(500);

    // Advance the status (NEW -> OPEN, a permitted transition).
    await page.selectOption('#staff-detail-status', 'OPEN');
    await page.click('button:has-text("Update Status")');
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toContainText('Open');
    await captureResponsiveScreenshots(page, detailDir, 'priority-and-status-updated');

    // Public Comment (indigo tab, default-active).
    await page.fill('textarea[placeholder="Type a public comment or update..."]', 'Investigating this now — will update shortly.');
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator('body')).toContainText('Investigating this now');
    await captureResponsiveScreenshots(page, detailDir, 'public-comment-posted');

    // Internal Note (amber tab, role-restricted) — visually distinct from comments.
    await page.click('text=🔒 Internal Notes');
    await expect(page.locator('body')).toContainText('PRIVATE — IT STAFF ONLY');
    await page.fill('textarea[placeholder="Add a private internal note..."]', 'Confidential: awaiting replacement part.');
    await page.click('button:has-text("Add Internal Note")');
    await expect(page.locator('body')).toContainText('Confidential: awaiting replacement part.');
    await captureResponsiveScreenshots(page, detailDir, 'internal-note-posted');
  });

  test('E2E-STAFF-03: Requester sees the Public Comment but never the Internal Note', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await fillLoginForm(page, 'jennifer.anderson@example.com', 'InitialPassword123!');

    // Mobile card and desktop table both render a same-text ticket-number button
    // in the DOM (only CSS toggles which is visible) — :visible disambiguates.
    await page.click(`button:visible:has-text("${fixtureTicketNumber}")`);
    await expect(page.locator('body')).toContainText('Investigating this now');
    await expect(page.locator('body')).not.toContainText('Confidential: awaiting replacement part.');
    await expect(page.locator('body')).not.toContainText('Internal Notes');
  });
});
