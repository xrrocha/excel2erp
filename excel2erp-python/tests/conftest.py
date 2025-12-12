"""
Pytest fixtures for Excel2ERP tests.
"""

import pytest
from pathlib import Path


@pytest.fixture
def fixtures_dir() -> Path:
    """Path to shared test fixtures."""
    return Path(__file__).parent.parent / "shared" / "fixtures"


@pytest.fixture
def config_path() -> Path:
    """Path to canonical YAML configuration."""
    return Path(__file__).parent.parent / "shared" / "excel2erp.yaml"


@pytest.fixture
def sample_excel(fixtures_dir) -> Path:
    """Path to sample Excel file."""
    return fixtures_dir / "excel" / "el-dorado.xlsx"


@pytest.fixture
def expected_dir(fixtures_dir) -> Path:
    """Path to expected output directory."""
    return fixtures_dir / "expected"
