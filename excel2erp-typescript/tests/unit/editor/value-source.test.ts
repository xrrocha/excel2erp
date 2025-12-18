/**
 * Value Source Classification Tests
 *
 * Tests for classifyValueSource pure function.
 * This function determines how result properties get their values.
 */

import { describe, it, expect } from 'vitest';
import type { ResultProperty, SourceConfig } from '../../../src/shared/config/types';
import { classifyValueSource } from '../../../src/editor/value-source';

describe('classifyValueSource', () => {
  // Helper to create minimal source configs
  const createSource = (overrides: Partial<SourceConfig> = {}): SourceConfig => ({
    name: 'test-source',
    description: 'Test Source',
    sheetIndex: 0,
    defaultValues: {},
    header: [],
    detail: { locator: 'A1', properties: [] },
    ...overrides,
  });

  describe('constant values', () => {
    it('returns "constant" when property has defaultValue', () => {
      const prop: ResultProperty = { name: 'DocType', defaultValue: '17' };
      const sources = [createSource()];

      expect(classifyValueSource(prop, 'header', sources)).toBe('constant');
    });

    it('returns "constant" for empty string defaultValue', () => {
      const prop: ResultProperty = { name: 'Comments', defaultValue: '' };
      const sources = [createSource()];

      expect(classifyValueSource(prop, 'header', sources)).toBe('constant');
    });

    it('returns "constant" for numeric defaultValue (as string)', () => {
      const prop: ResultProperty = { name: 'LineNum', defaultValue: '0' };
      const sources = [createSource()];

      expect(classifyValueSource(prop, 'detail', sources)).toBe('constant');
    });
  });

  describe('row-index values', () => {
    it('returns "row-index" for ${index} placeholder', () => {
      const prop: ResultProperty = { name: 'LineNum', defaultValue: '${index}' };
      const sources = [createSource()];

      expect(classifyValueSource(prop, 'detail', sources)).toBe('row-index');
    });

    it('prioritizes row-index over constant classification', () => {
      // ${index} is technically a defaultValue, but should be classified as row-index
      const prop: ResultProperty = { name: 'RowNum', defaultValue: '${index}' };
      const sources = [createSource()];

      expect(classifyValueSource(prop, 'detail', sources)).toBe('row-index');
    });
  });

  describe('from-excel values', () => {
    it('returns "from-excel" when header property is extracted from any source', () => {
      const prop: ResultProperty = { name: 'NumAtCard' };
      const sources = [
        createSource({
          header: [{ name: 'NumAtCard', locator: 'B3' }],
        }),
      ];

      expect(classifyValueSource(prop, 'header', sources)).toBe('from-excel');
    });

    it('returns "from-excel" when detail property is extracted from any source', () => {
      const prop: ResultProperty = { name: 'ItemCode' };
      const sources = [
        createSource({
          detail: {
            locator: 'A7',
            properties: [{ name: 'ItemCode', locator: 'CODIGO' }],
          },
        }),
      ];

      expect(classifyValueSource(prop, 'detail', sources)).toBe('from-excel');
    });

    it('returns "from-excel" if at least one source extracts it', () => {
      const prop: ResultProperty = { name: 'DocDate' };
      const sources = [
        createSource({ name: 'source1', header: [] }),
        createSource({
          name: 'source2',
          header: [{ name: 'DocDate', locator: 'C5' }],
        }),
      ];

      expect(classifyValueSource(prop, 'header', sources)).toBe('from-excel');
    });
  });

  describe('per-source values', () => {
    it('returns "per-source" when property has source-specific default', () => {
      const prop: ResultProperty = { name: 'CardCode' };
      const sources = [
        createSource({
          defaultValues: { CardCode: 'C001' },
        }),
      ];

      expect(classifyValueSource(prop, 'header', sources)).toBe('per-source');
    });

    it('returns "per-source" if at least one source has default', () => {
      const prop: ResultProperty = { name: 'SlpCode' };
      const sources = [
        createSource({ name: 'source1', defaultValues: {} }),
        createSource({ name: 'source2', defaultValues: { SlpCode: '42' } }),
      ];

      expect(classifyValueSource(prop, 'header', sources)).toBe('per-source');
    });

    it('prioritizes from-excel over per-source', () => {
      // If a property is both extracted AND has per-source defaults,
      // from-excel wins because extraction is checked first
      const prop: ResultProperty = { name: 'DocDate' };
      const sources = [
        createSource({
          header: [{ name: 'DocDate', locator: 'A1' }],
          defaultValues: { DocDate: '20240101' },
        }),
      ];

      expect(classifyValueSource(prop, 'header', sources)).toBe('from-excel');
    });
  });

  describe('user-input values', () => {
    it('returns "user-input" when property has prompt and no other source', () => {
      const prop: ResultProperty = { name: 'Comments', prompt: 'Enter comments' };
      const sources = [createSource()];

      expect(classifyValueSource(prop, 'header', sources)).toBe('user-input');
    });

    it('prioritizes from-excel over user-input', () => {
      const prop: ResultProperty = { name: 'DocDate', prompt: 'Enter date' };
      const sources = [
        createSource({
          header: [{ name: 'DocDate', locator: 'B2' }],
        }),
      ];

      expect(classifyValueSource(prop, 'header', sources)).toBe('from-excel');
    });
  });

  describe('fallback behavior', () => {
    it('returns "from-excel" as fallback for unmapped fields without prompt', () => {
      const prop: ResultProperty = { name: 'UnknownField' };
      const sources = [createSource()];

      expect(classifyValueSource(prop, 'header', sources)).toBe('from-excel');
    });
  });

  describe('section differentiation', () => {
    it('checks header mappings when section is "header"', () => {
      const prop: ResultProperty = { name: 'NumAtCard' };
      const sources = [
        createSource({
          header: [{ name: 'NumAtCard', locator: 'A1' }],
          detail: { locator: 'B1', properties: [] },
        }),
      ];

      expect(classifyValueSource(prop, 'header', sources)).toBe('from-excel');
      // Same property in detail section shouldn't find it
      expect(classifyValueSource(prop, 'detail', sources)).toBe('from-excel'); // fallback
    });

    it('checks detail mappings when section is "detail"', () => {
      const prop: ResultProperty = { name: 'Quantity' };
      const sources = [
        createSource({
          header: [],
          detail: {
            locator: 'A7',
            properties: [{ name: 'Quantity', locator: 'CANT' }],
          },
        }),
      ];

      expect(classifyValueSource(prop, 'detail', sources)).toBe('from-excel');
    });
  });
});
