/**
 * Detail Region Computation Tests
 *
 * Tests for pure functions that compute detail region bounds.
 */

import { describe, it, expect } from 'vitest';
import {
  type CellValue,
  type DetailRegion,
  countContiguousColumns,
  findFirstNonEmptyColumn,
  computeDetailRegion,
  isInDetailRegion,
  isDetailColumn,
} from '../../../src/editor/detail-region';

describe('countContiguousColumns', () => {
  it('counts columns until first empty cell', () => {
    const row: CellValue[] = ['A', 'B', 'C', '', 'E'];
    expect(countContiguousColumns(row, 0)).toBe(3);
  });

  it('counts from specified start column', () => {
    const row: CellValue[] = ['', 'A', 'B', 'C', ''];
    expect(countContiguousColumns(row, 1)).toBe(3);
  });

  it('returns 0 for empty start cell', () => {
    const row: CellValue[] = ['', 'A', 'B'];
    expect(countContiguousColumns(row, 0)).toBe(0);
  });

  it('counts to end if no empty cell', () => {
    const row: CellValue[] = ['A', 'B', 'C'];
    expect(countContiguousColumns(row, 0)).toBe(3);
  });

  it('handles numeric values', () => {
    const row: CellValue[] = [1, 2, 3, '', 5];
    expect(countContiguousColumns(row, 0)).toBe(3);
  });

  it('handles mixed string and number', () => {
    const row: CellValue[] = ['Code', 123, 'Name', ''];
    expect(countContiguousColumns(row, 0)).toBe(3);
  });

  it('treats 0 as non-empty', () => {
    const row: CellValue[] = [0, '', 'A'];
    expect(countContiguousColumns(row, 0)).toBe(1);
  });

  it('handles start beyond array bounds', () => {
    const row: CellValue[] = ['A', 'B'];
    expect(countContiguousColumns(row, 10)).toBe(0);
  });
});

describe('findFirstNonEmptyColumn', () => {
  it('finds first non-empty column', () => {
    const row: CellValue[] = ['', '', 'A', 'B'];
    expect(findFirstNonEmptyColumn(row)).toBe(2);
  });

  it('returns 0 if first cell is non-empty', () => {
    const row: CellValue[] = ['A', 'B', 'C'];
    expect(findFirstNonEmptyColumn(row)).toBe(0);
  });

  it('returns -1 for completely empty row', () => {
    const row: CellValue[] = ['', '', ''];
    expect(findFirstNonEmptyColumn(row)).toBe(-1);
  });

  it('returns -1 for empty array', () => {
    expect(findFirstNonEmptyColumn([])).toBe(-1);
  });

  it('treats 0 as non-empty', () => {
    const row: CellValue[] = ['', 0, 'A'];
    expect(findFirstNonEmptyColumn(row)).toBe(1);
  });
});

describe('computeDetailRegion', () => {
  // Helper to create test sheet data
  const createSheet = (rows: (string | number)[][]): CellValue[][] => rows;

  describe('basic functionality', () => {
    it('computes region from simple table', () => {
      const sheet = createSheet([
        ['', '', '', ''],           // row 0
        ['', 'H1', 'H2', 'H3', ''], // row 1: header
        ['', 'D1', 'D2', 'D3', ''], // row 2: data
        ['', 'D4', 'D5', 'D6', ''], // row 3: data
        ['', '', '', '', ''],       // row 4: empty
      ]);

      const region = computeDetailRegion(sheet, 'B2');

      expect(region).toEqual({
        startRow: 1,
        startCol: 1,
        endRow: 4,   // exclusive (rows 1, 2, 3)
        endCol: 4,   // exclusive (cols 1, 2, 3)
      });
    });

    it('handles table starting at A1', () => {
      const sheet = createSheet([
        ['Code', 'Name', 'Qty', ''],
        ['A001', 'Item', 10, ''],
        ['A002', 'Item', 20, ''],
        ['', '', '', ''],
      ]);

      const region = computeDetailRegion(sheet, 'A1');

      expect(region).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 3,
        endCol: 3,
      });
    });

    it('handles single-column table', () => {
      const sheet = createSheet([
        ['Code', ''],
        ['A001', ''],
        ['A002', ''],
        ['', ''],
      ]);

      const region = computeDetailRegion(sheet, 'A1');

      expect(region).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 3,
        endCol: 1,
      });
    });

    it('handles single-row table (header only)', () => {
      const sheet = createSheet([
        ['H1', 'H2', 'H3', ''],
        ['', '', '', ''],
      ]);

      const region = computeDetailRegion(sheet, 'A1');

      expect(region).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 1,
        endCol: 3,
      });
    });
  });

  describe('boundary detection', () => {
    it('stops at first empty column in header', () => {
      const sheet = createSheet([
        ['H1', 'H2', '', 'H4'],
        ['D1', 'D2', 'D3', 'D4'],
      ]);

      const region = computeDetailRegion(sheet, 'A1');

      expect(region?.endCol).toBe(2); // Only H1, H2
    });

    it('stops at first completely empty row', () => {
      const sheet = createSheet([
        ['H1', 'H2'],
        ['D1', 'D2'],
        ['', ''],     // Empty row stops here
        ['D3', 'D4'], // Not included
      ]);

      const region = computeDetailRegion(sheet, 'A1');

      expect(region?.endRow).toBe(2); // Only rows 0, 1
    });

    it('continues if only some columns in row are empty', () => {
      const sheet = createSheet([
        ['H1', 'H2', 'H3'],
        ['D1', '', 'D3'],   // Row has data in some columns
        ['D4', 'D5', 'D6'],
        ['', '', ''],       // Completely empty
      ]);

      const region = computeDetailRegion(sheet, 'A1');

      expect(region?.endRow).toBe(3); // Rows 0, 1, 2
    });
  });

  describe('edge cases', () => {
    it('returns null for empty locator', () => {
      const sheet = createSheet([['A', 'B']]);
      expect(computeDetailRegion(sheet, '')).toBeNull();
    });

    it('returns null for undefined locator', () => {
      const sheet = createSheet([['A', 'B']]);
      expect(computeDetailRegion(sheet, undefined)).toBeNull();
    });

    it('returns null for invalid locator format', () => {
      const sheet = createSheet([['A', 'B']]);
      expect(computeDetailRegion(sheet, 'invalid')).toBeNull();
    });

    it('returns null if start row is beyond sheet', () => {
      const sheet = createSheet([['A', 'B']]);
      expect(computeDetailRegion(sheet, 'A100')).toBeNull();
    });

    it('returns null if start cell is empty', () => {
      const sheet = createSheet([
        ['', 'B', 'C'],
        ['', 'D', 'E'],
      ]);
      expect(computeDetailRegion(sheet, 'A1')).toBeNull();
    });

    it('handles empty sheet', () => {
      expect(computeDetailRegion([], 'A1')).toBeNull();
    });

    it('handles sheet with undefined rows', () => {
      const sheet: CellValue[][] = [];
      sheet[5] = ['A', 'B'];
      expect(computeDetailRegion(sheet, 'A1')).toBeNull();
    });
  });

  describe('numeric cell addresses', () => {
    it('handles double-digit row numbers', () => {
      const sheet: CellValue[][] = [];
      for (let i = 0; i < 15; i++) {
        sheet[i] = i === 10 ? ['H1', 'H2', ''] : ['', '', ''];
      }
      sheet[11] = ['D1', 'D2', ''];
      sheet[12] = ['', '', ''];

      const region = computeDetailRegion(sheet, 'A11');

      expect(region).toEqual({
        startRow: 10,
        startCol: 0,
        endRow: 12,
        endCol: 2,
      });
    });

    it('handles columns beyond A-Z', () => {
      const sheet = createSheet([
        Array(30).fill('H').concat(['']),
        Array(30).fill('D').concat(['']),
        Array(31).fill(''),
      ]);

      const region = computeDetailRegion(sheet, 'A1');

      expect(region?.endCol).toBe(30);
    });
  });
});

describe('isInDetailRegion', () => {
  const region: DetailRegion = {
    startRow: 5,
    startCol: 2,
    endRow: 10,
    endCol: 6,
  };

  it('returns true for cell inside region', () => {
    expect(isInDetailRegion(region, 7, 4)).toBe(true);
  });

  it('returns true for start corner', () => {
    expect(isInDetailRegion(region, 5, 2)).toBe(true);
  });

  it('returns false for end row (exclusive)', () => {
    expect(isInDetailRegion(region, 10, 4)).toBe(false);
  });

  it('returns false for end col (exclusive)', () => {
    expect(isInDetailRegion(region, 7, 6)).toBe(false);
  });

  it('returns false for cell above region', () => {
    expect(isInDetailRegion(region, 4, 4)).toBe(false);
  });

  it('returns false for cell left of region', () => {
    expect(isInDetailRegion(region, 7, 1)).toBe(false);
  });

  it('returns false for null region', () => {
    expect(isInDetailRegion(null, 7, 4)).toBe(false);
  });
});

describe('isDetailColumn', () => {
  const region: DetailRegion = {
    startRow: 5,
    startCol: 2,
    endRow: 10,
    endCol: 6,
  };

  it('returns true for column inside region', () => {
    expect(isDetailColumn(region, 4)).toBe(true);
  });

  it('returns true for start column', () => {
    expect(isDetailColumn(region, 2)).toBe(true);
  });

  it('returns false for end column (exclusive)', () => {
    expect(isDetailColumn(region, 6)).toBe(false);
  });

  it('returns false for column before region', () => {
    expect(isDetailColumn(region, 1)).toBe(false);
  });

  it('returns false for null region', () => {
    expect(isDetailColumn(null, 4)).toBe(false);
  });
});
