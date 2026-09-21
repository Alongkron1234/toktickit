import { test, expect, request as playwrightRequest } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

// Restores john.smith to sole-active-Administrator and deactivates any
// stray fixture admins left over from a previous run, via a direct DB
// write (not the app API) — see server/scripts/e2e-reset-admin-fixtures.ts
// for why the API path is not reliable for this.
const resetAdminFixtures = () => {
  // The local tsx binary directly, not `npx tsx` — npx's own resolution can
  // stall waiting on registry/network checks in a non-interactive runner,
  // hanging this synchronous call indefinitely.
  execFileSync('node_modules/.bin/tsx', ['scripts/e2e-reset-admin-fixtures.ts'], {
    cwd: path.resolve(__dirname, '../../server'),
    stdio: 'inherit',
  });
};

// The local dev DB occasionally serves one transient failure under this
// spec's burst of API calls. An unchecked `await api.patch(...)` swallows
// that silently, which is especially dangerous for the BR-14 setup chain
// below: a silently-failed "deactivate john.smith" leaves him active, so the
// guard correctly does NOT fire — and the test's own role-change then
// actually goes through, locking the test's fixture account out. Retrying
// with a real status check turns that into either a clean pass or a loud,
// honest failure instead of a confusing downstream one.
const apiRequestWithRetry = async (
  fn: () => Promise<import('@playwright/test').APIResponse>,
  label: string
): Promise<import('@playwright/test').APIResponse> => {
  let lastRes: import('@playwright/test').APIResponse | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fn();
    if (res.ok()) return res;
    lastRes = res;
  }
  throw new Error(`${label} failed after retries: ${lastRes?.status()} ${await lastRes?.text()}`);
};

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const screenshotsBase = path.resolve(__dirname, '../../artifacts/lab-03/screenshots/user-management');

// `fullPage` must be false whenever a modal is open: the modal backdrop is
// `position: fixed` (viewport-relative), but a fullPage capture stitches
// together the whole scrollable document — which is taller than one
// viewport once the user table has many rows — so the backdrop only dims
// the first screen's worth and leaves the rest of the captured image
// looking like an ungrayed strip below the modal. A modal is designed to
// fit one viewport anyway, so a plain (non-fullPage) shot is the correct
// capture for it, not just a workaround.
const captureResponsiveScreenshots = async (page: any, baseName: string, fullPage = true) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsBase, `desktop-${baseName}.png`), fullPage });

  await page.setViewportSize({ width: 834, height: 1194 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsBase, `tablet-${baseName}.png`), fullPage });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsBase, `mobile-${baseName}.png`), fullPage });

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

// Search, then click an action button scoped to the row/card that actually
// contains the target text. Two timing pitfalls make a fixed wait + blind
// click unreliable here: (1) the click can land before the search's async
// refetch/re-render finishes, hitting a button that belongs to a different
// (still-unfiltered) row; (2) with the admin list explicitly unpaginated, the
// full user table can be dozens of rows, and Playwright locators are
// re-evaluated live at click time — if the filter hasn't settled yet, a
// `.first()` taken mid-transition can resolve ambiguously.
// `expect(...).toHaveCount(1)` polls until the search has genuinely narrowed
// the results down to exactly one match before we touch it, which sidesteps
// both problems instead of guessing at a timeout.
const clickRowAction = async (page: any, searchText: string, buttonText: string) => {
  // Mobile card markup renders before the desktop table in the DOM but is
  // CSS-hidden at desktop viewports, so scope to the visible row/card only.
  // Note: the desktop table's own wrapper <div> also carries a Bootstrap
  // "card" class, so a bare ".card" selector matches that wrapper too, not
  // just the per-user mobile cards — scope to their actual container.
  const matches = page
    .locator('tbody tr:visible, .d-block.d-md-none > .card:visible')
    .filter({ hasText: searchText });

  // The local dev Postgres proxy occasionally serves one transient 500 or
  // empty result under load (many rapid admin-API calls across this spec).
  // fetchUsers only refetches on a searchTerm/roleFilter change, so a fetch
  // that lands on that blip and isn't followed by another state change can
  // leave the UI stuck. Clearing and re-filling forces a fresh request each
  // attempt instead of passively re-polling the same stuck result.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.fill('input[placeholder="Search by name or email..."]', '');
    await page.fill('input[placeholder="Search by name or email..."]', searchText);
    try {
      await expect(matches).toHaveCount(1, { timeout: 5000 });
      break;
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }
  await matches.first().locator(`button:visible:has-text("${buttonText}")`).click();
};

test.describe('Issue 7: Administrator User Management End-to-End Tests with Screenshots (Lab 3)', () => {
  // This spec does more sequential UI+API round-trips per test (create, edit,
  // reset-password, two logins, several admin-API calls) than the other Lab 3
  // specs. Diagnosed at length: app-level render counts and request counts
  // stay healthy throughout (confirmed via temporary instrumentation), yet
  // individual clicks occasionally fail Playwright's stability check under
  // local machine load (a fresh headless Chromium competing with everything
  // else running on the dev machine) — a different button each time, not a
  // reproducible app bug. `retries` absorbs that environmental variance the
  // same way it would in a resource-constrained CI runner, without masking a
  // real regression: a genuine bug fails the same way on every retry too.
  test.describe.configure({ retries: 2 });

  test.beforeEach(async ({}, testInfo) => {
    testInfo.setTimeout(60000);
  });

  test.beforeAll(() => {
    ensureDir(screenshotsBase);
    resetAdminFixtures();
  });


  test('E2E-ADMIN-01: Admin views the user list and it is forbidden for non-Administrators', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await fillLoginForm(page, 'john.smith@toktickit.com', 'InitialPassword123!');

    await page.click('text=👥 User Management');
    await expect(page.locator('h1')).toContainText('Users');
    await captureResponsiveScreenshots(page, 'user-list');

    await page.click('button[title="Sign Out"]');

    // A Requester never even sees the nav item (defense in depth).
    await fillLoginForm(page, 'jennifer.anderson@example.com', 'InitialPassword123!');
    await expect(page.locator('body')).not.toContainText('User Management');
  });

  test('E2E-ADMIN-02: Create, edit, and reset password for a user, with duplicate-email validation', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await fillLoginForm(page, 'john.smith@toktickit.com', 'InitialPassword123!');
    await page.click('text=👥 User Management');
    await expect(page.locator('h1')).toContainText('Users');

    // --- Create ---
    await page.click('text=+ Create User');
    await captureResponsiveScreenshots(page, 'create-user-modal', false);

    const newEmail = `e2e.admin.created.${Date.now()}@toktickit.com`;
    await page.fill('#user-form-name', 'E2E Created User');
    await page.fill('#user-form-email', newEmail);
    await page.selectOption('#user-form-role', 'IT_STAFF');
    await page.fill('#user-form-password', 'InitialPassword123!');
    await page.click('button:has-text("Save User")');
    await expect(page.locator('body')).toContainText('E2E Created User');
    await captureResponsiveScreenshots(page, 'after-create');

    // --- Duplicate email validation ---
    await page.click('text=+ Create User');
    await page.fill('#user-form-name', 'Duplicate Attempt');
    await page.fill('#user-form-email', newEmail);
    await page.selectOption('#user-form-role', 'REQUESTER');
    await page.fill('#user-form-password', 'InitialPassword123!');
    await page.click('button:has-text("Save User")');
    await expect(page.locator('body')).toContainText(/already exists/i);
    await captureResponsiveScreenshots(page, 'duplicate-email-error', false);
    await page.click('button:has-text("Cancel")');

    // --- Edit ---
    await clickRowAction(page, newEmail, 'Edit');
    await page.fill('#user-form-name', 'E2E Edited User');
    await page.click('button:has-text("Save User")');
    await expect(page.locator('body')).toContainText('E2E Edited User');
    await captureResponsiveScreenshots(page, 'after-edit');

    // --- Reset Password ---
    await clickRowAction(page, newEmail, 'Reset Password');
    await captureResponsiveScreenshots(page, 'reset-password-modal', false);
    await page.fill('#reset-password-input', 'BrandNewInitialPassword123!');
    await page.click('button[type="submit"]:has-text("Reset Password")');
    await expect(page.locator('.modal')).toHaveCount(0);

    // Confirm the account is now forced through mandatory password change.
    await page.click('button[title="Sign Out"]');
    await fillLoginForm(page, newEmail, 'BrandNewInitialPassword123!');
    await expect(page.locator('body')).toContainText('Change Your Password');
  });

  test('E2E-ADMIN-03: Safety guards — self-deactivation and last-Administrator protection', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await fillLoginForm(page, 'john.smith@toktickit.com', 'InitialPassword123!');
    await page.click('text=👥 User Management');

    // Self-deactivation: the Active toggle is disabled client-side on your own row.
    await clickRowAction(page, 'john.smith@toktickit.com', 'Edit');
    await expect(page.locator('#user-form-active')).toBeDisabled();
    await captureResponsiveScreenshots(page, 'self-deactivation-guard', false);
    await page.click('button:has-text("Cancel")');
    // Clear the search filter — left over from the check above, it would hide
    // the newly created admin from the list right after creation below.
    await page.fill('input[placeholder="Search by name or email..."]', '');
    await page.waitForTimeout(500);

    // Last-Administrator guard: create a second admin, make it the ONLY active
    // admin left (deactivate john.smith via the API), then have it try to change
    // its OWN role away from Administrator. This must go through the role
    // dropdown, not the Active toggle — the Active toggle is disabled for your
    // own row (BR-13 self-deactivation, already covered above) and would trip
    // that guard instead of the last-admin one this test targets. Everything
    // deactivated here is restored via a direct API call in `finally`, so a
    // failed assertion can never leave john.smith's seeded account broken.
    const soleAdminEmail = `e2e.sole.admin.${Date.now()}@toktickit.com`;
    await page.click('text=+ Create User');
    await page.fill('#user-form-name', 'E2E Sole Admin');
    await page.fill('#user-form-email', soleAdminEmail);
    await page.selectOption('#user-form-role', 'ADMINISTRATOR');
    await page.fill('#user-form-password', 'InitialPassword123!');
    await page.click('button:has-text("Save User")');
    await expect(page.locator('body')).toContainText('E2E Sole Admin');

    await page.click('button[title="Sign Out"]');

    const api = await playwrightRequest.newContext({ baseURL: 'http://localhost:5001' });
    const loginRes = await apiRequestWithRetry(
      () => api.post('/api/auth/login', { data: { email: soleAdminEmail, password: 'InitialPassword123!' } }),
      'sole-admin login'
    );
    let soleAdminToken = (await loginRes.json()).data.token;

    // New accounts require a password change (BR-02) before any other endpoint
    // will accept their token — complete that first, same as a real first login.
    const soleAdminNewPassword = 'BrandNewPassword123!';
    await apiRequestWithRetry(
      () =>
        api.post('/api/auth/change-password', {
          headers: { Authorization: `Bearer ${soleAdminToken}` },
          data: { currentPassword: 'InitialPassword123!', newPassword: soleAdminNewPassword, confirmPassword: soleAdminNewPassword },
        }),
      'sole-admin change-password'
    );

    const usersRes = await apiRequestWithRetry(
      () => api.get('/api/admin/users', { headers: { Authorization: `Bearer ${soleAdminToken}` } }),
      'fetch admin users to find john.smith'
    );
    const john = (await usersRes.json()).data.find((u: any) => u.email === 'john.smith@toktickit.com');
    if (!john) throw new Error('john.smith not found in admin user list during BR-14 setup');

    try {
      await apiRequestWithRetry(
        () =>
          api.patch(`/api/admin/users/${john.id}`, {
            headers: { Authorization: `Bearer ${soleAdminToken}` },
            data: { isActive: false },
          }),
        'deactivate john.smith for BR-14 setup'
      );

      await fillLoginForm(page, soleAdminEmail, soleAdminNewPassword);
      await page.click('text=👥 User Management');
      await clickRowAction(page, soleAdminEmail, 'Edit');
      await expect(page.locator('#user-form-active')).toBeDisabled(); // editing self
      await page.selectOption('#user-form-role', 'IT_STAFF');
      await page.click('button:has-text("Save User")');
      await expect(page.locator('body')).toContainText(/at least one active Administrator/i);
      await captureResponsiveScreenshots(page, 'last-admin-guard', false);
    } finally {
      // Deliberately not an API call: if the guard above didn't fire as
      // expected, soleAdminToken may already be demoted and rejected by
      // requireRole, which would make an API-based restore fail silently.
      // A direct DB write can't be defeated by that.
      resetAdminFixtures();
      await api.dispose();
    }
  });
});
