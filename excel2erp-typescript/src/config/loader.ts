/**
 * Configuration Loader
 *
 * Loads application configuration from YAML or JSON.
 * Configuration defines:
 * - sources: extraction mappings for different input formats
 * - result: output format specification
 */

import YAML from 'yaml';
import type { AppConfig, SourceConfig, ResultConfig, SourceProperty, DetailConfig, FileSpec, ResultProperty, RuntimeSource, UserInputField } from './types';

/**
 * Raw YAML structure as read from configuration file.
 * Supports two formats:
 * 1. Nested (legacy): { port?, assetsDir?, config: { name, ... } }
 * 2. Flat (canonical): { name, description, ... }
 */
interface RawYamlConfigNested {
  port?: number;
  assetsDir?: string;
  config: RawYamlConfigFlat;
}

interface RawYamlConfigFlat {
  name: string;
  description: string;
  logo?: string;
  parameters: {
    htmx?: string;
    source: string;
    workbook: string;
    submit: string;
    successMessage?: string;
    extractionError?: string;
    headerLabel?: string;
    detailLabel?: string;
    previewLabel?: string;
  };
  sources: RawSourceConfig[];
  result: RawResultConfig;
}

type RawYamlConfig = RawYamlConfigNested | RawYamlConfigFlat;

interface RawSourceConfig {
  name: string;
  description: string;
  logo?: string;
  sheetIndex?: number;
  defaultValues?: Record<string, string>;
  header?: RawSourceProperty[];
  detail: {
    locator: string;
    endValue?: string;
    properties: RawSourceProperty[];
  };
}

interface RawSourceProperty {
  name: string;
  locator: string;
  replacements?: Record<string, string>;
}

interface RawResultConfig {
  separator: string;
  baseName: string;
  header: RawFileSpec;
  detail: RawFileSpec;
}

interface RawFileSpec {
  filename: string;
  prolog?: string;
  epilog?: string;
  properties: RawResultProperty[];
}

interface RawResultProperty {
  name: string;
  type?: string;
  prompt?: string;
  fyi?: string;
  defaultValue?: string | number;
}

/**
 * Check if parsed YAML is nested format (has config wrapper).
 */
function isNestedConfig(raw: RawYamlConfig): raw is RawYamlConfigNested {
  return 'config' in raw && raw.config !== undefined;
}

/**
 * Parse YAML config string into AppConfig.
 * Supports both nested (legacy) and flat (canonical) formats.
 */
export function parseYamlConfig(yamlString: string): AppConfig {
  const raw = YAML.parse(yamlString) as RawYamlConfig;

  // Detect structure and extract config object
  const configData = isNestedConfig(raw) ? raw.config : raw;

  return transformConfig(configData);
}

/**
 * Parse JSON config string into AppConfig.
 */
export function parseJsonConfig(jsonString: string): AppConfig {
  const raw = JSON.parse(jsonString) as RawYamlConfigFlat;
  return transformConfig(raw);
}

/**
 * Load config from a file (browser: fetch, Node: fs).
 * Detects format from extension or content.
 */
export async function loadConfigFromUrl(url: string): Promise<AppConfig> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load config from ${url}: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();

  // Detect format from extension or content
  if (url.endsWith('.yaml') || url.endsWith('.yml') || content.trimStart().startsWith('port:') || content.trimStart().startsWith('config:')) {
    return parseYamlConfig(content);
  } else {
    return parseJsonConfig(content);
  }
}

/**
 * Transform raw config to typed AppConfig.
 */
function transformConfig(raw: RawYamlConfigFlat): AppConfig {
  return {
    name: raw.name,
    description: raw.description,
    logo: raw.logo,
    parameters: {
      source: raw.parameters.source,
      workbook: raw.parameters.workbook,
      submit: raw.parameters.submit,
      successMessage: raw.parameters.successMessage,
      extractionError: raw.parameters.extractionError,
    },
    sources: raw.sources.map(transformSource),
    result: transformResult(raw.result),
  };
}

function transformSource(raw: RawSourceConfig): SourceConfig {
  return {
    name: raw.name,
    description: raw.description,
    logo: raw.logo,
    sheetIndex: raw.sheetIndex ?? 0,
    defaultValues: raw.defaultValues ?? {},
    header: (raw.header ?? []).map(transformSourceProperty),
    detail: transformDetail(raw.detail),
  };
}

function transformSourceProperty(raw: RawSourceProperty): SourceProperty {
  return {
    name: raw.name,
    locator: raw.locator,
    replacements: raw.replacements,
  };
}

function transformDetail(raw: RawSourceConfig['detail']): DetailConfig {
  return {
    locator: raw.locator,
    endValue: raw.endValue,
    properties: raw.properties.map(transformSourceProperty),
  };
}

function transformResult(raw: RawResultConfig): ResultConfig {
  return {
    separator: raw.separator,
    baseName: raw.baseName,
    header: transformFileSpec(raw.header),
    detail: transformFileSpec(raw.detail),
  };
}

function transformFileSpec(raw: RawFileSpec): FileSpec {
  return {
    filename: raw.filename,
    prolog: raw.prolog,
    epilog: raw.epilog,
    properties: raw.properties.map(transformResultProperty),
  };
}

function transformResultProperty(raw: RawResultProperty): ResultProperty {
  return {
    name: raw.name,
    type: raw.type,
    prompt: raw.prompt,
    fyi: raw.fyi,
    // Convert defaultValue to string (YAML may parse numbers)
    defaultValue: raw.defaultValue !== undefined ? String(raw.defaultValue) : undefined,
  };
}

/**
 * Get source config by name.
 */
export function getSourceConfig(config: AppConfig, sourceName: string): SourceConfig | undefined {
  return config.sources.find(s => s.name === sourceName);
}

/**
 * Derive runtime sources from full config.
 * Computes which fields need user input based on what's extracted vs defaulted.
 */
export function deriveRuntimeSources(config: AppConfig): RuntimeSource[] {
  const resultHeaderProps = config.result.header.properties;

  return config.sources.map(source => {
    // Find properties that need user input:
    // 1. Defined in result header
    // 2. Not extracted from Excel (not in source.header)
    // 3. No defaultValue in result or source.defaultValues
    const extractedNames = new Set(source.header.map(h => h.name));
    const defaultedNames = new Set([
      ...Object.keys(source.defaultValues),
      ...resultHeaderProps.filter(p => p.defaultValue !== undefined).map(p => p.name),
    ]);

    const userInputFields: UserInputField[] = resultHeaderProps
      .filter(prop => {
        // Not extracted and not defaulted = needs user input
        return !extractedNames.has(prop.name) && !defaultedNames.has(prop.name);
      })
      .map(prop => ({
        name: prop.name,
        type: prop.type ?? 'text',
        prompt: prop.prompt ?? prop.name,
      }));

    return {
      name: source.name,
      description: source.description,
      userInputFields,
    };
  });
}
