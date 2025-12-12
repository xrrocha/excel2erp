"""
Excel Utilities

Cell address parsing, cell value conversion, table reading.
"""

import re
from datetime import datetime, date
from openpyxl.worksheet.worksheet import Worksheet


def parse_cell_address(address: str) -> tuple[int, int]:
    """Parse A1-style address to (row, col) 1-based indices."""
    match = re.match(r"([A-Za-z]+)(\d+)", address)
    if not match:
        raise ValueError(f"Invalid cell address: {address}")
    col_str, row_str = match.groups()
    col = 0
    for c in col_str.upper():
        col = col * 26 + (ord(c) - ord("A") + 1)
    return int(row_str), col


def cell_to_string(cell) -> str:
    """Convert cell value to string."""
    if cell.value is None:
        return ""
    if isinstance(cell.value, datetime):
        return cell.value.strftime("%Y%m%d")
    if isinstance(cell.value, date):
        return cell.value.strftime("%Y%m%d")
    if isinstance(cell.value, float) and cell.value == int(cell.value):
        return str(int(cell.value))
    return str(cell.value)


def read_table(sheet: Worksheet, start_address: str, end_value: str | None = None) -> list[dict[str, str]]:
    """Read a table starting at given address, using first row as headers."""
    start_row, start_col = parse_cell_address(start_address)

    # Read headers
    headers = []
    col = start_col
    while True:
        val = cell_to_string(sheet.cell(start_row, col))
        if not val.strip():
            break
        headers.append(val)
        col += 1

    if not headers:
        return []

    # Read data rows
    rows = []
    row_num = start_row + 1
    while True:
        first_cell = cell_to_string(sheet.cell(row_num, start_col))
        if not first_cell.strip() or (end_value and first_cell == end_value):
            break
        row_data = {
            headers[i]: cell_to_string(sheet.cell(row_num, start_col + i))
            for i in range(len(headers))
        }
        rows.append(row_data)
        row_num += 1

    return rows
