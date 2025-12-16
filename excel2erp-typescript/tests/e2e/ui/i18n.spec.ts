import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * i18n Tests: Verify UI text honors configuration
 *
 * Tests that all user-visible text respects the config file's
 * parameters rather than hardcoded English defaults.
 */

/**
 * UI abstraction (shared with other e2e tests)
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
};

test.describe('i18n: Config-driven UI text', () => {

  test('download button uses config submit label instead of hardcoded English', async ({ page }) => {
    await page.goto('/');

    // Select a source that requires no user input (uber-gross extracts all fields)
    await ui.selectSource(page, 'uber-gross');

    // Upload file to trigger preview
    const filePath = path.join(__dirname, '../../fixtures/demo/excel/uber-gross.xlsx');
    await ui.uploadFile(page, filePath);

    // Wait for preview to appear
    await ui.waitForPreview(page);

    // Verify download button text matches config.parameters.submit
    // Served config (assets/excel2erp.yaml) has: submit: "Generar Archivo ERP"
    const downloadBtn = page.locator('.btn-confirm');
    await expect(downloadBtn).toBeVisible();

    // Get button text
    const buttonText = await downloadBtn.textContent();

    // Should contain the label from config (not hardcoded "Download ZIP")
    expect(buttonText).toContain('Generar Archivo ERP');

    // Should NOT contain hardcoded "Download ZIP"
    expect(buttonText).not.toContain('Download ZIP');
  });

  test('initial submit button uses config submit label', async ({ page }) => {
    await page.goto('/');

    // Select source but don't upload file yet
    await ui.selectSource(page, 'uber-gross');

    // Initial submit button (before preview) should use config label
    // Served config has: submit: "Generar Archivo ERP"
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();

    const buttonText = await submitBtn.textContent();

    // Should contain label from config
    expect(buttonText).toContain('Generar Archivo ERP');
  });

});
