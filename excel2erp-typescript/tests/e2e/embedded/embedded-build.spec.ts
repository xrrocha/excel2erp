import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Embedded Build Tests
 *
 * Tests for the "fat" build mode where YAML config and logo assets
 * are bundled directly into the HTML file.
 *
 * Prerequisites:
 * - Run: bun run build:embed tests/fixtures/demo/assets/excel2erp.yaml dist/embedded/test-embedded.html
 * - This generates an embedded build for testing
 *
 * These tests verify:
 * 1. No config picker is shown (config is pre-loaded)
 * 2. Sources dropdown is populated immediately
 * 3. Logos display correctly (from data: URLs)
 * 4. Full conversion workflow works
 */

// Configure to use embedded build
test.use({
  baseURL: 'http://localhost:5174', // Different port for embedded test server
});

/**
 * UI abstraction (consistent with other e2e tests)
 */
const ui = {
  async selectSource(page: Page, sourceName: string) {
    const select = page.locator('select[name="source"], select');
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.selectOption(sourceName);
    await page.waitForTimeout(500);
  },

  async uploadFile(page: Page, filePath: string) {
    const fileInput = page.locator('input[type="file"][accept*=".xls"]');
    await expect(fileInput).toBeAttached({ timeout: 5000 });
    await fileInput.setInputFiles(filePath);
  },

  async waitForPreview(page: Page) {
    const previewCard = page.locator('.preview-card');
    await expect(previewCard).toBeVisible({ timeout: 5000 });
  },

  async confirmDownload(page: Page) {
    const downloadBtn = page.locator('.btn-confirm');
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
    await downloadBtn.click();
  },
};

test.describe('Embedded Build', () => {

  test('loads without showing config picker', async ({ page }) => {
    await page.goto('/');

    // Config picker should NOT be visible
    const configPicker = page.locator('.config-picker');
    await expect(configPicker).toBeHidden({ timeout: 5000 });

    // App should show the main form immediately (source selector visible)
    const sourceSelect = page.locator('select[name="source"], select');
    await expect(sourceSelect).toBeVisible({ timeout: 5000 });
  });

  test('sources dropdown is pre-populated from embedded config', async ({ page }) => {
    await page.goto('/');

    const sourceSelect = page.locator('select[name="source"], select');
    await expect(sourceSelect).toBeVisible({ timeout: 5000 });

    // Should have multiple options (sources from embedded config)
    const options = sourceSelect.locator('option');
    const count = await options.count();

    // At least 2 options: placeholder + at least one source
    expect(count).toBeGreaterThan(1);
  });

  test('displays logos from embedded data URLs', async ({ page }) => {
    await page.goto('/');

    // Select a source that has a logo
    await ui.selectSource(page, 'uber-gross');

    // Customer logo should be visible
    const customerLogo = page.locator('.customer-logo');
    await expect(customerLogo).toBeVisible({ timeout: 5000 });

    // Logo src should be a data URL (embedded), not a file path
    const src = await customerLogo.getAttribute('src');
    expect(src).toMatch(/^data:image\/(png|jpeg|gif|webp);base64,/);
  });

  test('header logo uses embedded data URL when present', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    const sourceSelect = page.locator('select[name="source"], select');
    await expect(sourceSelect).toBeVisible({ timeout: 5000 });

    // Header logo (if config has one)
    const headerLogo = page.locator('.header-logo');
    const isVisible = await headerLogo.isVisible();

    if (isVisible) {
      const src = await headerLogo.getAttribute('src');
      expect(src).toMatch(/^data:image\/(png|jpeg|gif|webp);base64,/);
    }
  });

  test('full conversion workflow works with embedded config', async ({ page }) => {
    await page.goto('/');

    // Select source (uber-gross requires no user input)
    await ui.selectSource(page, 'uber-gross');

    // Upload Excel file
    const filePath = path.join(__dirname, '../../fixtures/demo/excel/uber-gross.xlsx');

    const downloadPromise = page.waitForEvent('download');
    await ui.uploadFile(page, filePath);
    await ui.confirmDownload(page);
    const download = await downloadPromise;

    // Verify download happened with correct filename pattern
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^erp-pedido-uber-gross-.+\.zip$/);
  });

  test('no config-related fetch errors in console', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for app to fully initialize
    const sourceSelect = page.locator('select[name="source"], select');
    await expect(sourceSelect).toBeVisible({ timeout: 5000 });

    // Filter for config/fetch related errors
    const configErrors = consoleErrors.filter(e =>
      e.includes('fetch') ||
      e.includes('Failed to load') ||
      e.includes('config') ||
      e.includes('CORS')
    );

    // Should have no config-related errors (config is embedded)
    expect(configErrors).toHaveLength(0);
  });

});
