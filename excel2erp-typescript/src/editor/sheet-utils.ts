/**
 * Sheet Utility Functions
 *
 * Pure functions for processing Excel sheet data.
 * Extracted from EditorState for testability and reduced complexity.
 */

import type { ExcelSheet } from '../shared/excel/reader';

/**
 * Cell value type for Excel grid
 */
export type CellValue = string | number;

/**
 * Extracted sheet data with dimensions
 */
export interface SheetData {
  data: CellValue[][];
  rows: number;
  cols: number;
}

/**
 * Column width calculation constants
 */
export const COLUMN_MIN_WIDTH = 60;
export const COLUMN_MAX_WIDTH = 200;
export const COLUMN_CHAR_WIDTH = 8;

/**
 * Extract sheet data as a 2D array, limited to a maximum number of rows.
 * Stops at the first completely empty row.
 *
 * @param sheet - ExcelSheet to read from
 * @param maxRows - Maximum rows to read
 * @param maxCols - Maximum columns to scan (default 26 = A-Z)
 * @returns SheetData with data array and dimensions
 */
export function extractSheetData(
  sheet: ExcelSheet,
  maxRows: number,
  maxCols: number = 26
): SheetData {
  const data: CellValue[][] = [];
  let maxColFound = 0;

  for (let row = 0; row < maxRows; row++) {
    const rowData: CellValue[] = [];
    let hasData = false;

    for (let col = 0; col < maxCols; col++) {
      const value = sheet.readCellByIndex(row, col);
      rowData.push(value);
      if (value !== '') {
        hasData = true;
        maxColFound = Math.max(maxColFound, col);
      }
    }

    // Stop at first completely empty row (after row 0)
    if (!hasData && row > 0) {
      break;
    }

    // Trim row to actual column extent
    data.push(rowData.slice(0, maxColFound + 1));
  }

  return {
    data,
    rows: data.length,
    cols: maxColFound + 1,
  };
}

/**
 * Calculate column widths based on content.
 * Width is proportional to the longest cell value in each column.
 *
 * @param data - 2D array of cell values
 * @param colCount - Number of columns
 * @returns Array of pixel widths for each column
 */
export function calculateColumnWidths(data: CellValue[][], colCount: number): number[] {
  const widths: number[] = [];

  for (let col = 0; col < colCount; col++) {
    let maxLen = 2; // Minimum for column letter (A, B, etc.)

    for (const row of data) {
      if (col < row.length) {
        const cellLen = String(row[col]).length;
        maxLen = Math.max(maxLen, cellLen);
      }
    }

    const width = Math.min(
      COLUMN_MAX_WIDTH,
      Math.max(COLUMN_MIN_WIDTH, maxLen * COLUMN_CHAR_WIDTH)
    );
    widths.push(width);
  }

  return widths;
}

/**
 * Check if a cell value is empty.
 */
export function isCellEmpty(value: CellValue | undefined): boolean {
  return value === '' || value === undefined;
}

/**
 * Get visible slice of sheet data for display.
 *
 * @param data - Full sheet data
 * @param startRow - First row to show (0-based)
 * @param visibleRowCount - Number of rows to show
 * @returns Slice of data for display
 */
export function getVisibleData(
  data: CellValue[][],
  startRow: number,
  visibleRowCount: number
): CellValue[][] {
  const endRow = Math.min(startRow + visibleRowCount, data.length);
  return data.slice(startRow, endRow);
}
