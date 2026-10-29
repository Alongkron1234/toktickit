import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  USERS, apiLogin, uiLogin, createTicket, setStatus, openStaffTicket, openRequesterTicket, openActionsTab,
} from './helpers';

// Visual evidence for Lab 4: every main screen at desktop, tablet and mobile width.
// Each capture also asserts that the page has no horizontal scroll at that width.
const ROOT = path.resolve(__dirname, '../../artifacts/lab-04/screenshots');
const SIZES = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
];
const EMPTY_STAFF = 'e2e.empty.staff@toktickit.com';
const EMPTY_STAFF_PASSWORD = 'E2eEmptyStaff!2026';

async function capture(page: Page, folder: string, baseName: string) {
  fs.mkdirSync(path.join(ROOT, folder), { recursive: true });
  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.waitForTimeout(350);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${folder}/${baseName} at ${size.name} has horizontal scroll`).toBeLessThanOrEqual(0);
    await page.screenshot({ path: path.join(ROOT, folder, `${baseName}-${size.name}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: SIZES[0].width, height: SIZES[0].height });
}

async function seedActions(ticketId: number) {
  const staff = await apiLogin(USERS.staff);
  const staff2 = await apiLogin(USERS.staff2);
  const post = async (who: typeof staff, data: object) =>
    (await (await who.api.post(`/api/staff/tickets/${ticketId}/actions`, { headers: { Authorization: `Bearer ${who.token}` }, data })).json()).data;
  const done = await post(staff, { description: 'Checked the VPN client logs and found repeated timeouts', assigneeId: staff2.id });
  await staff.api.post(`/api/staff/tickets/${ticketId}/actions/${done.id}/complete`, {
    headers: { Authorization: `Bearer ${staff.token}` }, data: { result: 'Updated the VPN client to the latest version' },
  });
  const cancelled = await post(staff2, { description: 'Ask the user to reboot the router' });
  await staff2.api.post(`/api/staff/tickets/${ticketId}/actions/${cancelled.id}/cancel`, { headers: { Authorization: `Bearer ${staff2.token}` } });
  await post(staff2, { description: 'Monitor the connection for two days', followUpRequired: true, followUpNote: 'Call the user back on Friday' });
  await staff.api.dispose();
  await staff2.api.dispose();
}

test.describe('Lab 4 visual evidence', () => {
  test.beforeAll(() => fs.mkdirSync(ROOT, { recursive: true }));

  test('SHOT-01: requester dashboard (normal, empty, loading, failure)', async ({ page }) => {
    await uiLogin(page, USERS.requester);
    await capture(page, 'requester-dashboard', 'requester-dashboard');

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await uiLogin(page, USERS.emptyRequester);
    await capture(page, 'requester-dashboard', 'requester-dashboard-empty');

    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    await page.route('**/api/dashboard/requester', async (route) => { await gate; await route.continue(); });
    await page.reload();
    await expect(page.getByText('Loading dashboard...')).toBeVisible();
    await capture(page, 'requester-dashboard', 'requester-dashboard-loading');
    release();
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
    await page.unroute('**/api/dashboard/requester');

    await page.route('**/api/dashboard/requester', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'DASHBOARD_ERROR', message: 'x' } }) }));
    await page.reload();
    await expect(page.getByText(/couldn't load the dashboard/i)).toBeVisible();
    await capture(page, 'requester-dashboard', 'requester-dashboard-failure');
  });

  test('SHOT-02: staff dashboard (normal, empty, loading, failure, forbidden)', async ({ page }) => {
    await uiLogin(page, USERS.staff);
    await capture(page, 'staff-dashboard', 'staff-dashboard');

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await uiLogin(page, USERS.admin);
    await capture(page, 'staff-dashboard', 'staff-dashboard-admin');

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await uiLogin(page, EMPTY_STAFF, EMPTY_STAFF_PASSWORD);
    await capture(page, 'staff-dashboard', 'staff-dashboard-empty');

    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    await page.route('**/api/dashboard/staff', async (route) => { await gate; await route.continue(); });
    await page.reload();
    await expect(page.getByText('Loading dashboard...')).toBeVisible();
    await capture(page, 'staff-dashboard', 'staff-dashboard-loading');
    release();
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
    await page.unroute('**/api/dashboard/staff');

    await page.route('**/api/dashboard/staff', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'DASHBOARD_ERROR', message: 'x' } }) }));
    await page.reload();
    await expect(page.getByText(/couldn't load the dashboard/i)).toBeVisible();
    await capture(page, 'staff-dashboard', 'staff-dashboard-failure');
    await page.unroute('**/api/dashboard/staff');

    await page.route('**/api/dashboard/staff', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'x' } }) }));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
    await capture(page, 'staff-dashboard', 'staff-dashboard-forbidden');
  });

  test('SHOT-03: actions taken (list, form, validation, complete, cancel, read-only, load failure)', async ({ page }) => {
    const { id, ticketNumber } = await createTicket('Visual evidence: VPN drops every ten minutes');
    await setStatus(id, 'OPEN');
    await setStatus(id, 'IN_PROGRESS');
    await seedActions(id);

    await uiLogin(page, USERS.staff);
    await openStaffTicket(page, ticketNumber);
    await openActionsTab(page);
    const section = page.getByTestId('actions-taken-section');
    await capture(page, 'actions-taken', 'actions-list');

    await section.getByRole('button', { name: 'Add Action Taken' }).click();
    await capture(page, 'actions-taken', 'actions-create-form');

    await section.getByLabel('Follow-up required').check();
    await section.getByRole('button', { name: 'Save Action' }).click();
    await expect(section.locator('#action-description-error')).toBeVisible();
    await capture(page, 'actions-taken', 'actions-create-validation');
    await section.getByRole('button', { name: 'Cancel' }).first().click();

    const open = section.locator('[data-testid^="action-"]').filter({ hasText: 'Monitor the connection' });
    await open.getByRole('button', { name: /Complete/ }).first().click();
    await capture(page, 'actions-taken', 'actions-complete-form');
    await open.getByRole('button', { name: 'Cancel', exact: true }).first().click();

    await open.getByRole('button', { name: 'Cancel', exact: true }).last().click();
    await expect(section.getByRole('alertdialog')).toBeVisible();
    await capture(page, 'actions-taken', 'actions-cancel-confirm');

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await uiLogin(page, USERS.requester);
    await openRequesterTicket(page, ticketNumber);
    await expect(page.getByTestId('actions-taken-section')).toContainText('Checked the VPN client logs');
    await capture(page, 'actions-taken', 'actions-requester-read-only');

    await page.route(`**/api/tickets/${id}/actions`, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'X', message: 'x' } }) }));
    await page.reload();
    await openRequesterTicket(page, ticketNumber).catch(() => undefined);
    await expect(page.getByTestId('actions-taken-section').getByRole('alert')).toBeVisible();
    await capture(page, 'actions-taken', 'actions-load-failure');
  });

  test('SHOT-04: ticket workflow (resolution gate and conflict)', async ({ browser }) => {
    const { id, ticketNumber } = await createTicket('Visual evidence: workflow states');
    await setStatus(id, 'OPEN');
    await setStatus(id, 'IN_PROGRESS');
    const staff = await apiLogin(USERS.staff);
    await staff.api.post(`/api/staff/tickets/${id}/actions`, { headers: { Authorization: `Bearer ${staff.token}` }, data: { description: 'Replace the faulty cable' } });
    await staff.api.dispose();

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    await uiLogin(a, USERS.staff);
    await uiLogin(b, USERS.staff2);
    await openStaffTicket(a, ticketNumber);
    await openStaffTicket(b, ticketNumber);

    await a.selectOption('#staff-detail-status', 'RESOLVED');
    await a.getByRole('button', { name: 'Update Status' }).click();
    await expect(a.getByText('The Ticket cannot be resolved yet:')).toBeVisible();
    await capture(a, 'ticket-workflow', 'resolution-gate-blocked');

    // A moves the ticket on; B still holds the old version and is told so.
    await a.selectOption('#staff-detail-status', 'WAITING_FOR_REQUESTER');
    await a.getByRole('button', { name: 'Update Status' }).click();
    await expect(a.locator('#staff-detail-status')).toHaveValue('WAITING_FOR_REQUESTER');
    await b.selectOption('#staff-detail-status', 'CANCELLED');
    await b.getByRole('button', { name: 'Update Status' }).click();
    await expect(b.getByText('This Ticket was changed by someone else.')).toBeVisible();
    await capture(b, 'ticket-workflow', 'stale-update-conflict');
    await ctxA.close();
    await ctxB.close();
  });
});
