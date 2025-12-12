# Excel to ERP

A metadata-driven tool that extracts order data from Excel workbooks and generates
delimited files for ERP import. Configuration is entirely YAML-based — no code changes
needed to support new Excel formats or clients.

## How It Works

1. Define extraction rules in YAML (cell locations, column mappings, value transformations)
2. Upload an Excel file through the web UI
3. Download a ZIP containing tab-delimited files ready for ERP import

```
Excel (.xlsx) → [YAML-driven extraction] → ZIP (header.txt + detail.txt)
```

## Features

- **Zero-code configuration** — Add new Excel formats via YAML, no recompilation
- **Cell-level extraction** — Map header fields to specific cells (e.g., `E2`, `G3`)
- **Table extraction** — Auto-detect data tables with configurable start position
- **Value transformations** — Regex-based replacements (strip dashes, remap codes)
- **Multiple sources** — Single config supports multiple clients/formats
- **Web UI** — Browser-based file upload with HTMX
- **Native binary** — GraalVM native image for instant startup (~2ms)

## Tech Stack

- **Kotlin** on JVM 17
- **[Javalin](https://javalin.io/)** — Lightweight web framework
- **[FastExcel](https://github.com/dhatim/fastexcel)** — High-performance XLSX reader
- **[Jackson YAML](https://github.com/FasterXML/jackson-dataformats-text)** — Configuration parsing
- **[HTMX](https://htmx.org/)** — Dynamic UI without JavaScript

## Roadmap

This implementation currently targets the JVM. A future release will introduce
[Kotlin Multiplatform](https://kotlinlang.org/docs/multiplatform.html) support:

- **JVM** — Current server-side implementation (Javalin + HTMX)
- **JS** — Browser-native variant via Kotlin/JS

The core extraction logic will be shared across targets.

## Quick Start

### Run the Demo

```bash
# Using the pre-built JAR (requires Java 17+)
cd demo
./run.sh          # Linux/macOS
run.bat           # Windows
```

Then open http://localhost:9090 in your browser.

### Build from Source

```bash
# Build uber-JAR
./gradlew build

# Run
java -jar build/libs/excel2erp-1.0-SNAPSHOT-all.jar demo/excel2erp.yaml
```

### Native Binary (Optional)

```bash
# Requires GraalVM with native-image
./gradlew nativeCompile

# Run (~2ms startup)
./build/native/nativeCompile/excel2erp demo/excel2erp.yaml
```

## Configuration

The YAML config defines:

- **Server settings** — Port, assets directory
- **Sources** — One per Excel format/client
- **Result** — Output file structure

### Example Source Definition

```yaml
sources:
  - name: acme-corp
    description: ACME Corporation Orders
    defaultValues:
      CardCode: C12345678
    header:
      - name: DocDate
        locator: E3              # Cell address
        replacements:
          '-': ''                # Strip dashes from dates
    detail:
      locator: A8                # Table starts at A8
      properties:
        - name: ItemCode
          locator: CODE          # Column header in Excel
        - name: Quantity
          locator: QTY
```

See [demo/excel2erp.yaml](demo/excel2erp.yaml) for a complete example.

## Additional Resources

The `demo/` directory includes supplementary materials (in Spanish):

- [algebra-vs-aritmetica.html](demo/algebra-vs-aritmetica.html) — Design rationale document
  Also available [online](https://rrocha.me/vimeworks/algebra-vs-aritmetica.html)
- [de-la-aritmetica-al-algebra-en-programacion.mp3](demo/de-la-aritmetica-al-algebra-en-programacion.mp3) — Companion podcast

## License

MIT
