/**
 * Config Loader Tests
 *
 * Tests for YAML/JSON config parsing, including logo path resolution.
 */

import { describe, it, expect } from 'vitest';
import { parseYamlConfig, parseJsonConfig } from '../../../src/shared/config/loader';

describe('parseYamlConfig', () => {
  describe('logo path resolution', () => {
    it('resolves top-level logo with assetsDir (nested format)', () => {
      const yaml = `
assetsDir: ./assets
config:
  name: Test App
  description: Test
  logo: logo.png
  parameters:
    source: Source
    workbook: Workbook
    submit: Submit
  sources: []
  result:
    separator: "\\t"
    baseName: test
    header:
      filename: header.txt
      properties: []
    detail:
      filename: detail.txt
      properties: []
`;
      const config = parseYamlConfig(yaml);
      expect(config.logo).toBe('assets/logo.png');
      expect(config.assetsDir).toBe('./assets');
    });

    it('resolves source logos with assetsDir (nested format)', () => {
      const yaml = `
assetsDir: ./assets
config:
  name: Test App
  description: Test
  parameters:
    source: Source
    workbook: Workbook
    submit: Submit
  sources:
    - name: source1
      description: Source 1
      logo: source1.png
      detail:
        locator: A1
        properties: []
    - name: source2
      description: Source 2
      logo: source2.png
      detail:
        locator: A1
        properties: []
  result:
    separator: "\\t"
    baseName: test
    header:
      filename: header.txt
      properties: []
    detail:
      filename: detail.txt
      properties: []
`;
      const config = parseYamlConfig(yaml);
      expect(config.sources[0].logo).toBe('assets/source1.png');
      expect(config.sources[1].logo).toBe('assets/source2.png');
    });

    it('preserves logo paths when no assetsDir (flat format)', () => {
      const yaml = `
name: Test App
description: Test
logo: logo.png
parameters:
  source: Source
  workbook: Workbook
  submit: Submit
sources:
  - name: source1
    description: Source 1
    logo: source1.png
    detail:
      locator: A1
      properties: []
result:
  separator: "\\t"
  baseName: test
  header:
    filename: header.txt
    properties: []
  detail:
    filename: detail.txt
    properties: []
`;
      const config = parseYamlConfig(yaml);
      expect(config.logo).toBe('logo.png');
      expect(config.sources[0].logo).toBe('source1.png');
      expect(config.assetsDir).toBeUndefined();
    });

    it('handles missing logos gracefully', () => {
      const yaml = `
assetsDir: ./assets
config:
  name: Test App
  description: Test
  parameters:
    source: Source
    workbook: Workbook
    submit: Submit
  sources:
    - name: source1
      description: Source 1
      detail:
        locator: A1
        properties: []
  result:
    separator: "\\t"
    baseName: test
    header:
      filename: header.txt
      properties: []
    detail:
      filename: detail.txt
      properties: []
`;
      const config = parseYamlConfig(yaml);
      expect(config.logo).toBeUndefined();
      expect(config.sources[0].logo).toBeUndefined();
    });

    it('normalizes assetsDir by removing leading ./', () => {
      const yaml = `
assetsDir: ./my-assets
config:
  name: Test App
  description: Test
  logo: app.png
  parameters:
    source: Source
    workbook: Workbook
    submit: Submit
  sources: []
  result:
    separator: "\\t"
    baseName: test
    header:
      filename: header.txt
      properties: []
    detail:
      filename: detail.txt
      properties: []
`;
      const config = parseYamlConfig(yaml);
      expect(config.logo).toBe('my-assets/app.png');
    });

    it('handles assetsDir without leading ./', () => {
      const yaml = `
assetsDir: static/images
config:
  name: Test App
  description: Test
  logo: app.png
  parameters:
    source: Source
    workbook: Workbook
    submit: Submit
  sources: []
  result:
    separator: "\\t"
    baseName: test
    header:
      filename: header.txt
      properties: []
    detail:
      filename: detail.txt
      properties: []
`;
      const config = parseYamlConfig(yaml);
      expect(config.logo).toBe('static/images/app.png');
    });
  });

  describe('config structure parsing', () => {
    it('parses nested format (legacy)', () => {
      const yaml = `
port: 8080
assetsDir: ./assets
config:
  name: My App
  description: My Description
  parameters:
    source: Origen
    workbook: Libro
    submit: Enviar
  sources: []
  result:
    separator: "\\t"
    baseName: output
    header:
      filename: header.txt
      properties: []
    detail:
      filename: detail.txt
      properties: []
`;
      const config = parseYamlConfig(yaml);
      expect(config.name).toBe('My App');
      expect(config.description).toBe('My Description');
    });

    it('parses flat format (canonical)', () => {
      const yaml = `
name: My App
description: My Description
parameters:
  source: Origen
  workbook: Libro
  submit: Enviar
sources: []
result:
  separator: "\\t"
  baseName: output
  header:
    filename: header.txt
    properties: []
  detail:
    filename: detail.txt
    properties: []
`;
      const config = parseYamlConfig(yaml);
      expect(config.name).toBe('My App');
      expect(config.description).toBe('My Description');
    });
  });
});

describe('parseJsonConfig', () => {
  it('parses JSON config (flat format only)', () => {
    const json = JSON.stringify({
      name: 'JSON App',
      description: 'JSON Description',
      logo: 'logo.png',
      parameters: {
        source: 'Source',
        workbook: 'Workbook',
        submit: 'Submit',
      },
      sources: [],
      result: {
        separator: '\t',
        baseName: 'output',
        header: { filename: 'header.txt', properties: [] },
        detail: { filename: 'detail.txt', properties: [] },
      },
    });

    const config = parseJsonConfig(json);
    expect(config.name).toBe('JSON App');
    expect(config.logo).toBe('logo.png');
  });
});
