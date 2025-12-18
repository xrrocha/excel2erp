/**
 * Value Source Classification
 *
 * Pure functions for determining where result property values come from.
 * Extracted for testability without Alpine.js dependencies.
 */

import type { ResultProperty, SourceConfig } from '../shared/config/types';

/**
 * Value source classification for a result property
 */
export type ValueSource = 'constant' | 'from-excel' | 'per-source' | 'user-input' | 'row-index';

/**
 * Enriched property info for display
 */
export interface PropertyInfo {
  name: string;
  type: string;
  source: ValueSource;
  sourceLabel: string;
  value?: string;
  prompt?: string;
}

/**
 * Map ValueSource to i18n key suffix.
 */
export const SOURCE_I18N_KEYS: Record<ValueSource, string> = {
  'constant': 'constant',
  'from-excel': 'fromExcel',
  'per-source': 'perSource',
  'user-input': 'userInput',
  'row-index': 'rowIndex',
};

/**
 * Determine the value source for a result property.
 * Returns source type only; label is resolved via i18n in the UI layer.
 */
export function classifyValueSource(
  prop: ResultProperty,
  section: 'header' | 'detail',
  sources: SourceConfig[]
): ValueSource {
  // Row index special case
  if (prop.defaultValue === '${index}') {
    return 'row-index';
  }

  // Has a fixed default value (constant)
  if (prop.defaultValue !== undefined) {
    return 'constant';
  }

  // Check if any source extracts this from Excel
  const isExtractedFromExcel = sources.some((src) => {
    if (section === 'header') {
      return src.header.some((h) => h.name === prop.name);
    } else {
      return src.detail.properties.some((d) => d.name === prop.name);
    }
  });

  if (isExtractedFromExcel) {
    return 'from-excel';
  }

  // Check if any source has a defaultValue for this
  const hasSourceDefault = sources.some(
    (src) => src.defaultValues && prop.name in src.defaultValues
  );

  if (hasSourceDefault) {
    return 'per-source';
  }

  // Has a prompt, needs user input
  if (prop.prompt) {
    return 'user-input';
  }

  // Fallback
  return 'from-excel';
}

/**
 * Build PropertyInfo from a ResultProperty.
 */
export function toPropertyInfo(
  prop: ResultProperty,
  section: 'header' | 'detail',
  sources: SourceConfig[],
  t: (key: string) => string
): PropertyInfo {
  const source = classifyValueSource(prop, section, sources);
  const sourceLabel = source === 'constant'
    ? `${t('source.constant')} ${prop.defaultValue}`
    : t(`source.${SOURCE_I18N_KEYS[source]}`);

  return {
    name: prop.name,
    type: prop.type || 'text',
    source,
    sourceLabel,
    value: prop.defaultValue,
    prompt: prop.prompt,
  };
}
