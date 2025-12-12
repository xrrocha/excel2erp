#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Creating virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

echo "Installing dependencies..."
pip install --quiet --upgrade pip
pip install --quiet openpyxl pyyaml tkcalendar shiv pytest pytest-cov

echo "Running tests with coverage..."
pytest tests/ -v --cov=src --cov-report=term-missing

echo "Building distributable with shiv..."
mkdir -p dist
shiv --output-file dist/excel2erp.pyz \
     --entry-point excel2erp:main \
     --compile-pyc \
     openpyxl pyyaml tkcalendar .

echo "Copying configuration..."
cp shared/excel2erp.yaml dist/

echo "Done!"
echo ""
echo "Distribution artifacts:"
ls -la dist/
echo ""
echo "Run with: ./dist/excel2erp.pyz dist/excel2erp.yaml"
