/**
 * Sheet Utility Functions Tests
 *
 * Tests for pure functions that process Excel sheet data.
 */

import { describe, it, expect } from 'vitest';
import {
  type CellValue,
  COLUMN_MIN_WIDTH,
  COLUMN_MAX_WIDTH,
  COLUMN_CHAR_WIDTH,
  extractSheetData,
  calculateColumnWidths,
  isCellEmpty,
  getVisibleData,
} from '../../../src/editor/sheet-utils';

// Mock ExcelSheet for testing
function createMockSheet(data: (string | number)[][]): {
  readCellByIndex: (row: number, col: number) => string | number;
} {
  return {
    readCellByIndex: (row: number, col: number) => {
      if (row >= data.length) return '';
      if (col >= (data[row]?.length ?? 0)) return '';
      return data[row][col] ?? '';
    },
  };
}

describe('extractSheetData', () => {
  it('extracts data from sheet', () => {
    const mockSheet = createMockSheet([
      ['A1', 'B1', 'C1'],
      ['A2', 'B2', 'C2'],
      ['A3', 'B3', 'C3'],
    ]);

    const result = extractSheetData(mockSheet as any, 50);

    expect(result.rows).toBe(3);
    expect(result.cols).toBe(3);
    expect(result.data[0]).toEqual(['A1', 'B1', 'C1']);
    expect(result.data[1]).toEqual(['A2', 'B2', 'C2']);
    expect(result.data[2]).toEqual(['A3', 'B3', 'C3']);
  });

  it('stops at first empty row', () => {
    const mockSheet = createMockSheet([
      ['A1', 'B1'],
      ['A2', 'B2'],
      ['', ''],
      ['A4', 'B4'],
    ]);

    const result = extractSheetData(mockSheet as any, 50);

    expect(result.rows).toBe(2);
    expect(result.data.length).toBe(2);
  });

  it('respects maxRows limit', () => {
    const mockSheet = createMockSheet([
      ['A1'], ['A2'], ['A3'], ['A4'], ['A5'],
      ['A6'], ['A7'], ['A8'], ['A9'], ['A10'],
    ]);

    const result = extractSheetData(mockSheet as any, 5);

    expect(result.rows).toBe(5);
  });

  it('handles numeric values', () => {
    const mockSheet = createMockSheet([
      [100, 200, 300],
      [1.5, 2.5, 3.5],
    ]);

    const result = extractSheetData(mockSheet as any, 50);

    expect(result.data[0]).toEqual([100, 200, 300]);
    expect(result.data[1]).toEqual([1.5, 2.5, 3.5]);
  });

  it('trims rows to actual column extent', () => {
    const mockSheet = createMockSheet([
      ['A1', 'B1', '', '', ''],
      ['A2', '', '', '', ''],
    ]);

    const result = extractSheetData(mockSheet as any, 50);

    expect(result.cols).toBe(2);
    expect(result.data[0].length).toBe(2);
    expect(result.data[1].length).toBe(2);
  });

  it('handles empty sheet', () => {
    const mockSheet = createMockSheet([['', '']]);

    const result = extractSheetData(mockSheet as any, 50);

    // First row is kept even if empty
    expect(result.rows).toBe(1);
    expect(result.cols).toBe(1); // Default to at least column 0
  });

  it('handles sparse data', () => {
    const mockSheet = createMockSheet([
      ['', '', 'C1'],
      ['', '', 'C2'],
    ]);

    const result = extractSheetData(mockSheet as any, 50);

    expect(result.cols).toBe(3);
    expect(result.data[0]).toEqual(['', '', 'C1']);
  });
});

describe('calculateColumnWidths', () => {
  it('calculates widths based on content length', () => {
    const data: CellValue[][] = [
      ['A', 'BB', 'CCC'],
      ['X', 'YY', 'ZZZ'],
    ];

    const widths = calculateColumnWidths(data, 3);

    expect(widths.length).toBe(3);
    // Width = max(COLUMN_MIN_WIDTH, charLen * COLUMN_CHAR_WIDTH)
    expect(widths[0]).toBe(COLUMN_MIN_WIDTH); // 1 char * 8 = 8, but min is 60
    expect(widths[1]).toBe(COLUMN_MIN_WIDTH); // 2 chars * 8 = 16, but min is 60
    expect(widths[2]).toBe(COLUMN_MIN_WIDTH); // 3 chars * 8 = 24, but min is 60
  });

  it('respects minimum width', () => {
    const data: CellValue[][] = [['A']];

    const widths = calculateColumnWidths(data, 1);

    expect(widths[0]).toBe(COLUMN_MIN_WIDTH);
  });

  it('respects maximum width', () => {
    const data: CellValue[][] = [
      ['A'.repeat(100)], // Very long content
    ];

    const widths = calculateColumnWidths(data, 1);

    expect(widths[0]).toBe(COLUMN_MAX_WIDTH);
  });

  it('uses longest cell value in column', () => {
    const data: CellValue[][] = [
      ['A'],
      ['BB'],
      ['CCCCCCCCCCCCCCCCCCC'], // 19 chars * 8 = 152px
      ['D'],
    ];

    const widths = calculateColumnWidths(data, 1);

    expect(widths[0]).toBe(19 * COLUMN_CHAR_WIDTH); // 152px
  });

  it('handles empty cells', () => {
    const data: CellValue[][] = [
      ['', 'B'],
      ['A', ''],
    ];

    const widths = calculateColumnWidths(data, 2);

    expect(widths[0]).toBe(COLUMN_MIN_WIDTH);
    expect(widths[1]).toBe(COLUMN_MIN_WIDTH);
  });

  it('handles numeric values', () => {
    const data: CellValue[][] = [
      [12345, 1.23456789],
    ];

    const widths = calculateColumnWidths(data, 2);

    // 12345 = 5 chars, 1.23456789 = 10 chars
    expect(widths[0]).toBe(COLUMN_MIN_WIDTH); // 5 * 8 = 40 < 60
    expect(widths[1]).toBe(10 * COLUMN_CHAR_WIDTH); // 80px
  });

  it('handles empty data array', () => {
    const widths = calculateColumnWidths([], 3);

    expect(widths.length).toBe(3);
    expect(widths[0]).toBe(COLUMN_MIN_WIDTH); // minimum for column letter
  });

  it('handles jagged arrays', () => {
    const data: CellValue[][] = [
      ['A', 'B', 'C'],
      ['X'], // shorter row
    ];

    const widths = calculateColumnWidths(data, 3);

    expect(widths.length).toBe(3);
    expect(widths[2]).toBe(COLUMN_MIN_WIDTH);
  });
});

describe('isCellEmpty', () => {
  it('returns true for empty string', () => {
    expect(isCellEmpty('')).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isCellEmpty(undefined)).toBe(true);
  });

  it('returns false for non-empty string', () => {
    expect(isCellEmpty('value')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isCellEmpty(42)).toBe(false);
  });

  it('returns false for zero', () => {
    expect(isCellEmpty(0)).toBe(false);
  });

  it('returns false for whitespace string', () => {
    // Note: whitespace is NOT empty
    expect(isCellEmpty(' ')).toBe(false);
  });
});

describe('getVisibleData', () => {
  const testData: CellValue[][] = [
    ['Row0'],
    ['Row1'],
    ['Row2'],
    ['Row3'],
    ['Row4'],
    ['Row5'],
  ];

  it('returns slice from start', () => {
    const visible = getVisibleData(testData, 0, 3);

    expect(visible.length).toBe(3);
    expect(visible[0]).toEqual(['Row0']);
    expect(visible[2]).toEqual(['Row2']);
  });

  it('returns slice from middle', () => {
    const visible = getVisibleData(testData, 2, 3);

    expect(visible.length).toBe(3);
    expect(visible[0]).toEqual(['Row2']);
    expect(visible[2]).toEqual(['Row4']);
  });

  it('handles end of data', () => {
    const visible = getVisibleData(testData, 4, 3);

    expect(visible.length).toBe(2); // Only Row4, Row5 available
    expect(visible[0]).toEqual(['Row4']);
    expect(visible[1]).toEqual(['Row5']);
  });

  it('handles start beyond data', () => {
    const visible = getVisibleData(testData, 10, 3);

    expect(visible.length).toBe(0);
  });

  it('handles empty data', () => {
    const visible = getVisibleData([], 0, 3);

    expect(visible.length).toBe(0);
  });
});

describe('constants', () => {
  it('exports expected constants', () => {
    expect(COLUMN_MIN_WIDTH).toBe(60);
    expect(COLUMN_MAX_WIDTH).toBe(200);
    expect(COLUMN_CHAR_WIDTH).toBe(8);
  });
});
