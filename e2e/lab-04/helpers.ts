import { expect, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';

export const WEB = 'http://localhost:5173';
export const API = 'http://localhost:5001';
export const PASSWORD = 'InitialPassword123!';

export const USERS = {
  requester: 'jennifer.anderson@example.com',
  emptyRequester: 'emma.wilson@example.com',
  staff: 'alex.thompson@toktickit.com',
  staff2: 'kevin.patel@toktickit.com',
  admin: 'john.smith@toktickit.com',
};

export async function uiLogin(page: Page, email: string) {
  await page.goto(WEB);
  const emailInput = page.locator('input[placeholder="name@toktickit.com"]');
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(email);
  await page.fill('input[placeholder="••••••••"]', PASSWORD);
  await page.click('button:has-text("Sign In")');
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible({ timeout: 15000 });
}

export async function apiLogin(email: string): Promise<{ api: APIRequestContext; token: string; id: number }> {
  const api = await playwrightRequest.newContext({ baseURL: API });
  const res = await api.post('/api/auth/login', { data: { email, password: PASSWORD } });
  const body = await res.json();
  return { api, token: body.data.token as string, id: body.data.user.id as number };
}

/** Creates a fresh NEW ticket owned by the given requester and returns its identifiers. */
export async function createTicket(summary: string, requesterEmail = USERS.requester) {
  const { api, token } = await apiLogin(requesterEmail);
  const res = await api.post('/api/tickets', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      summary,
      description: 'Created by a Lab 4 E2E spec.',
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: 'MEDIUM',
    },
  });
  const data = (await res.json()).data;
  await api.dispose();
  return { id: data.id as number, ticketNumber: data.ticketNumber as string };
}

/** Moves a ticket to the given status through the staff API (reads the current version first). */
export async function setStatus(ticketId: number, status: string, email = USERS.staff, resolutionSummary?: string) {
  const { api, token } = await apiLogin(email);
  const headers = { Authorization: `Bearer ${token}` };
  const detail = await (await api.get(`/api/staff/tickets/${ticketId}`, { headers })).json();
  const res = await api.patch(`/api/staff/tickets/${ticketId}/status`, {
    headers,
    data: { expectedVersion: detail.data.version, status, resolutionSummary },
  });
  await api.dispose();
  return res.status();
}

export async function openStaffTicket(page: Page, ticketNumber: string) {
  await page.getByRole('button', { name: /Ticket Queue/ }).first().click();
  const filtered = page.waitForResponse((r) => r.url().includes('/api/staff/tickets') && r.url().includes(ticketNumber));
  await page.fill('input[placeholder="Search by ticket number or summary..."]', ticketNumber);
  await filtered;
  await expect(page.locator('body')).toContainText('1 ticket');
  await page.locator(`button:visible:has-text("View Details")`).first().click();
  await expect(page.getByRole('heading', { name: ticketNumber })).toBeVisible();
}

export async function openRequesterTicket(page: Page, ticketNumber: string) {
  await page.getByRole('button', { name: /My Tickets/ }).first().click();
  const filtered = page.waitForResponse((r) => r.url().includes('/api/tickets') && r.url().includes(ticketNumber));
  await page.fill('input[placeholder*="Search"]', ticketNumber);
  await filtered;
  await page.locator(`button:visible:has-text("${ticketNumber}")`).first().click();
  await expect(page.locator('body')).toContainText(ticketNumber);
}

export async function openActionsTab(page: Page) {
  await page.getByRole('button', { name: /Actions Taken \(\d+\)/ }).click();
  await expect(page.getByTestId('actions-taken-section')).toBeVisible();
}

/** Records an OPEN action on a ticket through the staff API. */
export async function addAction(ticketId: number, description: string, email = USERS.staff) {
  const { api, token } = await apiLogin(email);
  const res = await api.post(`/api/staff/tickets/${ticketId}/actions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { description },
  });
  await api.dispose();
  return res.status();
}
