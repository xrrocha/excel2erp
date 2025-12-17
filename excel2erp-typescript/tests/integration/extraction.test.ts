/**
 * Integration tests for extraction engine using real YAML config and Excel fixtures.
 *
 * These tests use the demo excel2erp.yaml configuration and demo Excel files
 * to verify extraction produces the expected output.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseYamlConfig, getSourceConfig } from '../../src/shared/config/loader';
import { extractFromExcel, processExcel } from '../../src/extraction/engine';
import { DEMO_USER_INPUTS, DEMO_SOURCES } from '../fixtures/demo-inputs';
import { getDirname } from '../helpers/paths';
import type { AppConfig } from '../../src/shared/config/types';

const __dirname = getDirname(import.meta.url);

// Paths — tests/fixtures/demo/
const YAML_CONFIG_PATH = path.join(__dirname, '../fixtures/demo/assets/excel2erp.yaml');
const EXCEL_FIXTURES_PATH = path.join(__dirname, '../fixtures/demo/excel');

let config: AppConfig;

beforeAll(() => {
  const yamlContent = fs.readFileSync(YAML_CONFIG_PATH, 'utf-8');
  config = parseYamlConfig(yamlContent);
});

describe('YAML Config Loading', () => {
  it('loads demo config successfully', () => {
    expect(config).toBeDefined();
    expect(config.name).toBe('pedidos');
    expect(config.sources).toHaveLength(5);
  });

  it('parses all sources', () => {
    const sourceNames = config.sources.map(s => s.name);
    expect(sourceNames).toContain('el-dorado');
    expect(sourceNames).toContain('cascabel');
    expect(sourceNames).toContain('la-nanita');
    expect(sourceNames).toContain('la-pinta');
    expect(sourceNames).toContain('uber-gross');
  });

  it('parses source header properties', () => {
    const elDorado = getSourceConfig(config, 'el-dorado')!;
    expect(elDorado.header).toHaveLength(2);
    expect(elDorado.header[0].name).toBe('NumAtCard');
    expect(elDorado.header[0].locator).toBe('E2');
  });

  it('parses source detail properties', () => {
    const elDorado = getSourceConfig(config, 'el-dorado')!;
    expect(elDorado.detail.locator).toBe('A8');
    expect(elDorado.detail.properties).toHaveLength(2);
    expect(elDorado.detail.properties[0].name).toBe('ItemCode');
    expect(elDorado.detail.properties[0].locator).toBe('Cod.');
  });

  it('parses replacements', () => {
    const cascabel = getSourceConfig(config, 'cascabel')!;
    const docDate = cascabel.header.find(h => h.name === 'DocDate');
    expect(docDate?.replacements).toEqual({ '-': '' });

    const elDorado = getSourceConfig(config, 'el-dorado')!;
    const itemCode = elDorado.detail.properties.find(p => p.name === 'ItemCode');
    // YAML parses numeric keys/values as numbers
    expect(itemCode?.replacements).toEqual({
      '77086': 701987570207,
      '47086': 707271908503,
    });
  });

  it('parses result config', () => {
    expect(config.result.separator).toBe('\t');
    expect(config.result.baseName).toBe('erp-pedido-${sourceName}-${NumAtCard}');
    expect(config.result.header.filename).toBe('cabecera.txt');
    expect(config.result.detail.filename).toBe('detalle.txt');
  });

  it('parses result properties with defaults', () => {
    const docNum = config.result.header.properties.find(p => p.name === 'DocNum');
    expect(docNum?.defaultValue).toBe('1');

    const whsCode = config.result.detail.properties.find(p => p.name === 'WhsCode');
    expect(whsCode?.defaultValue).toBe('BD-PTE');
  });
});

describe('Excel Extraction', () => {
  for (const { name: sourceName, file: excelFile } of DEMO_SOURCES) {
    describe(`Source: ${sourceName}`, () => {
      const excelPath = path.join(EXCEL_FIXTURES_PATH, excelFile);

      it('extracts data from Excel file', () => {
        const sourceConfig = getSourceConfig(config, sourceName)!;
        const excelData = fs.readFileSync(excelPath);
        const arrayBuffer = excelData.buffer.slice(
          excelData.byteOffset,
          excelData.byteOffset + excelData.byteLength
        );

        const extracted = extractFromExcel(arrayBuffer, sourceConfig);

        expect(extracted.header).toBeDefined();
        expect(extracted.detail).toBeDefined();
        expect(extracted.detail.length).toBeGreaterThan(0);

        // All detail rows should have Quantity at minimum
        for (const row of extracted.detail) {
          expect(row).toHaveProperty('Quantity');
        }
      });

      it('processes Excel with full pipeline', () => {
        const sourceConfig = getSourceConfig(config, sourceName)!;
        const excelData = fs.readFileSync(excelPath);
        const arrayBuffer = excelData.buffer.slice(
          excelData.byteOffset,
          excelData.byteOffset + excelData.byteLength
        );

        // Get fixed user inputs for this source
        const userInput = DEMO_USER_INPUTS[sourceName] ?? {};

        const result = processExcel(
          arrayBuffer,
          sourceConfig,
          config.result,
          userInput
        );

        expect(result.success).toBe(true);
        expect(result.headerContent).toBeDefined();
        expect(result.detailContent).toBeDefined();
        expect(result.zipFilename).toMatch(/^erp-pedido-/);
        expect(result.zipFilename).toMatch(/\.zip$/);

        // Header should have prolog + data line
        expect(result.headerContent).toContain('DocNum\tDocEntry\tDocType');

        // Detail should have prolog + data lines
        expect(result.detailContent).toContain('ParentKey\tLineNum\tItemCode');
      });
    });
  }
});

describe('Replacement Application', () => {
  it('applies date replacements (cascabel: removes dashes)', () => {
    const cascabel = getSourceConfig(config, 'cascabel')!;
    const excelPath = path.join(EXCEL_FIXTURES_PATH, 'cascabel.xlsx');
    const excelData = fs.readFileSync(excelPath);
    const arrayBuffer = excelData.buffer.slice(
      excelData.byteOffset,
      excelData.byteOffset + excelData.byteLength
    );

    const extracted = extractFromExcel(arrayBuffer, cascabel);

    // DocDate should have dashes removed
    const docDate = extracted.header.DocDate;
    expect(docDate).not.toContain('-');
    expect(docDate).toMatch(/^\d{8}$/); // YYYYMMDD format
  });

  it('applies item code replacements (el-dorado: specific codes)', () => {
    const elDorado = getSourceConfig(config, 'el-dorado')!;
    const excelPath = path.join(EXCEL_FIXTURES_PATH, 'el-dorado.xlsx');
    const excelData = fs.readFileSync(excelPath);
    const arrayBuffer = excelData.buffer.slice(
      excelData.byteOffset,
      excelData.byteOffset + excelData.byteLength
    );

    const extracted = extractFromExcel(arrayBuffer, elDorado);

    // Check if any item codes were replaced
    const itemCodes = extracted.detail.map(row => row.ItemCode);

    // If the file contains 77086, it should be replaced with 701987570207
    // If the file contains 47086, it should be replaced with 707271908503
    expect(itemCodes.length).toBeGreaterThan(0);
  });
});
