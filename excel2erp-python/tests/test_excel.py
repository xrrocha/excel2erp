"""
Tests for excel.py - cell parsing and table reading.
"""

import pytest
from excel import parse_cell_address, cell_to_string, read_table
from datetime import datetime, date


class TestParseCellAddress:
    def test_simple_address(self):
        assert parse_cell_address("A1") == (1, 1)
        assert parse_cell_address("B2") == (2, 2)
        assert parse_cell_address("C10") == (10, 3)

    def test_double_letter_column(self):
        assert parse_cell_address("AA1") == (1, 27)
        assert parse_cell_address("AB1") == (1, 28)
        assert parse_cell_address("AZ1") == (1, 52)

    def test_lowercase_address(self):
        assert parse_cell_address("a1") == (1, 1)
        assert parse_cell_address("ab10") == (10, 28)

    def test_invalid_address_raises(self):
        with pytest.raises(ValueError):
            parse_cell_address("123")
        with pytest.raises(ValueError):
            parse_cell_address("")
        with pytest.raises(ValueError):
            parse_cell_address("A")


class TestCellToString:
    def test_none_returns_empty(self):
        class MockCell:
            value = None
        assert cell_to_string(MockCell()) == ""

    def test_string_passthrough(self):
        class MockCell:
            value = "hello"
        assert cell_to_string(MockCell()) == "hello"

    def test_integer_float_truncated(self):
        class MockCell:
            value = 42.0
        assert cell_to_string(MockCell()) == "42"

    def test_non_integer_float_preserved(self):
        class MockCell:
            value = 3.14
        assert cell_to_string(MockCell()) == "3.14"

    def test_datetime_formatted(self):
        class MockCell:
            value = datetime(2024, 1, 15, 10, 30)
        assert cell_to_string(MockCell()) == "20240115"

    def test_date_formatted(self):
        class MockCell:
            value = date(2024, 1, 15)
        assert cell_to_string(MockCell()) == "20240115"


class TestReadTable:
    def test_reads_from_excel_file(self, sample_excel):
        from openpyxl import load_workbook

        wb = load_workbook(sample_excel, data_only=True)
        sheet = wb.worksheets[0]

        # Read from a known table location (adjust based on fixture)
        rows = read_table(sheet, "A10")

        assert isinstance(rows, list)
        if rows:
            assert isinstance(rows[0], dict)
