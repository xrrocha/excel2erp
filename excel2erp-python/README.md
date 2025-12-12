# Excel2ERP - Python Implementation

Metadata-driven Excel to ERP conversion using Flask and openpyxl.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python excel2erp.py shared/excel2erp.yaml --basedir shared

# Or with custom port
python excel2erp.py shared/excel2erp.yaml --basedir shared --port 8080
```

Open http://localhost:7070 in your browser.

## Dependencies

- **Flask** - Web framework
- **openpyxl** - Excel file reading
- **PyYAML** - Configuration parsing

## Architecture

Single-file implementation (~350 lines) demonstrating the algebraic approach:

1. **Configuration Model** - Dataclasses mirroring the YAML schema
2. **Excel Utilities** - Cell addressing, table reading
3. **Extraction Engine** - Header/detail extraction with replacements
4. **Output Generation** - Template expansion, ZIP creation
5. **Flask Application** - HTMX-powered web interface

## Command Line Options

```
excel2erp.py [config] [--port PORT] [--host HOST] [--basedir DIR]

  config    Configuration file (default: excel2erp.yaml)
  --port    Server port (default: 7070)
  --host    Server host (default: 0.0.0.0)
  --basedir Base directory for config and assets (default: .)
```
