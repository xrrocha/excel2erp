import { test, expect } from '@playwright/test';
import path from 'path';
import { ui } from '../../helpers/e2e-ui.ts';
import { getDirname } from '../../helpers/paths.ts';

const __dirname = getDirname(import.meta.url);

/**
 * i18n Tests: Verify UI text honors configuration
 *
 * Tests that all user-visible text respects the config file's
 * parameters rather than hardcoded English defaults.
 */

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
