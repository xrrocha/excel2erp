/**
 * Shared E2E UI helpers for Playwright tests.
 *
 * Provides a consistent abstraction for interacting with the Excel2ERP UI.
 */

import { expect, Page, Locator } from '@playwright/test';

/**
 * UI abstraction for interacting with the Excel2ERP app.
 */
export const ui = {
  /**
   * Select source from dropdown and wait for form to load.
   */
  async selectSource(page: Page, sourceName: string): Promise<void> {
    const select = page.locator('select[name="source"], select');
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.selectOption(sourceName);
    await page.waitForTimeout(500);
  },

  /**
   * Fill a named input field.
   * Handles date inputs by converting YYYYMMDD to YYYY-MM-DD format.
   */
  async fillInput(page: Page, fieldName: string, value: string): Promise<void> {
    const input = page.locator(`input[name="${fieldName}"]`);
    await expect(input).toBeVisible({ timeout: 5000 });

    const inputType = await input.getAttribute('type');
    if (inputType === 'date') {
      const formatted = value.length === 8
        ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
        : value;
      await input.fill(formatted);
    } else {
      await input.fill(value);
    }
  },

  /**
   * Fill multiple input fields at once.
   * Skips inputs that are not visible (useful for optional fields).
   */
  async fillUserInputs(page: Page, inputs: Record<string, string>): Promise<void> {
    for (const [name, value] of Object.entries(inputs)) {
      const input = page.locator(`input[name="${name}"]`);
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
  },

  /**
   * Upload an Excel file via the file input.
   */
  async uploadFile(page: Page, filePath: string): Promise<void> {
    const fileInput = page.locator('input[type="file"][accept*=".xls"]');
    await expect(fileInput).toBeAttached({ timeout: 5000 });
    await fileInput.setInputFiles(filePath);
  },

  /**
   * Wait for the preview card to appear.
   */
  async waitForPreview(page: Page): Promise<void> {
    const previewCard = page.locator('.preview-card');
    await expect(previewCard).toBeVisible({ timeout: 5000 });
  },

  /**
   * Click the download/confirm button after preview.
   */
  async confirmDownload(page: Page): Promise<void> {
    const downloadBtn = page.locator('.btn-confirm');
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
    await downloadBtn.click();
  },

  /**
   * Get the submit button locator.
   */
  getSubmitButton(page: Page): Locator {
    return page.locator('button[type="submit"]');
  },

  /**
   * Get the Excel file input locator.
   */
  getFileInput(page: Page): Locator {
    return page.locator('input[type="file"][accept*=".xls"]');
  },
};
