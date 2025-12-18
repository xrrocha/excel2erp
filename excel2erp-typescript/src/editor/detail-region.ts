/**
 * Detail Region Computation
 *
 * Pure functions for computing detail region bounds from sheet data.
 * Extracted from EditorState for testability and reduced complexity.
 */

import { parseCellAddress } from '../shared/excel/reader';

/**
 * Cell value type for Excel grid
 */
export type CellValue = string | number;

/**
 * Detail region bounds
 */
export interface DetailRegion {
  startRow: number;   // 0-based row index
  startCol: number;   // 0-based column index
  endRow: number;     // 0-based row index (exclusive)
  endCol: number;     // 0-based column index (exclusive)
}

/**
 * Check if a cell value is empty (empty string or undefined).
 */
function isEmpty(value: CellValue | undefined): boolean {
  return value === '' || value === undefined;
}

/**
 * Count contiguous non-empty columns starting from a given column.
 *
 * @param rowData - Array of cell values for the row
 * @param startCol - 0-based column index to start from
 * @returns Number of contiguous non-empty columns
 */
export function countContiguousColumns(rowData: CellValue[], startCol: number): number {
  let count = 0;
  for (let col = startCol; col < rowData.length; col++) {
    if (isEmpty(rowData[col])) break;
    count++;
  }
  return count;
}

/**
 * Find the first non-empty column in a row.
 *
 * @param rowData - Array of cell values for the row
 * @returns 0-based column index, or -1 if row is empty
 */
export function findFirstNonEmptyColumn(rowData: CellValue[]): number {
  for (let col = 0; col < rowData.length; col++) {
    if (!isEmpty(rowData[col])) {
      return col;
    }
  }
  return -1;
}

/**
 * Compute the detail region bounds from sheet data and a locator string.
 *
 * The detail region is a rectangular area:
 * - Starts at the cell specified by the locator
 * - Extends horizontally until the first empty cell in the header row
 * - Extends vertically until the first completely empty row within the columns
 *
 * @param sheetData - 2D array of cell values
 * @param locator - Cell address string (e.g., "A7")
 * @returns DetailRegion bounds, or null if locator is invalid/empty
 */
export function computeDetailRegion(
  sheetData: CellValue[][],
  locator: string | undefined
): DetailRegion | null {
  if (!locator) return null;

  let parsed: { row: number; col: number };
  try {
    parsed = parseCellAddress(locator);
  } catch {
    return null;
  }

  const startRow = parsed.row;
  const startCol = parsed.col;

  // Validate start cell is within data bounds
  if (startRow >= sheetData.length) return null;

  const headerRowData = sheetData[startRow] || [];

  // Find horizontal extent: count contiguous columns from start
  const colCount = countContiguousColumns(headerRowData, startCol);
  if (colCount === 0) return null;

  const endCol = startCol + colCount;

  // Find vertical extent: scan until first empty row within detail columns
  let endRow = startRow + 1; // At minimum, include just the header row
  for (let row = startRow + 1; row < sheetData.length; row++) {
    const rowData = sheetData[row] || [];

    // Check if all cells in the detail columns are empty
    let hasData = false;
    for (let col = startCol; col < endCol; col++) {
      if (!isEmpty(rowData[col])) {
        hasData = true;
        break;
      }
    }

    if (!hasData) break;
    endRow = row + 1;
  }

  return { startRow, startCol, endRow, endCol };
}

/**
 * Check if a cell position is within a detail region.
 */
export function isInDetailRegion(
  region: DetailRegion | null,
  row: number,
  col: number
): boolean {
  if (!region) return false;

  return (
    row >= region.startRow &&
    row < region.endRow &&
    col >= region.startCol &&
    col < region.endCol
  );
}

/**
 * Check if a column index is within the detail region's column range.
 */
export function isDetailColumn(region: DetailRegion | null, col: number): boolean {
  if (!region) return false;
  return col >= region.startCol && col < region.endCol;
}
