import { test, expect } from '@playwright/test';
import {
  USERS, uiLogin, createTicket, setStatus, addAction, openStaffTicket, openRequesterTicket, openActionsTab,
} from './helpers';

test.describe('Lab 4 Ticket workflow and resolution (E2E-W)', () => {
  test('E2E-W-01: open actions block Resolved until they are completed, then Closed works', async ({ page }) => {
    const { id, ticketNumber } = await createTicket('E2E resolution gate fixture');
    await setStatus(id, 'OPEN');
    await setStatus(id, 'IN_PROGRESS');
    await addAction(id, 'Replace the faulty cable');

    await uiLogin(page, USERS.staff);
    await openStaffTicket(page, ticketNumber);

    // Resolving is blocked while an action is open.
    await page.selectOption('#staff-detail-status', 'RESOLVED');
    await expect(page.getByText('1 action(s) are still open')).toBeVisible();
    await page.getByRole('button', { name: 'Update Status' }).click();
    await expect(page.getByText('The Ticket cannot be resolved yet:')).toBeVisible();

    // Complete the action, then resolve with a summary.
    await openActionsTab(page);
    const section = page.getByTestId('actions-taken-section');
    await section.getByRole('button', { name: /Complete/ }).first().click();
    await section.getByLabel(/Result/).fill('Cable replaced');
    await section.getByRole('button', { name: 'Complete Action' }).click();
    await expect(section).toContainText('Completed');

    await page.selectOption('#staff-detail-status', 'RESOLVED');
    await page.fill('#staff-detail-resolution', 'Faulty cable replaced and link restored.');
    await page.getByRole('button', { name: 'Update Status' }).click();
    await expect(page.getByRole('heading', { name: ticketNumber }).locator('xpath=ancestor::div[contains(@class,"card-header")]')).toContainText('Resolved');

    await page.selectOption('#staff-detail-status', 'CLOSED');
    await page.getByRole('button', { name: 'Update Status' }).click();
    await expect(page.getByRole('heading', { name: ticketNumber }).locator('xpath=ancestor::div[contains(@class,"card-header")]')).toContainText('Closed');
    await expect(page.locator('#staff-status-terminal-note')).toBeVisible();
  });

  test('E2E-W-02: the requester says the problem appears resolved and can reopen a resolved ticket', async ({ page }) => {
    const { id, ticketNumber } = await createTicket('E2E requester reopen fixture');
    await setStatus(id, 'OPEN');
    await setStatus(id, 'IN_PROGRESS');
    await setStatus(id, 'RESOLVED', USERS.staff, 'Restarted the service.');

    await uiLogin(page, USERS.requester);
    await openRequesterTicket(page, ticketNumber);
    await expect(page.locator('body')).toContainText('Resolved');

    await page.getByPlaceholder(/type your comment or update here/i).fill('It works on my side now.');
    await page.getByLabel(/problem appears resolved from my side/i).check();
    await page.getByRole('button', { name: /post comment/i }).click();
    await expect(page.getByText('It works on my side now.')).toBeVisible();
    await expect(page.getByText(/Requester indicated problem appears resolved/i)).toBeVisible();

    await page.getByRole('button', { name: /Reopen Ticket/ }).click();
    await expect(page.getByText('Reopened', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reopen Ticket/ })).toHaveCount(0);
  });

  test('E2E-W-03: a stale status update is rejected with a conflict message', async ({ browser }) => {
    const { id, ticketNumber } = await createTicket('E2E stale update fixture');
    await setStatus(id, 'OPEN');

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    await uiLogin(a, USERS.staff);
    await uiLogin(b, USERS.staff2);
    await openStaffTicket(a, ticketNumber);
    await openStaffTicket(b, ticketNumber);

    // Staff A moves the ticket on first.
    await a.selectOption('#staff-detail-status', 'IN_PROGRESS');
    await a.getByRole('button', { name: 'Update Status' }).click();
    await expect(a.locator('#staff-status-terminal-note')).toHaveCount(0);
    await expect(a.getByRole('heading', { name: ticketNumber }).locator('xpath=ancestor::div[contains(@class,"card-header")]')).toContainText('In Progress');

    // Staff B still holds the old version and is told so.
    await b.selectOption('#staff-detail-status', 'CANCELLED');
    await b.getByRole('button', { name: 'Update Status' }).click();
    await expect(b.getByText('This Ticket was changed by someone else.')).toBeVisible();

    await b.getByRole('button', { name: 'Reload' }).click();
    await expect(b.getByText('This Ticket was changed by someone else.')).toHaveCount(0);
    await expect(b.getByRole('heading', { name: ticketNumber }).locator('xpath=ancestor::div[contains(@class,"card-header")]')).toContainText('In Progress');

    await ctxA.close();
    await ctxB.close();
  });
});
