# Excel2ERP Configuration Schema

This document describes the structure of the `excel2erp.yaml` configuration file.

## Overview

The configuration defines:
1. **Application metadata** — name, description, logo
2. **UI parameters** — labels, messages, prompts
3. **Sources** — one per Excel format (client)
4. **Result** — output file structure

---

## Root Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Application identifier |
| `description` | string | Yes | Human-readable description |
| `logo` | string | No | Path to logo image |

---

## Parameters

UI-related configuration under `parameters`:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `source` | string | Yes | Label for source dropdown |
| `workbook` | string | Yes | Label for file input |
| `submit` | string | Yes | Submit button text |
| `successMessage` | string | No | Template with `${filename}` |
| `headerLabel` | string | No | Preview header section label |
| `detailLabel` | string | No | Preview detail section label |
| `previewLabel` | string | No | Preview panel title |
| `extractionError` | string | No | Error message prefix |

---

## Sources

Each source represents a client's Excel format:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Unique identifier |
| `description` | string | Yes | Human-readable name |
| `logo` | string | No | Path to source-specific logo |
| `sheetIndex` | number | No | 0-based sheet index (default: 0) |
| `defaultValues` | object | No | Static values not from Excel |
| `header` | array | Yes | Single-cell extractions |
| `detail` | object | Yes | Table extraction configuration |

### Header Properties

Each header property extracts a single cell:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Output property name |
| `locator` | string | Yes | Cell address (A1 notation) |
| `replacements` | object | No | Regex pattern → replacement pairs |

### Detail Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `locator` | string | Yes | Top-left cell of table (A1 notation) |
| `endValue` | string | No | Value marking end of data |
| `properties` | array | Yes | Column extraction rules |

### Detail Properties

Each detail property extracts a column:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Output property name |
| `locator` | string | Yes | Column header text in Excel |
| `replacements` | object | No | Pattern → replacement pairs |

---

## Result

Output file configuration under `result`:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `separator` | string | Yes | Field separator (e.g., `\t`) |
| `baseName` | string | Yes | Output filename template |
| `header` | object | Yes | Header file specification |
| `detail` | object | Yes | Detail file specification |

### File Specification (header/detail)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `filename` | string | Yes | Output filename |
| `prolog` | string | No | Content before data rows |
| `epilog` | string | No | Content after data rows |
| `properties` | array | Yes | Output column definitions |

### Result Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Property name (matches source) |
| `type` | string | No | `text` or `date` |
| `prompt` | string | No | User input label (if not from Excel) |
| `defaultValue` | string | No | Default value or template |

---

## Template Variables

Templates support `${...}` variable expansion:

| Variable | Context | Description |
|----------|---------|-------------|
| `${sourceName}` | baseName | Current source name |
| `${PropertyName}` | baseName, defaultValue | Any extracted property |
| `${index}` | detail defaultValue | 0-based row index |
| `${filename}` | successMessage | Generated ZIP filename |

---

## Example

See `excel2erp.yaml` for a complete working example with 5 sources.
