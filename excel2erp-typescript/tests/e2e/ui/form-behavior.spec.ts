import { test, expect } from '@playwright/test';
import path from 'path';
import { ui } from '../../helpers/e2e-ui.ts';
import { getDirname } from '../../helpers/paths.ts';

const __dirname = getDirname(import.meta.url);

/**
 * Form Behavior Tests
 *
 * Tests for form state management:
 * 1. Form clears after successful download (ready for next file)
 * 2. Submit button disabled when there are errors
 */

test.describe('Form Behavior: Clear after download', () => {

  test('clears form fields after successful download', async ({ page }) => {
    await page.goto('/');

    // Select source that requires user input (uber-gross needs nothing, use el-dorado)
    await ui.selectSource(page, 'el-dorado');

    // Fill user input field
    await ui.fillInput(page, 'DocDueDate', '20240215');

    // Upload file and process
    const filePath = path.join(__dirname, '../../fixtures/demo/excel/el-dorado.xlsx');
    const downloadPromise = page.waitForEvent('download');
    await ui.uploadFile(page, filePath);
    await ui.confirmDownload(page);
    await downloadPromise;

    // Verify success message is shown
    const successBox = page.locator('.message-box.success');
    await expect(successBox).toBeVisible({ timeout: 5000 });

    // Verify form fields are cleared
    const docDueDateInput = page.locator('input[name="DocDueDate"]');
    await expect(docDueDateInput).toHaveValue('');

    // Verify file input is cleared (shows "Choose file" text, not filename)
    // Use more specific selector to avoid config file picker
    const fileWrapper = page.locator('.file-input-wrapper').filter({ hasText: '.xls' });
    await expect(fileWrapper).not.toHaveClass(/has-file/);

    // Verify source selection is preserved
    const sourceSelect = page.locator('select[name="source"]');
    await expect(sourceSelect).toHaveValue('el-dorado');
  });

  test('clears all user input fields after download', async ({ page }) => {
    await page.goto('/');

    // Use la-nanita which requires multiple user inputs
    await ui.selectSource(page, 'la-nanita');

    // Fill all required fields
    await ui.fillInput(page, 'DocDate', '20240201');
    await ui.fillInput(page, 'DocDueDate', '20240215');
    await ui.fillInput(page, 'NumAtCard', 'TEST-001');

    // Upload and download
    const filePath = path.join(__dirname, '../../fixtures/demo/excel/la-nanita.xlsx');
    const downloadPromise = page.waitForEvent('download');
    await ui.uploadFile(page, filePath);
    await ui.confirmDownload(page);
    await downloadPromise;

    // All fields should be cleared
    await expect(page.locator('input[name="DocDate"]')).toHaveValue('');
    await expect(page.locator('input[name="DocDueDate"]')).toHaveValue('');
    await expect(page.locator('input[name="NumAtCard"]')).toHaveValue('');
  });

});

test.describe('Form Behavior: Button disabled on errors', () => {

  test('submit button disabled when no file selected', async ({ page }) => {
    await page.goto('/');

    await ui.selectSource(page, 'uber-gross');

    // Button should be disabled without file
    const submitBtn = ui.getSubmitButton(page);
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button disabled after file validation error', async ({ page }) => {
    await page.goto('/');

    // Select one source
    await ui.selectSource(page, 'cascabel');
    await ui.fillInput(page, 'DocDueDate', '20240215');

    // Upload WRONG file (el-dorado file for cascabel source)
    const wrongFilePath = path.join(__dirname, '../../fixtures/demo/excel/el-dorado.xlsx');
    await ui.uploadFile(page, wrongFilePath);

    // Wait for error to appear
    const errorBox = page.locator('.message-box.error');
    await expect(errorBox).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled due to error
    const submitBtn = ui.getSubmitButton(page);
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button enabled after selecting correct file', async ({ page }) => {
    await page.goto('/');

    await ui.selectSource(page, 'cascabel');
    await ui.fillInput(page, 'DocDueDate', '20240215');

    // First upload wrong file
    const wrongFilePath = path.join(__dirname, '../../fixtures/demo/excel/el-dorado.xlsx');
    await ui.uploadFile(page, wrongFilePath);

    // Wait for error
    const errorBox = page.locator('.message-box.error');
    await expect(errorBox).toBeVisible({ timeout: 5000 });

    // Button should be disabled
    const submitBtn = ui.getSubmitButton(page);
    await expect(submitBtn).toBeDisabled();

    // Now upload correct file
    const correctFilePath = path.join(__dirname, '../../fixtures/demo/excel/cascabel.xlsx');
    await ui.uploadFile(page, correctFilePath);

    // Wait for preview (success)
    await ui.waitForPreview(page);

    // Error should be gone, download button should appear
    await expect(errorBox).toBeHidden();
    const downloadBtn = page.locator('.btn-confirm');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();
  });

});
