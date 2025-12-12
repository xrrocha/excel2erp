# Excel2ERP - Python Implementation

Metadata-driven Excel to ERP conversion using tkinter (desktop GUI) and openpyxl.

- [Español](README.es.md)
- [Português](README.pt.md)

## Quick Start

```bash
# Create virtual environment and install dependencies
./init.sh

# Run the application
source .venv/bin/activate
python src/excel2erp.py shared/excel2erp.yaml
```

Or run the bundled version (after `./init.sh`):

```bash
./dist/excel2erp.pyz shared/excel2erp.yaml
```

## Dependencies

| Package | Purpose |
|---------|---------|
| **openpyxl** | Excel file reading (.xlsx) |
| **PyYAML** | Configuration parsing |
| **tkcalendar** | Date picker widget |

**Note**: tkinter ships with Python on macOS and Windows. On Debian/Ubuntu, install it separately:

```bash
sudo apt-get install python3-tk
```

### Build-time Dependencies

| Package | Purpose |
|---------|---------|
| **shiv** | Creates self-contained Python zipapps with bundled dependencies |

## Distribution

This implementation uses [shiv](https://github.com/linkedin/shiv) to create a single distributable file (`dist/excel2erp.pyz`) that bundles all dependencies. Only Python 3.10+ is required to run it.

```bash
# Build the distributable
./init.sh

# Distribution artifacts
dist/
├── excel2erp.pyz      # Self-contained application
└── excel2erp.yaml     # Configuration file
```

Users receive these two files. No `pip install` needed on target machines.

## Architecture

Modular implementation demonstrating clean domain/GUI separation:

```
src/
├── model.py       # Dataclasses mirroring YAML schema
├── config.py      # YAML loading into Config objects
├── excel.py       # Cell addressing, table reading
├── engine.py      # Header/detail extraction, output generation
└── excel2erp.py   # tkinter GUI (entry point)
```

The GUI layer (`excel2erp.py`) is a thin shell that:
1. Collects user inputs
2. Calls domain functions
3. Displays results

All transformation logic lives in the domain modules and is UI-agnostic.

## Testing

```bash
# Run tests
source .venv/bin/activate
pytest tests/ -v
```

Tests run automatically during `./init.sh` before building.

### Directory Structure

Python convention places tests in a sibling directory to source:

```
excel2erp-python/
├── src/                    # Production code
│   ├── model.py
│   ├── config.py
│   ├── excel.py
│   ├── engine.py
│   └── excel2erp.py
├── tests/                  # Test code (parallel to src/)
│   ├── conftest.py         # Pytest fixtures
│   ├── test_model.py
│   ├── test_config.py
│   ├── test_excel.py
│   └── test_engine.py      # Includes parity tests
└── shared/                 # Symlink to fixtures
```

This differs from JVM's `src/main/` + `src/test/` structure. Pytest auto-discovers `test_*.py` files in the `tests/` directory.

### Parity Tests

`test_engine.py` includes parity tests that compare output against golden fixtures in `shared/fixtures/expected/`. All implementations (Kotlin, TypeScript, Python) must produce identical output.

## Requirements

- Python 3.10+ (uses `X | None` union syntax)

## Flask Version (Preserved)

The original Flask+HTMX web version is preserved as `flask-excel2erp.py` for reference. It requires Flask in addition to the above dependencies.

```bash
pip install flask
python flask-excel2erp.py shared/excel2erp.yaml --basedir shared
```
