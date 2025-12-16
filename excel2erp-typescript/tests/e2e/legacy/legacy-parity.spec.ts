import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Legacy Production Tests
 *
 * Tests for the production embedded build against real customer data.
 * Verifies all 6 test cases (5 customers, coral has .xls and .xlsx variants).
 *
 * Prerequisites:
 * - Run: bun run build:embed legacy/embedded-excel2erp.yaml legacy/embedded-excel2erp.html
 * - Start server: bunx serve legacy -l 5175
 *
 * Expected outputs are in legacy/expected/{customer}/ directories.
 */

// Configure to use legacy embedded build
test.use({
  baseURL: 'http://localhost:5175',
});

/**
 * Test cases: customer name, Excel file, and expected output directory.
 * Coral has both .xls and .xlsx variants to test both formats.
 */
const TEST_CASES = [
  { customer: 'coral', file: 'pedido-coral.xls', expectedDir: 'coral' },
  { customer: 'coral', file: 'pedido-coral.xlsx', expectedDir: 'coral' },
  { customer: 'rosado', file: 'pedido-rosado.xlsx', expectedDir: 'rosado' },
  { customer: 'santamaria', file: 'pedido-santamaria.xlsx', expectedDir: 'santamaria' },
  { customer: 'supermaxi', file: 'pedido-supermaxi.xlsx', expectedDir: 'supermaxi' },
  { customer: 'tia', file: 'pedido-tia.xlsx', expectedDir: 'tia' },
];

/**
 * Fixed user inputs for customers that need manual date entry.
 * Dates use YYYY-MM-DD format for HTML date inputs.
 * (The output will be YYYYMMDD format, handled by the app)
 */
const FIXED_USER_INPUTS: Record<string, Record<string, string>> = {
  coral: {
    DocDueDate: '2025-12-16',
  },
  rosado: {
    DocDueDate: '2025-12-16',
  },
  santamaria: {
    DocDate: '2025-12-16',
    DocDueDate: '2025-12-16',
    NumAtCard: '123456',
  },
  supermaxi: {
    // SuperMaxi extracts all fields from Excel
  },
  tia: {
    DocDate: '2025-12-16',
    DocDueDate: '2025-12-16',
    NumAtCard: '123456',
  },
};

/**
 * UI abstraction for interacting with the embedded app.
 */
const ui = {
  async selectSource(page: Page, sourceName: string) {
    const select = page.locator('select[name="source"], select');
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.selectOption(sourceName);
    await page.waitForTimeout(500);
  },

  async fillUserInputs(page: Page, inputs: Record<string, string>) {
    for (const [name, value] of Object.entries(inputs)) {
      const input = page.locator(`input[name="${name}"]`);
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
  },

  async uploadFile(page: Page, filePath: string) {
    const fileInput = page.locator('input[type="file"][accept*=".xls"]');
    await expect(fileInput).toBeAttached({ timeout: 5000 });
    await fileInput.setInputFiles(filePath);
  },

  async waitForPreview(page: Page) {
    const previewCard = page.locator('.preview-card');
    await expect(previewCard).toBeVisible({ timeout: 10000 });
  },

  async confirmDownload(page: Page) {
    const downloadBtn = page.locator('.btn-confirm');
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
    await downloadBtn.click();
  },
};

/**
 * Normalize content for comparison:
 * - Trim whitespace
 * - Normalize line endings
 * - Handle date field variations (replace dynamic dates with placeholder)
 */
function normalizeContent(content: string, ignoreDates = false): string {
  let normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (ignoreDates) {
    // Replace date-like patterns (YYYYMMDD) with placeholder for comparison
    normalized = normalized.replace(/\b20\d{6}\b/g, 'YYYYMMDD');
  }

  return normalized;
}

/**
 * Load expected output files for a customer.
 */
function loadExpectedOutput(customer: string): { cabecera: string; detalle: string } {
  const expectedDir = path.join(__dirname, '../../../legacy/expected', customer);
  return {
    cabecera: readFileSync(path.join(expectedDir, 'cabecera.txt'), 'utf-8'),
    detalle: readFileSync(path.join(expectedDir, 'detalle.txt'), 'utf-8'),
  };
}

test.describe('Legacy Production: Embedded Build Parity', () => {

  for (const { customer, file, expectedDir } of TEST_CASES) {
    test(`${customer} (${file}): generates correct output`, async ({ page }) => {
      await page.goto('/embedded-excel2erp.html');

      // Wait for app to load (embedded config should be immediate)
      const sourceSelect = page.locator('select[name="source"], select');
      await expect(sourceSelect).toBeVisible({ timeout: 5000 });

      // Select customer
      await ui.selectSource(page, customer);

      // Fill any required user inputs
      const inputs = FIXED_USER_INPUTS[customer] || {};
      await ui.fillUserInputs(page, inputs);

      // Upload Excel file
      const filePath = path.join(__dirname, '../../../legacy/data', file);

      // Set up download capture
      const downloadPromise = page.waitForEvent('download');

      await ui.uploadFile(page, filePath);
      await ui.waitForPreview(page);
      await ui.confirmDownload(page);

      // Wait for download
      const download = await downloadPromise;
      const zipBuffer = await download.path().then(p => readFileSync(p!));

      // Extract ZIP contents
      const zip = await JSZip.loadAsync(zipBuffer);

      // Load expected outputs
      const expected = loadExpectedOutput(expectedDir);

      // Verify cabecera.txt
      const cabeceraFile = zip.file('cabecera.txt');
      expect(cabeceraFile, 'ZIP should contain cabecera.txt').not.toBeNull();
      const cabeceraContent = await cabeceraFile!.async('string');

      // Compare (ignore dates for now as they may vary)
      const normalizedCabecera = normalizeContent(cabeceraContent, true);
      const normalizedExpectedCabecera = normalizeContent(expected.cabecera, true);
      expect(normalizedCabecera).toBe(normalizedExpectedCabecera);

      // Verify detalle.txt
      const detalleFile = zip.file('detalle.txt');
      expect(detalleFile, 'ZIP should contain detalle.txt').not.toBeNull();
      const detalleContent = await detalleFile!.async('string');

      // Detail should match exactly (no dates)
      const normalizedDetalle = normalizeContent(detalleContent);
      const normalizedExpectedDetalle = normalizeContent(expected.detalle);
      expect(normalizedDetalle).toBe(normalizedExpectedDetalle);

      // Verify filename pattern
      const filename = download.suggestedFilename();
      expect(filename).toMatch(new RegExp(`^sap-pedido-${customer}-.+\\.zip$`));
    });
  }

  test('embedded build has no config button', async ({ page }) => {
    await page.goto('/embedded-excel2erp.html');

    // Wait for app to load
    const sourceSelect = page.locator('select[name="source"], select');
    await expect(sourceSelect).toBeVisible({ timeout: 5000 });

    // Config button should be hidden
    const configBtn = page.locator('.header-config-btn');
    await expect(configBtn).toBeHidden();
  });

  test('all logos display as data URLs', async ({ page }) => {
    await page.goto('/embedded-excel2erp.html');

    // Wait for app to load
    const sourceSelect = page.locator('select[name="source"], select');
    await expect(sourceSelect).toBeVisible({ timeout: 5000 });

    // Header logo should be data URL
    const headerLogo = page.locator('.header-logo');
    if (await headerLogo.isVisible()) {
      const src = await headerLogo.getAttribute('src');
      expect(src).toMatch(/^data:image\/(png|jpeg|gif|webp);base64,/);
    }

    // Test each customer's logo
    for (const customer of ['coral', 'rosado', 'santamaria', 'supermaxi', 'tia']) {
      await ui.selectSource(page, customer);

      const customerLogo = page.locator('.customer-logo');
      await expect(customerLogo).toBeVisible({ timeout: 5000 });

      const src = await customerLogo.getAttribute('src');
      expect(src).toMatch(/^data:image\/(png|jpeg|gif|webp);base64,/);
    }
  });

});
