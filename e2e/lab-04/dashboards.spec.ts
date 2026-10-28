import { test, expect, type Page } from '@playwright/test';
import { USERS, PASSWORD, uiLogin, apiLogin } from './helpers';

const EMPTY_STAFF = 'e2e.empty.staff@toktickit.com';
const EMPTY_STAFF_PASSWORD = 'E2eEmptyStaff!2026';

const card = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label}: \\d+`) });
const cardValue = async (page: Page, label: string) => {
  const name = (await card(page, label).getAttribute('aria-label')) ?? '';
  return Number(name.match(/: (\d+)/)![1]);
};
const footerTotal = async (page: Page) => {
  const text = (await page.locator('body').innerText()).match(/of\s+(\d+)\s+tickets/);
  return text ? Number(text[1]) : 0;
};

async function dashboardData(email: string, path: 'requester' | 'staff') {
  const { api, token } = await apiLogin(email);
  const res = await api.get(`/api/dashboard/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  await api.dispose();
  return { status: res.status(), body };
}

test.describe('Lab 4 Dashboards (E2E-D)', () => {
  test.beforeAll(async () => {
    // One fixed zero-state staff account, created on first run and reused afterwards.
    const { api, token } = await apiLogin(USERS.admin);
    await api.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'E2E Empty Staff', email: EMPTY_STAFF, role: 'IT_STAFF', isActive: true, initialPassword: PASSWORD },
    });
    // A new account must change its initial password before first use; do that once through the API.
    const first = await api.post('/api/auth/login', { data: { email: EMPTY_STAFF, password: PASSWORD } });
    if (first.ok()) {
      const firstToken = (await first.json()).data.token;
      await api.post('/api/auth/change-password', {
        headers: { Authorization: `Bearer ${firstToken}` },
        data: { currentPassword: PASSWORD, newPassword: EMPTY_STAFF_PASSWORD, confirmPassword: EMPTY_STAFF_PASSWORD },
      });
    }
    await api.dispose();
  });

  test('E2E-D-01: requester dashboard numbers match the data and drill down to My Tickets', async ({ page }) => {
    const { body } = await dashboardData(USERS.requester, 'requester');
    const m = body.data.metrics;

    await uiLogin(page, USERS.requester);
    await expect(page.getByRole('heading', { name: /Welcome back, Jennifer/ })).toBeVisible();
    expect(await cardValue(page, 'Open')).toBe(m.open);
    expect(await cardValue(page, 'In Progress')).toBe(m.inProgress);
    expect(await cardValue(page, 'Resolved')).toBe(m.resolved);
    expect(await cardValue(page, 'Closed')).toBe(m.closed);

    await card(page, 'Open').click();
    await expect(page.getByRole('heading', { name: /My Tickets/ }).first()).toBeVisible();
    await expect.poll(() => footerTotal(page)).toBe(m.open);
  });

  test('E2E-D-02: a requester only sees their own tickets; an empty requester sees zero state', async ({ page }) => {
    const jennifer = await dashboardData(USERS.requester, 'requester');
    const emma = await dashboardData(USERS.emptyRequester, 'requester');
    expect(emma.body.data.metrics).toEqual({ open: 0, inProgress: 0, waitingForRequester: 0, resolved: 0, closed: 0 });
    expect(emma.body.data.recentlyUpdated).toEqual([]);
    const jenniferNumbers = jennifer.body.data.recentlyUpdated.map((t: { ticketNumber: string }) => t.ticketNumber);

    await uiLogin(page, USERS.emptyRequester);
    await expect(page.getByText('No tickets to show yet.')).toBeVisible();
    for (const n of jenniferNumbers) await expect(page.locator('body')).not.toContainText(n);
    expect(await cardValue(page, 'Open')).toBe(0);
  });

  test('E2E-D-03: staff dashboard numbers match the data and drill down to the queue', async ({ page }) => {
    const { body } = await dashboardData(USERS.staff, 'staff');
    const m = body.data.metrics;

    await uiLogin(page, USERS.staff);
    expect(await cardValue(page, 'Unassigned')).toBe(m.unassigned);
    expect(await cardValue(page, 'My Assigned')).toBe(m.myAssigned);
    expect(await cardValue(page, 'New')).toBe(m.new);

    await card(page, 'Unassigned').click();
    await expect(page.getByRole('heading', { name: 'IT Staff Ticket Queue' })).toBeVisible();
    await expect.poll(() => footerTotal(page)).toBe(m.unassigned);

    await page.getByRole('button', { name: /Dashboard/ }).first().click();
    await card(page, 'My Assigned').click();
    await expect.poll(() => footerTotal(page)).toBe(m.myAssigned);
  });

  test('E2E-D-04: a staff member without data sees empty states', async ({ page }) => {
    await uiLogin(page, EMPTY_STAFF, EMPTY_STAFF_PASSWORD);
    await expect(page.getByText('No tickets to show yet.')).toBeVisible();
    await expect(page.getByText('No actions recorded yet.')).toBeVisible();
    expect(await cardValue(page, 'My Assigned')).toBe(0);
  });

  test('E2E-D-05: a requester is refused the staff dashboard by the API', async () => {
    const res = await dashboardData(USERS.requester, 'staff');
    expect(res.status).toBe(403);
  });
});
