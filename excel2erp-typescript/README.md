# Excel to ERP (TypeScript)

A browser-native, offline-capable tool that extracts order data from Excel workbooks
and generates delimited files for ERP import. Configuration is entirely YAML-based —
no code changes needed to support new Excel formats or clients.

## How It Works

1. Define extraction rules in YAML (cell locations, column mappings, value transformations)
2. Open the single-file HTML app in any browser
3. Select an Excel file
4. Download a ZIP containing tab-delimited files ready for ERP import

```
Excel (.xlsx) → [YAML-driven extraction] → ZIP (header.txt + detail.txt)
```

## Features

- **Browser-native** — Runs entirely client-side, no server required
- **Offline-capable** — Works from `file://` protocol, distributable as a single HTML file
- **Privacy by design** — Files never leave the user's machine
- **Zero-code configuration** — Add new Excel formats via YAML
- **Cell-level extraction** — Map header fields to specific cells (e.g., `E2`, `G3`)
- **Table extraction** — Auto-detect data tables with configurable start position
- **Value transformations** — Regex-based replacements (strip dashes, remap codes)
- **Multiple sources** — Single config supports multiple clients/formats

## Tech Stack

- **TypeScript** with Bun runtime
- **[Alpine.js](https://alpinejs.dev/)** — Lightweight reactive UI
- **[SheetJS](https://sheetjs.com/)** — Excel parsing (xlsx)
- **[JSZip](https://stuk.github.io/jszip/)** — ZIP file generation
- **[Vite](https://vitejs.dev/)** — Build tool with single-file bundling

## Roadmap

This implementation currently runs entirely in the browser. A future release
will split into two variants sharing a common core:

- **Browser** — Current Alpine.js SPA (offline-capable, single HTML file)
- **Server** — Node/Bun server with HTMX (mirrors Kotlin's UI approach)

Both will share the extraction engine via npm workspaces.

## Quick Start

### Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
```

Then open http://localhost:5173 in your browser.

### Build

```bash
# Build single-file HTML
bun run build
```

Output: `dist/excel2erp.html` — a self-contained app you can distribute.

### Run Tests

```bash
# Unit and integration tests
bun run test

# E2E tests (requires Playwright)
bun run test:e2e:demo
```

## Offline Usage

When running the bundled HTML file locally (double-click to open):

1. **Config loading**: On first run, you'll be prompted to select a configuration file (`.yaml` or `.yml`)
2. **Caching**: The selected config is cached in localStorage for future sessions
3. **Asset placement**: Place logo images in the same folder as the HTML file, matching paths in your config

Example folder structure for offline use:
```
my-folder/
├── excel2erp.html     # The bundled app
├── excel2erp.yaml     # Your configuration
├── company-logo.png   # Main logo (config.logo)
└── source-logo.png    # Source logos (sources[].logo)
```

## Configuration

See the shared [config specification](../shared/spec/) for YAML schema details.

The TypeScript implementation uses the same YAML configuration as the Kotlin version,
ensuring output parity across implementations.

## License

[AGPL-3.0](LICENSE)
