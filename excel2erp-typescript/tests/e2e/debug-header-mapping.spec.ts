/**
 * Bug #2 Regression Test: Header field remapping
 *
 * Verifies that already-mapped header fields CAN be remapped to different cells.
 * The bug was: buttons for mapped fields were disabled, preventing remapping.
 *
 * Test scenario:
 * 1. Load SuperMaxi source (DocDate mapped to D2)
 * 2. Click cell E2 (different cell)
 * 3. Click DocDate button to remap it from D2 → E2
 * 4. Verify mapping changed
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const LEGACY_EDITOR = path.join(projectRoot, 'legacy/excel2erp-editor.html');
const LEGACY_CONFIG = path.join(projectRoot, 'legacy/embedded-excel2erp.yaml');
const LEGACY_EXCEL = path.join(projectRoot, 'legacy/data/pedido-supermaxi.xlsx');

test('header field remapping: can remap DocDate from D2 to E2', async ({ page }) => {
  test.setTimeout(60000);

  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Setup: Load editor, config, source, and Excel
  await page.goto(`file://${LEGACY_EDITOR}`);
  await page.waitForTimeout(1000);

  await page.locator('input[type="file"][accept*=".yaml"]').setInputFiles(LEGACY_CONFIG);
  await page.waitForTimeout(1000);

  await page.locator('text=SuperMaxi').first().click();
  await page.waitForTimeout(500);

  await page.locator('input[type="file"][accept*=".xls"]').setInputFiles(LEGACY_EXCEL);
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'test-results/remap-step1-setup.png', fullPage: true });

  // Verify initial state: DocDate is mapped to D2
  const headerMappings = page.locator('.mapping-item').filter({ hasText: 'DocDate' });
  const initialMapping = await headerMappings.locator('.mapping-locator').textContent();
  console.log(`Initial DocDate mapping: ${initialMapping}`);
  expect(initialMapping).toBe('D2');

  // Step 1: Click cell E2 (column E, row 2) to open popup
  const tableRows = page.locator('.excel-grid tbody tr');
  const row2 = tableRows.nth(1);
  const cellE2 = row2.locator('td').nth(5); // 0=row-header, 1=A, 2=B, 3=C, 4=D, 5=E
  const cellE2Value = await cellE2.textContent({ timeout: 5000 });
  console.log(`Clicking cell E2 with value: "${cellE2Value}"`);
  await cellE2.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'test-results/remap-step2-popup-open.png', fullPage: true });

  // Step 2: Verify popup is showing and DocDate button exists
  const popup = page.locator('.popup');
  await expect(popup).toBeVisible({ timeout: 5000 });

  const docDateBtn = popup.locator('.popup-field-btn').filter({ hasText: 'DocDate' });
  await expect(docDateBtn).toBeVisible();

  // Step 3: Verify button is NOT disabled
  const isDisabled = await docDateBtn.isDisabled();
  console.log(`DocDate button disabled: ${isDisabled}`);
  expect(isDisabled).toBe(false);

  // Check for pointer-events CSS that might block clicks
  const pointerEvents = await docDateBtn.evaluate(el => window.getComputedStyle(el).pointerEvents);
  console.log(`DocDate button pointer-events: ${pointerEvents}`);
  expect(pointerEvents).not.toBe('none');

  // Check button classes (should NOT have 'mapped' class that disables it)
  const btnClasses = await docDateBtn.getAttribute('class');
  console.log(`DocDate button classes: ${btnClasses}`);

  // Step 4: Click DocDate to remap it from D2 → E2
  console.log('Clicking DocDate button to remap...');
  await docDateBtn.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'test-results/remap-step3-after-click.png', fullPage: true });

  // Step 5: Verify popup closed (indicates click was processed)
  await expect(popup).not.toBeVisible({ timeout: 5000 });

  // Step 6: Verify mapping changed from D2 to E2
  const newMapping = await headerMappings.locator('.mapping-locator').textContent();
  console.log(`New DocDate mapping: ${newMapping}`);
  expect(newMapping).toBe('E2');

  await page.screenshot({ path: 'test-results/remap-step4-final.png', fullPage: true });

  // Print logs
  console.log('\n=== Console Logs ===');
  consoleLogs.forEach(log => console.log(log));

  // Verify assignToHeaderField was called
  const wasCalled = consoleLogs.some(log => log.includes('assignToHeaderField'));
  expect(wasCalled).toBe(true);
});
