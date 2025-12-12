"""
Tests for model.py - dataclass definitions.
"""

from model import (
    SourceProperty, DetailConfig, Source, ResultProperty,
    FileSpec, ResultConfig, Config
)


class TestSourceProperty:
    def test_defaults(self):
        prop = SourceProperty(name="test", locator="A1")
        assert prop.name == "test"
        assert prop.locator == "A1"
        assert prop.replacements == {}

    def test_with_replacements(self):
        prop = SourceProperty(
            name="code",
            locator="B2",
            replacements={"^0+": "", "-": ""}
        )
        assert prop.replacements == {"^0+": "", "-": ""}


class TestResultProperty:
    def test_prompt_defaults_to_name(self):
        prop = ResultProperty(name="customerCode")
        assert prop.prompt == "customerCode"

    def test_explicit_prompt(self):
        prop = ResultProperty(name="customerCode", prompt="Customer Code")
        assert prop.prompt == "Customer Code"

    def test_default_type_is_text(self):
        prop = ResultProperty(name="field")
        assert prop.type == "text"


class TestFileSpec:
    def test_default_values_extracts_from_properties(self):
        spec = FileSpec(
            filename="header.txt",
            properties=[
                ResultProperty(name="a", default_value="A"),
                ResultProperty(name="b"),
                ResultProperty(name="c", default_value="C"),
            ]
        )
        assert spec.default_values == {"a": "A", "c": "C"}

    def test_empty_prolog_epilog(self):
        spec = FileSpec(filename="test.txt", properties=[])
        assert spec.prolog == ""
        assert spec.epilog == ""


class TestConfig:
    def test_param_returns_value_if_present(self):
        config = Config(
            name="test",
            description="Test",
            logo="",
            parameters={"submit": "Export"},
            sources=[],
            result=ResultConfig(
                separator=";",
                base_name="test",
                header=FileSpec(filename="h.txt", properties=[]),
                detail=FileSpec(filename="d.txt", properties=[])
            )
        )
        assert config.param("submit") == "Export"

    def test_param_returns_key_if_missing(self):
        config = Config(
            name="test",
            description="Test",
            logo="",
            parameters={},
            sources=[],
            result=ResultConfig(
                separator=";",
                base_name="test",
                header=FileSpec(filename="h.txt", properties=[]),
                detail=FileSpec(filename="d.txt", properties=[])
            )
        )
        assert config.param("missing") == "missing"
