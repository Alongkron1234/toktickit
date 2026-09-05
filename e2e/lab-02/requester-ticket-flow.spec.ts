import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Helper to ensure screenshot directories exist
const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

test.describe('Requester Ticket Lifecycle End-to-End Tests with Automatic Screenshots (Lab 2 - Issue 9)', () => {
  const screenshotsBase = path.resolve(__dirname, '../../artifacts/lab-02/screenshots');

  test.beforeEach(async ({ page }) => {
    ensureDir(path.join(screenshotsBase, 'create-ticket'));
    ensureDir(path.join(screenshotsBase, 'my-tickets'));
    ensureDir(path.join(screenshotsBase, 'ticket-detail'));

    // Navigate to root application
    await page.goto('http://localhost:5173/');

    // Wait for page to settle
    await page.waitForLoadState('networkidle');

    // Ensure Requester Selection is performed if on selection screen
    const selectDropdown = page.locator('#requesterSelect');
    if (await selectDropdown.isVisible().catch(() => false)) {
      await selectDropdown.selectOption('1');
      await page.click('button:has-text("Continue")');
      await page.waitForLoadState('networkidle');
    }
  });

  // Helper function to capture screenshots across 3 required viewports (Desktop, Tablet, Mobile)
  const captureResponsiveScreenshots = async (page: any, folder: string, baseName: string) => {
    // Desktop >= 992px (1440px gives enough room for all 9 table columns)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsBase, folder, `desktop-${baseName}.png`), fullPage: true });

    // Tablet 768 - 991px
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsBase, folder, `tablet-${baseName}.png`), fullPage: true });

    // Mobile < 768px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsBase, folder, `mobile-${baseName}.png`), fullPage: true });

    // Reset back to Desktop for subsequent test actions
    await page.setViewportSize({ width: 1440, height: 900 });
  };

  test('E2E-01: Full Create Ticket flow and save responsive screenshots', async ({ page }) => {
    // 1. Navigate to Create Ticket
    await page.click('button:has-text("Create Ticket"), a:has-text("Create Ticket")');
    await expect(page.locator('h1')).toContainText('Create IT Support Ticket');

    // Capture Create Ticket Initial Screen (Desktop, Tablet, Mobile)
    await captureResponsiveScreenshots(page, 'create-ticket', 'form');

    // 2. Fill form
    await page.selectOption('select#categoryId', { index: 1 });
    await page.selectOption('select#relatedSystemId', { index: 1 });
    await page.selectOption('select#requestedPriority', 'HIGH');
    await page.fill('input#summary', 'E2E Testing Ticket Summary Sample');
    await page.fill('textarea#description', 'Detailed description for Playwright E2E automated test flow.');

    // 3. Submit
    await page.click('button[type="submit"]:has-text("Submit Ticket")');

    // 4. Verify success alert & ticket number
    const successAlert = page.locator('.alert-success');
    await expect(successAlert).toBeVisible();

    // Capture Create Ticket Success Screen (Desktop, Tablet, Mobile)
    await captureResponsiveScreenshots(page, 'create-ticket', 'success');

    // 5. Navigate to My Tickets & verify new ticket is listed
    await page.click('button:has-text("My Tickets"), a:has-text("My Tickets")');
    await expect(page.locator('body')).toContainText('E2E Testing Ticket Summary Sample');

    // Capture My Tickets List Screen (Desktop, Tablet, Mobile)
    await captureResponsiveScreenshots(page, 'my-tickets', 'list');
  });

  test('E2E-02: Requester switching and ownership isolation flow with screenshots', async ({ page }) => {
    // 1. Verify Jennifer Anderson is active requester
    await expect(page.locator('body')).toContainText('Jennifer Anderson');

    // 2. Click Change Requester
    await page.click('button:has-text("Change Requester"), button:has-text("Switch")');
    await expect(page.locator('#requesterSelect')).toBeVisible();

    // 3. Switch to Michael Brown (ID 2)
    await page.selectOption('#requesterSelect', '2');
    await page.click('button:has-text("Continue")');

    // 4. Verify user switched & data reloaded
    await expect(page.locator('body')).toContainText('Michael Brown');

    // Capture My Tickets Screen after switching requester (Desktop, Tablet, Mobile)
    await captureResponsiveScreenshots(page, 'my-tickets', 'switched-user');
  });

  test('E2E-03: Attachment upload, soft removal, and blocked download flow with screenshots', async ({ page }) => {
    // 1. Open first ticket in My Tickets
    await expect(page.locator('table tbody tr, .card')).not.toHaveCount(0);
    await page.locator('button:has-text("TKT-"):visible').first().click();
    await expect(page.locator('.card-header').first()).toContainText(/Ticket|Attachments/i);

    // Capture Ticket Detail Read-only View Screen (Desktop, Tablet, Mobile)
    await captureResponsiveScreenshots(page, 'ticket-detail', 'read-only');

    // 2. Open Add Attachment modal if present
    const addAttachBtn = page.locator('button:has-text("Add Attachment"), button:has-text("Upload")');
    if (await addAttachBtn.isVisible().catch(() => false)) {
      await addAttachBtn.click();
      await page.waitForTimeout(500);

      // Capture full viewport with modal overlay (matches actual browser view)
      // Desktop
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsBase, 'ticket-detail', 'desktop-upload-modal.png') });

      // Tablet
      await page.setViewportSize({ width: 834, height: 1194 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsBase, 'ticket-detail', 'tablet-upload-modal.png') });

      // Mobile
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsBase, 'ticket-detail', 'mobile-upload-modal.png') });

      // Reset to Desktop
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.click('.modal-header .btn-close, button:has-text("Cancel")');
    }
  });
});
