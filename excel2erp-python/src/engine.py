"""
Extraction Engine

Data extraction and output generation.
"""

import re
import io
import zipfile
from typing import Any
from openpyxl.worksheet.worksheet import Worksheet

from model import Source, FileSpec, ResultConfig, ResultProperty, SourceProperty
from excel import parse_cell_address, cell_to_string, read_table


def apply_replacements(value: str, prop: SourceProperty) -> str:
    """Apply regex replacements to value."""
    result = value
    for pattern, replacement in prop.replacements.items():
        result = re.sub(str(pattern), str(replacement), result)
    return result


def extract_header(sheet: Worksheet, source: Source, result_header: FileSpec) -> dict[str, str]:
    """Extract header fields from specific cells."""
    data = dict(result_header.default_values)
    data.update(source.default_values)
    for prop in source.header:
        row, col = parse_cell_address(prop.locator)
        value = cell_to_string(sheet.cell(row, col))
        data[prop.name] = apply_replacements(value, prop)
    return data


def extract_detail(sheet: Worksheet, source: Source) -> list[dict[str, str]]:
    """Extract detail rows from table."""
    raw_rows = read_table(sheet, source.detail.locator, source.detail.end_value)
    col_map = {p.locator: p for p in source.detail.properties}
    return [
        {col_map[k].name: apply_replacements(v, col_map[k]) for k, v in row.items() if k in col_map}
        for row in raw_rows
    ]


def missing_properties(source: Source, result_header: FileSpec) -> list[ResultProperty]:
    """Find header properties that need user input."""
    extracted = {p.name for p in source.header}
    defaulted = set(source.default_values.keys()) | set(result_header.default_values.keys())
    return [p for p in result_header.properties if p.name not in extracted and p.name not in defaulted]


def expand(template: str, props: dict[str, Any]) -> str:
    """Expand ${name} placeholders in template."""
    return re.sub(r"\$\{(\w+)\}", lambda m: str(props.get(m.group(1), "")), template)


def normalize_date(value: str) -> str:
    """Remove non-digits from date string."""
    return re.sub(r"\D+", "", value)


def generate_content(spec: FileSpec, separator: str, records: list[dict[str, Any]]) -> str:
    """Generate file content from records."""
    lines = []
    if spec.prolog:
        lines.append(spec.prolog.rstrip())
    for idx, record in enumerate(records):
        values = []
        for prop in spec.properties:
            value = record.get(prop.name) or prop.default_value or ""
            if "${" in str(value):
                value = expand(str(value), {**record, "index": idx})
            values.append(str(value))
        lines.append(separator.join(values))
    if spec.epilog:
        lines.append(spec.epilog.rstrip())
    return "\n".join(lines)


def create_zip(header_content: str, detail_content: str, result: ResultConfig) -> bytes:
    """Create ZIP file with header and detail files."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(result.header.filename, header_content.encode("utf-8"))
        zf.writestr(result.detail.filename, detail_content.encode("utf-8"))
    return buffer.getvalue()
