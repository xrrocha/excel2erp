"""
Extraction Engine - Data Extraction and Output Generation

This module contains the core transformation logic of Excel2ERP. It extracts
data from Excel worksheets according to configuration rules and generates
the output files for ERP import.

ARCHITECTURAL CONTEXT:
----------------------
This is the heart of the domain layer—pure business logic with no UI dependencies:

    excel2erp.py (GUI)
        │
        │  calls
        ▼
    engine.py (this module - extraction & generation)
        │
        │  uses
        ▼
    excel.py (cell operations)
        │
        ▼
    openpyxl (Excel I/O)

The engine receives:
- A worksheet (opened by openpyxl)
- A Source configuration (what to extract)
- A ResultConfig (how to format output)

And produces:
- Extracted header data (dict)
- Extracted detail data (list of dicts)
- Generated file content (strings)
- Final ZIP file (bytes)

EXTRACTION FLOW:
----------------
1. extract_header() - Reads single cells for order metadata
2. extract_detail() - Reads table rows for line items
3. missing_properties() - Identifies fields needing user input
4. [User provides missing values]
5. generate_content() - Formats data into delimited text
6. create_zip() - Bundles header + detail files into ZIP

VALUE RESOLUTION HIERARCHY:
---------------------------
For any field in the output, values come from (highest to lowest priority):
1. Extracted from Excel (via source header/detail config)
2. User input (for missing_properties)
3. Source default values (source.default_values)
4. Result default values (result_header.default_values)
5. Empty string (if nothing else available)

This hierarchy allows flexible configuration where defaults can be
overridden at multiple levels.
"""

import re
import io
import zipfile
from typing import Any
from openpyxl.worksheet.worksheet import Worksheet

from model import Source, FileSpec, ResultConfig, ResultProperty, SourceProperty
from excel import parse_cell_address, cell_to_string, read_table


def apply_replacements(value: str, prop: SourceProperty) -> str:
    """
    Apply regex-based text replacements to an extracted value.

    This enables data cleaning during extraction—for example, stripping
    leading zeros, normalizing formats, or removing unwanted characters.

    Args:
        value: The raw string value extracted from Excel.
        prop: The SourceProperty containing replacement rules.
              Its `replacements` dict maps regex patterns to replacements.

    Returns:
        The value after all replacements have been applied.
        If no replacements are defined, returns the original value.

    Replacement Order:
        Replacements are applied in dictionary iteration order.
        In Python 3.7+, this is insertion order, so the order in the
        YAML config is preserved.

    Example:
        If prop.replacements = {"^0+": "", "-": ""}:
        - "00123-456" → "123456"

        Step 1: "^0+" matches "00", replaced with "" → "123-456"
        Step 2: "-" matches "-", replaced with "" → "123456"
    """
    result = value
    for pattern, replacement in prop.replacements.items():
        # re.sub handles the full regex syntax
        # Convert pattern and replacement to strings to handle YAML edge cases
        result = re.sub(str(pattern), str(replacement), result)
    return result


def extract_header(sheet: Worksheet, source: Source, result_header: FileSpec) -> dict[str, str]:
    """
    Extract header (metadata) fields from specific cells.

    Header fields are single-cell values like customer code, order number,
    order date, etc. Each field is extracted from a configured cell address.

    Args:
        sheet: The openpyxl Worksheet to extract from.
        source: The Source configuration defining which cells to read.
        result_header: The FileSpec with default values for missing fields.

    Returns:
        A dictionary mapping field names to extracted (or default) values.
        Keys are the `name` properties from source.header config.

    Value Layering:
        The return dict is built in layers, with later layers overwriting:
        1. Result-level defaults (result_header.default_values)
        2. Source-level defaults (source.default_values)
        3. Extracted values (from source.header)

        This allows configuration like:
        - Result default: status = "NEW"
        - Source default: department = "SALES"
        - Extracted: customerCode from cell B3
    """
    # Start with result-level defaults as base layer
    data = dict(result_header.default_values)

    # Overlay source-level defaults
    data.update(source.default_values)

    # Extract each configured header property
    for prop in source.header:
        # Parse the cell address (e.g., "B3" → row 3, col 2)
        row, col = parse_cell_address(prop.locator)

        # Read the cell value and convert to string
        value = cell_to_string(sheet.cell(row, col))

        # Apply any configured text replacements (regex-based)
        data[prop.name] = apply_replacements(value, prop)

    return data


def extract_detail(sheet: Worksheet, source: Source) -> list[dict[str, str]]:
    """
    Extract detail rows (line items) from a table region.

    Detail rows are the repeating portion of an order—product lines with
    SKU, quantity, price, etc. The table is read based on the source's
    detail configuration.

    Args:
        sheet: The openpyxl Worksheet to extract from.
        source: The Source configuration defining table location and columns.

    Returns:
        A list of dictionaries, one per row. Keys are the normalized
        field names (from config), not the raw column headers.

    Column Mapping:
        The source.detail.properties maps Excel column headers to output
        field names. For example:
        - Excel header "Código de Artículo" → field name "itemCode"
        - Excel header "Cantidad" → field name "quantity"

        Only columns listed in properties are included in the output.
        Other columns in the Excel table are ignored.
    """
    # Read the raw table using column headers as keys
    raw_rows = read_table(sheet, source.detail.locator, source.detail.end_value)

    # Build a lookup: Excel column header → SourceProperty
    # This lets us map column headers to normalized field names
    col_map = {p.locator: p for p in source.detail.properties}

    # Transform each row: rename columns and apply replacements
    return [
        {
            col_map[k].name: apply_replacements(v, col_map[k])
            for k, v in row.items()
            if k in col_map  # Only include mapped columns
        }
        for row in raw_rows
    ]


def missing_properties(source: Source, result_header: FileSpec) -> list[ResultProperty]:
    """
    Identify header properties that need user input.

    Some output fields can't be extracted from Excel and aren't defaulted—
    they must be provided by the user. This function identifies those fields
    so the UI can prompt for them.

    Args:
        source: The Source being used (defines what's extracted and defaulted).
        result_header: The FileSpec defining all required output fields.

    Returns:
        A list of ResultProperty objects for fields that are:
        1. Required in the output (listed in result_header.properties)
        2. NOT extracted from Excel (not in source.header)
        3. NOT provided as defaults (not in source.default_values or result defaults)

        The returned properties include type and prompt information for
        rendering appropriate input widgets.

    Use Case:
        For a "Purchase Order" source that extracts customerCode and orderDate
        from Excel, but the output requires invoiceDate as well:
        - invoiceDate would be returned as a missing property
        - UI would show a date picker for the user to input it
    """
    # Fields that will be extracted from Excel
    extracted = {p.name for p in source.header}

    # Fields with default values (from source or result)
    defaulted = set(source.default_values.keys()) | set(result_header.default_values.keys())

    # Return properties that are neither extracted nor defaulted
    return [
        p for p in result_header.properties
        if p.name not in extracted and p.name not in defaulted
    ]


def expand(template: str, props: dict[str, Any]) -> str:
    """
    Expand ${placeholder} syntax in a template string.

    This enables dynamic content in filenames, default values, and other
    configurable strings. Placeholders reference field names from the
    extracted data.

    Args:
        template: A string possibly containing ${name} placeholders.
        props: A dictionary of values to substitute.

    Returns:
        The template with all recognized placeholders replaced.
        Unrecognized placeholders are replaced with empty string.

    Examples:
        expand("ORDER_${customerCode}_${date}", {"customerCode": "C123", "date": "20240101"})
        → "ORDER_C123_20240101"

        expand("${unknown}", {})
        → ""
    """
    # \$\{(\w+)\} matches ${word_characters}
    # The lambda looks up the captured group in props
    return re.sub(r"\$\{(\w+)\}", lambda m: str(props.get(m.group(1), "")), template)


def normalize_date(value: str) -> str:
    """
    Remove non-digit characters from a date string.

    This normalizes various date formats to the YYYYMMDD format expected
    by ERP systems. It handles dates from date pickers (often formatted
    with dashes) or user input in various formats.

    Args:
        value: A date string in any format (e.g., "2024-01-15", "01/15/2024").

    Returns:
        Only the digits from the input (e.g., "20240115", "01152024").
        The caller should ensure the input is in YYYY-MM-DD order.

    Note:
        This function doesn't validate or reorder date components—it just
        strips non-digits. The tkcalendar DateEntry widget is configured
        to output YYYY-MM-DD format, which becomes YYYYMMDD after normalization.
    """
    return re.sub(r"\D+", "", value)


def generate_content(spec: FileSpec, separator: str, records: list[dict[str, Any]]) -> str:
    """
    Generate delimited text content from data records.

    This function produces the actual file content for ERP import. Each
    record becomes one line, with fields separated by the configured delimiter.

    Args:
        spec: The FileSpec defining columns, prolog, and epilog.
        separator: Field delimiter (e.g., "\t" for tab, ";" for semicolon).
        records: List of data dictionaries (from extraction or with user input).

    Returns:
        A string containing the complete file content:
        - Optional prolog line
        - Data lines (one per record)
        - Optional epilog line

        Lines are joined with newlines (\\n).

    Column Order:
        Output columns follow the order in spec.properties. This ensures
        all implementations produce identical output regardless of dict
        iteration order.

    Value Resolution:
        For each field in each record:
        1. Try record[field_name]
        2. Fall back to property.default_value
        3. Fall back to empty string

        If the value contains ${} placeholders, they're expanded using
        the record's data plus an "index" variable (0-based row number).

    Example Output:
        HDR
        C123\\t20240115\\tPO-001
        EOF

        Where HDR is prolog, the middle line is data, and EOF is epilog.
    """
    lines = []

    # Add prolog if defined (e.g., file header marker)
    if spec.prolog:
        lines.append(spec.prolog.rstrip())

    # Generate one line per record
    for idx, record in enumerate(records):
        values = []
        for prop in spec.properties:
            # Resolve value with fallback chain
            value = record.get(prop.name) or prop.default_value or ""

            # Expand any ${placeholder} syntax in the value
            # Include "index" for auto-numbering (useful in detail lines)
            if "${" in str(value):
                value = expand(str(value), {**record, "index": idx})

            values.append(str(value))

        # Join values with separator to form the line
        lines.append(separator.join(values))

    # Add epilog if defined (e.g., file footer marker)
    if spec.epilog:
        lines.append(spec.epilog.rstrip())

    return "\n".join(lines)


def create_zip(header_content: str, detail_content: str, result: ResultConfig) -> bytes:
    """
    Create a ZIP archive containing header and detail files.

    ERP systems typically expect import files bundled in a ZIP. This
    function creates that ZIP in memory (no temp files) and returns
    the raw bytes ready for saving.

    Args:
        header_content: The generated header file content (string).
        detail_content: The generated detail file content (string).
        result: The ResultConfig containing output filenames.

    Returns:
        The ZIP file as bytes, ready to write to disk or transmit.

    ZIP Structure:
        The resulting ZIP contains exactly two files:
        - result.header.filename (e.g., "HEADER.txt")
        - result.detail.filename (e.g., "DETAIL.txt")

        Both files are UTF-8 encoded and compressed with DEFLATE.

    Implementation:
        Uses io.BytesIO as an in-memory file buffer, avoiding disk I/O.
        The zipfile module handles compression and archive structure.
    """
    # Create an in-memory binary buffer for the ZIP
    buffer = io.BytesIO()

    # Write both files to the ZIP archive
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add header file (encode string to bytes)
        zf.writestr(result.header.filename, header_content.encode("utf-8"))

        # Add detail file
        zf.writestr(result.detail.filename, detail_content.encode("utf-8"))

    # Return the complete ZIP as bytes
    return buffer.getvalue()
