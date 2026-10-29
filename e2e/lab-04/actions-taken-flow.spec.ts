import { test, expect } from '@playwright/test';
import { USERS, uiLogin, createTicket, openStaffTicket, openRequesterTicket, openActionsTab } from './helpers';

test.describe('Lab 4 Actions Taken flow (E2E-A)', () => {

  let ticketNumber: string;

  test.beforeAll(async () => {
    ({ ticketNumber } = await createTicket('E2E actions taken fixture'));
  });

  test('E2E-A-01: staff records, validates, edits, completes and cancels actions', async ({ page }) => {
    await uiLogin(page, USERS.staff);
    await openStaffTicket(page, ticketNumber);
    await openActionsTab(page);
    const section = page.getByTestId('actions-taken-section');
    await expect(section).toContainText('Actions Taken');

    // Validation: empty description, and follow-up without a note.
    await section.getByRole('button', { name: 'Add Action Taken' }).click();
    await expect(section.getByLabel('Performed By')).toHaveValue(/Alex Thompson/);
    await section.getByRole('button', { name: 'Save Action' }).click();
    await expect(section.getByRole('alert').first()).toBeVisible();
    await section.getByLabel(/Description/).fill('Checked the VPN client logs');
    await section.getByLabel('Follow-up required').check();
    await section.getByRole('button', { name: 'Save Action' }).click();
    await expect(section.locator('#action-followUpNote-error')).toBeVisible();

    // Inactive staff cannot be chosen as assignee.
    const assigneeOptions = await section.locator('#action-assignee option').allTextContents();
    expect(assigneeOptions.join('|')).not.toContain('Emily Davis');
    expect(assigneeOptions.join('|')).toContain('Kevin Patel');

    // Save with follow-up note and an assignee.
    await section.getByLabel(/Follow-up note/).fill('Check again on Monday');
    await section.locator('#action-assignee').selectOption({ label: 'Kevin Patel' });
    await section.getByRole('button', { name: 'Save Action' }).click();
    await expect(section).toContainText('Checked the VPN client logs');
    await expect(section).toContainText('Follow-up required');
    await expect(section).toContainText('Check again on Monday');
    await expect(section).toContainText('Assignee: Kevin Patel');

    // Edit the open action.
    const first = section.locator('[data-testid^="action-"]').first();
    await first.getByRole('button', { name: 'Edit' }).click();
    await section.getByLabel(/Description/).fill('Checked the VPN client logs and router');
    await section.getByRole('button', { name: 'Save Action' }).click();
    await expect(section).toContainText('and router');

    // Complete requires a result.
    await first.getByRole('button', { name: /Complete/ }).first().click();
    await first.getByRole('button', { name: 'Complete Action' }).click();
    await expect(first.getByRole('alert')).toBeVisible();
    await first.getByLabel(/Result/).fill('Router firmware updated');
    await first.getByRole('button', { name: 'Complete Action' }).click();
    await expect(first).toContainText('Completed');
    await expect(first).toContainText('Router firmware updated');
    await expect(first.getByRole('button', { name: 'Edit' })).toHaveCount(0);

    // A second action is cancelled after confirmation.
    await section.getByRole('button', { name: 'Add Action Taken' }).click();
    await section.getByLabel(/Description/).fill('Ask the user to reboot');
    await section.getByRole('button', { name: 'Save Action' }).click();
    const second = section.locator('[data-testid^="action-"]').filter({ hasText: 'Ask the user to reboot' });
    await second.getByRole('button', { name: 'Cancel' }).click();
    await second.getByRole('button', { name: 'Cancel Action' }).click();
    await expect(second).toContainText('Cancelled');
  });

  test('E2E-A-02: a second staff member adds an action to the same ticket', async ({ page }) => {
    await uiLogin(page, USERS.staff2);
    await openStaffTicket(page, ticketNumber);
    await openActionsTab(page);
    const section = page.getByTestId('actions-taken-section');
    await section.getByRole('button', { name: 'Add Action Taken' }).click();
    await expect(section.getByLabel('Performed By')).toHaveValue(/Kevin Patel/);
    await section.getByLabel(/Description/).fill('Verified the fix from the second shift');
    await section.getByRole('button', { name: 'Save Action' }).click();
    await expect(section).toContainText('Performed by Kevin Patel');
    await expect(section).toContainText('Performed by Alex Thompson');
  });

  test('E2E-A-03: the requester sees the actions read-only', async ({ page }) => {
    await uiLogin(page, USERS.requester);
    await openRequesterTicket(page, ticketNumber);
    const section = page.getByTestId('actions-taken-section');
    await expect(section).toContainText('Verified the fix from the second shift');
    await expect(section).toContainText('Router firmware updated');
    await expect(section.getByRole('button', { name: 'Add Action Taken' })).toHaveCount(0);
    await expect(section.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  });
});
