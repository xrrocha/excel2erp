"""
Tests for config.py - YAML loading.
"""

import pytest
from config import load_config


class TestLoadConfig:
    def test_loads_canonical_config(self, config_path):
        config = load_config(str(config_path))

        assert config.name == "pedidos"
        assert "Excel" in config.description
        assert len(config.sources) > 0

    def test_parses_sources(self, config_path):
        config = load_config(str(config_path))
        source = config.sources[0]

        assert source.name
        assert source.description
        assert isinstance(source.sheet_index, int)
        assert len(source.header) > 0
        assert source.detail.locator

    def test_parses_result_config(self, config_path):
        config = load_config(str(config_path))

        assert config.result.separator == "\t"
        assert config.result.base_name
        assert config.result.header.filename.endswith(".txt")
        assert config.result.detail.filename.endswith(".txt")

    def test_parses_header_properties(self, config_path):
        config = load_config(str(config_path))

        header_props = config.result.header.properties
        assert len(header_props) > 0
        assert all(p.name for p in header_props)

    def test_parses_detail_properties(self, config_path):
        config = load_config(str(config_path))

        detail_props = config.result.detail.properties
        assert len(detail_props) > 0

    def test_parses_parameters(self, config_path):
        config = load_config(str(config_path))

        assert "source" in config.parameters or config.param("source") == "source"

    def test_source_replacements(self, config_path):
        config = load_config(str(config_path))

        # Find a source with replacements
        for source in config.sources:
            for prop in source.header + source.detail.properties:
                if prop.replacements:
                    assert isinstance(prop.replacements, dict)
                    return
