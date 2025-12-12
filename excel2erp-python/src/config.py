"""
Configuration Loader - YAML Parsing into Typed Dataclasses

This module bridges the gap between the raw YAML configuration file and the
typed dataclass model used throughout the application. It is a pure parser
with no business logic.

ARCHITECTURAL CONTEXT:
----------------------
In the Excel2ERP data flow, this module sits between file I/O and the domain:

    shared/excel2erp.yaml (file)
            │
            ▼
        config.py (this module) ──parses──▶ model.py dataclasses
                                                     │
                                                     ▼
                                              engine.py (uses)

The YAML structure is defined by the canonical configuration file that all
implementations (Kotlin, TypeScript, Python) share. This parser must faithfully
reproduce that structure in Python dataclasses.

YAML STRUCTURE:
---------------
The expected YAML structure is:

    name: "application-name"
    description: "Human-readable title"
    logo: "logo.png"
    parameters:
      source: "Source Label"
      workbook: "File Picker Label"
      submit: "Export Button Label"
      ...
    sources:
      - name: "source-id"
        description: "Source Display Name"
        logo: "vendor-logo.png"
        sheetIndex: 0
        header:
          - name: "fieldName"
            locator: "A1"
            replacements:
              "pattern": "replacement"
        detail:
          locator: "A10"
          endValue: "TOTAL"
          properties:
            - name: "columnName"
              locator: "Column Header"
    result:
      separator: "\t"
      baseName: "OUTPUT_${field}"
      header:
        filename: "header.txt"
        prolog: "HDR"
        properties:
          - name: "fieldName"
            type: "text"
            prompt: "User Prompt"
            defaultValue: "default"
      detail:
        filename: "detail.txt"
        properties:
          - name: "fieldName"

ERROR HANDLING:
---------------
This parser does minimal validation. It relies on:
1. PyYAML's safe_load for basic YAML syntax
2. Python's KeyError for missing required fields
3. The dataclass constructors for type checking

Production systems might add schema validation (e.g., jsonschema, pydantic).
For this educational project, errors surface as clear Python exceptions.
"""

import yaml
from model import (
    Config, Source, SourceProperty, DetailConfig,
    ResultConfig, FileSpec, ResultProperty
)


def load_config(path: str) -> Config:
    """
    Load and parse a YAML configuration file into a Config object.

    This is the main entry point for configuration loading. It reads the
    YAML file, parses its structure, and constructs the appropriate
    dataclass hierarchy.

    Args:
        path: Path to the YAML configuration file.
              Can be absolute or relative to the current working directory.

    Returns:
        A fully populated Config object ready for use by the application.

    Raises:
        FileNotFoundError: If the configuration file doesn't exist.
        yaml.YAMLError: If the file contains invalid YAML syntax.
        KeyError: If required fields are missing from the configuration.

    Example:
        config = load_config("shared/excel2erp.yaml")
        print(config.description)  # "Pedidos El Dorado"
    """
    # Read and parse the YAML file
    # Using UTF-8 encoding explicitly for cross-platform compatibility
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Parse the sources section
    # Each source defines how to extract data from a specific Excel format
    sources = []
    for src in data.get("sources", []):
        # Parse header properties (single-cell extractions)
        # Each property maps a cell address to a named field
        header_props = [
            SourceProperty(p["name"], p["locator"], p.get("replacements", {}))
            for p in src.get("header", [])
        ]

        # Parse detail properties (table column mappings)
        # Each property maps a column header to a named field
        detail_props = [
            SourceProperty(p["name"], p["locator"], p.get("replacements", {}))
            for p in src["detail"]["properties"]
        ]

        # Construct the Source object with all its nested configuration
        sources.append(Source(
            name=src["name"],
            description=src["description"],
            logo=src.get("logo"),  # Optional vendor logo
            sheet_index=src.get("sheetIndex", 0),  # Default to first sheet
            header=header_props,
            detail=DetailConfig(
                locator=src["detail"]["locator"],  # Table start address
                properties=detail_props,
                end_value=src["detail"].get("endValue")  # Optional sentinel
            ),
            default_values=src.get("defaultValues", {})  # Injected values
        ))

    def parse_file_spec(spec: dict) -> FileSpec:
        """
        Parse an output file specification from YAML.

        This helper function handles the repetitive parsing of header and
        detail file specifications, which share the same structure.

        Args:
            spec: Dictionary from YAML containing file specification.

        Returns:
            A FileSpec object with all properties parsed.
        """
        return FileSpec(
            filename=spec["filename"],
            prolog=spec.get("prolog", ""),  # Optional file prefix
            epilog=spec.get("epilog", ""),  # Optional file suffix
            properties=[
                ResultProperty(
                    name=p["name"],
                    type=p.get("type", "text"),  # Default to text type
                    prompt=p.get("prompt"),  # UI label, defaults to name
                    default_value=p.get("defaultValue")  # Optional default
                )
                for p in spec["properties"]
            ]
        )

    # Parse the result section (output format configuration)
    result = data["result"]

    # Construct and return the top-level Config object
    return Config(
        name=data["name"],
        description=data["description"],
        logo=data.get("logo", ""),  # Optional main application logo
        parameters=data.get("parameters", {}),  # UI localization strings
        sources=sources,
        result=ResultConfig(
            separator=result["separator"],  # Field delimiter (e.g., "\t")
            base_name=result["baseName"],  # Output filename template
            header=parse_file_spec(result["header"]),
            detail=parse_file_spec(result["detail"])
        )
    )
