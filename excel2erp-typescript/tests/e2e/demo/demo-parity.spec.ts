import { test, expect } from '@playwright/test';
import path from 'path';
import JSZip from 'jszip';
import { normalizeContent, validateFilename } from '../../helpers/normalize.ts';
import { DEMO_USER_INPUTS, DEMO_FILENAME_PATTERNS, DEMO_SOURCES } from '../../fixtures/demo-inputs.ts';
import { ui } from '../../helpers/e2e-ui.ts';
import { getDirname } from '../../helpers/paths.ts';

const __dirname = getDirname(import.meta.url);

/**
 * Demo tests for the Rey Pepinito scenario.
 *
 * These tests use public, fictional test data that ships with the repository.
 * They verify the Excel processing pipeline works correctly with the demo config.
 *
 * Run with: bun run test:e2e:demo
 */

test.describe('Demo: Rey Pepinito Excel Processing', () => {

  for (const { name: sourceName, file: excelFile } of DEMO_SOURCES) {
    test(`${sourceName}: processes Excel and generates ZIP`, async ({ page }) => {
      await page.goto('/');

      // Select source
      await ui.selectSource(page, sourceName);

      // Fill user inputs (if any for this source)
      const userInputs = DEMO_USER_INPUTS[sourceName] ?? {};
      for (const [field, value] of Object.entries(userInputs)) {
        await ui.fillInput(page, field, value);
      }

      // Upload Excel file
      const filePath = path.join(__dirname, `../../fixtures/demo/excel/${excelFile}`);

      // Process and download
      const downloadPromise = page.waitForEvent('download');
      await ui.uploadFile(page, filePath);
      await ui.confirmDownload(page);
      const download = await downloadPromise;

      // Validate filename pattern
      const filename = download.suggestedFilename();
      const pattern = DEMO_FILENAME_PATTERNS[sourceName];
      if (pattern) {
        const filenameCheck = validateFilename(filename, pattern);
        expect(filenameCheck.valid, filenameCheck.message).toBe(true);
      }

      // Read and verify ZIP contents
      const zipBuffer = await streamToBuffer(await download.createReadStream());
      const zip = await JSZip.loadAsync(zipBuffer);

      const headerContent = await zip.file('cabecera.txt')?.async('string');
      const detailContent = await zip.file('detalle.txt')?.async('string');

      expect(headerContent, 'cabecera.txt should exist in ZIP').toBeDefined();
      expect(detailContent, 'detalle.txt should exist in ZIP').toBeDefined();

      // Normalize and snapshot
      const normalizedHeader = normalizeContent(headerContent!);
      const normalizedDetail = normalizeContent(detailContent!);

      expect(normalizedHeader).toMatchSnapshot(`${sourceName}-cabecera.txt`);
      expect(normalizedDetail).toMatchSnapshot(`${sourceName}-detalle.txt`);
    });
  }
});

test.describe('Demo: UI Behavior', () => {

  test('shows preview before download', async ({ page }) => {
    await page.goto('/');
    await ui.selectSource(page, 'uber-gross');

    const filePath = path.join(__dirname, '../../fixtures/demo/excel/uber-gross.xlsx');

    await ui.uploadFile(page, filePath);
    await ui.waitForPreview(page);

    // Verify preview shows data
    const previewCard = page.locator('.preview-card');
    await expect(previewCard).toBeVisible();

    // Header section should be visible
    const headerSection = previewCard.locator('.preview-section').first();
    await expect(headerSection).toBeVisible();
  });

  test('shows success message after download', async ({ page }) => {
    await page.goto('/');
    await ui.selectSource(page, 'uber-gross');

    const filePath = path.join(__dirname, '../../fixtures/demo/excel/uber-gross.xlsx');

    const downloadPromise = page.waitForEvent('download');
    await ui.uploadFile(page, filePath);
    await ui.confirmDownload(page);
    await downloadPromise;

    const successBox = page.locator('.message-box.success');
    await expect(successBox).toBeVisible({ timeout: 5000 });
  });

  test('clears state when changing source', async ({ page }) => {
    await page.goto('/');

    // Select first source and process
    await ui.selectSource(page, 'uber-gross');
    const filePath = path.join(__dirname, '../../fixtures/demo/excel/uber-gross.xlsx');

    const downloadPromise = page.waitForEvent('download');
    await ui.uploadFile(page, filePath);
    await ui.confirmDownload(page);
    await downloadPromise;

    // Success should be visible
    const successBox = page.locator('.message-box.success');
    await expect(successBox).toBeVisible({ timeout: 5000 });

    // Change source - success should clear
    await ui.selectSource(page, 'cascabel');
    await expect(successBox).toBeHidden({ timeout: 2000 });
  });
});

/**
 * Convert a ReadableStream to Buffer
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
