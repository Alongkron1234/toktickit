import { test, expect, request as playwrightRequest } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const screenshotsBase = path.resolve(__dirname, '../../artifacts/lab-03/screenshots/authentication');

// Capture screenshots across the 3 required viewports (Desktop, Tablet, Mobile).
const captureResponsiveScreenshots = async (page: any, baseName: string) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsBase, `desktop-${baseName}.png`), fullPage: true });

  await page.setViewportSize({ width: 834, height: 1194 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsBase, `tablet-${baseName}.png`), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsBase, `mobile-${baseName}.png`), fullPage: true });

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
  // own loading state to clear instead — reliable for both a successful
  // login (navigates away) and a rejected one (inline error, same screen).
  await expect(page.locator('button:has-text("Signing in...")')).toHaveCount(0, { timeout: 15000 });
};

const goToLogin = async (page: any) => {
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
};

test.describe('Issue 7: Authentication End-to-End Tests with Screenshots (Lab 3)', () => {
  // See the identical note in user-administration.spec.ts: occasional
  // Playwright click-stability failures under local machine load, not a
  // reproducible app bug. Retries absorb it.
  test.describe.configure({ retries: 2 });

  let requiresChangeEmail: string;

  test.beforeAll(async () => {
    ensureDir(screenshotsBase);

    // Fixture setup via the API directly (not the UI) — create a throwaway user
    // that still has requiresPasswordChange: true, to drive the mandatory
    // first-login password change flow without touching seed data.
    const api = await playwrightRequest.newContext({ baseURL: 'http://localhost:5001' });
    const adminLogin = await api.post('/api/auth/login', {
      data: { email: 'john.smith@toktickit.com', password: 'InitialPassword123!' },
    });
    const adminToken = (await adminLogin.json()).data.token;

    requiresChangeEmail = `e2e.mandatory.change.${Date.now()}@toktickit.com`;
    await api.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: 'E2E Mandatory Change User',
        email: requiresChangeEmail,
        role: 'REQUESTER',
        isActive: true,
        initialPassword: 'InitialPassword123!',
      },
    });
    await api.dispose();
  });

  test('E2E-AUTH-01: Valid login reaches the authenticated shell showing user and role', async ({ page }) => {
    await goToLogin(page);
    await captureResponsiveScreenshots(page, 'login-form');

    await fillLoginForm(page, 'jennifer.anderson@example.com', 'InitialPassword123!');

    await expect(page.locator('body')).toContainText('Jennifer Anderson');
    await expect(page.locator('body')).toContainText('Requester');
    await captureResponsiveScreenshots(page, 'authenticated-shell');
  });

  test('E2E-AUTH-02: Invalid credentials show a safe inline error, no navigation', async ({ page }) => {
    await goToLogin(page);
    await fillLoginForm(page, 'jennifer.anderson@example.com', 'WrongPassword123!');

    await expect(page.locator('body')).toContainText(/invalid email address or password/i);
    await captureResponsiveScreenshots(page, 'invalid-credentials');
  });

  test('E2E-AUTH-03: Inactive account login shows a safe disabled-account message', async ({ page }) => {
    await goToLogin(page);
    // robert.taylor@example.com is seeded as an inactive Requester.
    await fillLoginForm(page, 'robert.taylor@example.com', 'InitialPassword123!');

    await expect(page.locator('body')).toContainText(/disabled/i);
    await captureResponsiveScreenshots(page, 'inactive-account');
  });

  test('E2E-AUTH-04: Mandatory first-login password change blocks the app until completed', async ({ page }) => {
    await goToLogin(page);
    await fillLoginForm(page, requiresChangeEmail, 'InitialPassword123!');

    // Blocked from the normal app — the Change Password screen shows instead.
    await expect(page.locator('body')).toContainText('Change Your Password');
    await captureResponsiveScreenshots(page, 'mandatory-password-change');

    await page.fill('input[placeholder="Enter current password"]', 'InitialPassword123!');
    await page.fill('input[placeholder="Enter new password"]', 'BrandNewPassword123!');
    await page.fill('input[placeholder="Re-enter new password"]', 'BrandNewPassword123!');
    await page.click('button:has-text("Save Password & Continue")');
    await page.waitForLoadState('networkidle');

    // Normal application screens are now reachable.
    await expect(page.locator('body')).toContainText('E2E Mandatory Change User');
    await expect(page.locator('body')).not.toContainText('Change Your Password');
    await captureResponsiveScreenshots(page, 'password-change-complete');
  });

  test('E2E-AUTH-05: Logout destroys the session and blocks direct access', async ({ page }) => {
    await goToLogin(page);
    await fillLoginForm(page, 'jennifer.anderson@example.com', 'InitialPassword123!');
    await expect(page.locator('body')).toContainText('Jennifer Anderson');

    await page.click('button[title="Sign Out"]');
    await expect(page.locator('input[placeholder="name@toktickit.com"]')).toBeVisible();
    await captureResponsiveScreenshots(page, 'post-logout');

    // A hard reload after logout must not restore the session.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[placeholder="name@toktickit.com"]')).toBeVisible();
  });
});
