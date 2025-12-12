"""
Configuration Model - Dataclasses Defining the YAML Configuration Schema

This module defines the Python data structures that mirror the canonical YAML
configuration file (shared/excel2erp.yaml). It is part of the Excel2ERP
educational project demonstrating metadata-driven, "algebraic" programming.

ARCHITECTURAL CONTEXT:
----------------------
Excel2ERP transforms Excel order files into ERP import formats. The transformation
is entirely driven by configuration—no hardcoded business logic. This module
defines the schema for that configuration.

The data flow is:
    YAML file → config.py (parser) → model.py (these dataclasses) → engine.py (extraction)

These dataclasses are pure data containers with no business logic beyond simple
accessors. They form the contract between the config parser and the extraction
engine.

STRUCTURE OVERVIEW:
-------------------
The configuration has three main sections:

1. SOURCES: Where to find data in Excel files
   - Source → one type of Excel file (e.g., "El Dorado orders")
   - SourceProperty → how to extract one field (cell address + optional transforms)
   - DetailConfig → how to extract the line items table

2. RESULT: How to format the output
   - ResultConfig → overall output settings (separator, filenames)
   - FileSpec → specification for one output file (header or detail)
   - ResultProperty → one column in the output file

3. METADATA: Application-level settings
   - Config → top-level container with name, description, UI parameters

The configuration supports multiple "sources" (different Excel formats from
different vendors), but produces a single standardized output format.
"""

from dataclasses import dataclass, field


@dataclass
class SourceProperty:
    """
    Defines how to extract a single property from an Excel sheet.

    For header fields, the locator is a cell address (e.g., "B5").
    For detail fields, the locator is a column header name (e.g., "SKU").

    Attributes:
        name: The property name used in output generation (e.g., "customerCode").
              This becomes a key in the extracted data dictionary.

        locator: Where to find this property in the Excel sheet.
                 - For headers: cell address like "A1", "B5", "AA10"
                 - For details: column header text like "Item", "Quantity"

        replacements: Optional regex transformations applied to extracted values.
                      Keys are regex patterns, values are replacement strings.
                      Example: {"^0+": ""} strips leading zeros.
                      Applied in iteration order (Python 3.7+ dict ordering).
    """
    name: str
    locator: str
    replacements: dict[str, str] = field(default_factory=dict)


@dataclass
class DetailConfig:
    """
    Configuration for extracting the detail table (line items).

    The detail table is the repeating section of an order—typically product lines
    with SKU, quantity, price, etc. This config tells the engine where to find
    the table and how to map its columns.

    Attributes:
        locator: Cell address where the table begins (top-left of header row).
                 Example: "A10" means the table headers start at row 10, column A.

        properties: List of SourceProperty defining which columns to extract
                    and how to name them. Only columns listed here are extracted;
                    other columns in the Excel table are ignored.

        end_value: Optional sentinel value that marks end of data.
                   If the first column contains this value, reading stops.
                   Example: "TOTAL" to stop before a summary row.
                   If None, reading stops at the first empty row.
    """
    locator: str
    properties: list[SourceProperty]
    end_value: str | None = None


@dataclass
class Source:
    """
    Complete extraction configuration for one type of Excel file.

    Each source represents a different Excel format—typically from different
    vendors or systems. The application supports multiple sources, allowing
    users to select which format they're importing.

    Attributes:
        name: Internal identifier for this source (e.g., "eldorado").
              Used in generated output filenames via ${sourceName} placeholder.

        description: Human-readable name shown in the UI dropdown.
                     Example: "El Dorado - Pedidos de Compra"

        sheet_index: Zero-based index of the worksheet to read.
                     Most Excel files use 0 (first sheet).

        header: List of SourceProperty for extracting header fields.
                These are single-cell values like customer code, order date, etc.

        detail: DetailConfig for extracting the line items table.

        logo: Optional filename of vendor logo image (in shared/fixtures/assets/).
              Displayed in the UI when this source is selected.

        default_values: Values to inject without extracting from Excel.
                        Example: {"sourceType": "purchase_order"}
                        These override result defaults but can be overridden by
                        extracted values or user input.
    """
    name: str
    description: str
    sheet_index: int
    header: list[SourceProperty]
    detail: DetailConfig
    logo: str | None = None
    default_values: dict[str, str] = field(default_factory=dict)


@dataclass
class ResultProperty:
    """
    Defines one column in an output file.

    The output files (header and detail) are delimited text files where each
    line has the same columns. This class defines one column.

    Attributes:
        name: Column identifier matching keys in extracted data.
              Must match a SourceProperty.name or be provided by user input.

        type: Data type hint, primarily for UI rendering.
              - "text": Default, renders as text entry field
              - "date": Renders as date picker widget
              The engine treats all values as strings; type only affects UI.

        prompt: Label shown in UI when requesting user input for this property.
                Defaults to the property name if not specified.

        default_value: Value to use if not provided by extraction or user input.
                       Can contain ${placeholder} syntax for expansion.
                       Example: "${sourceName}_${index}" for auto-generated IDs.
    """
    name: str
    type: str = "text"
    prompt: str | None = None
    default_value: str | None = None

    def __post_init__(self):
        """Set prompt to name if not explicitly provided."""
        if self.prompt is None:
            self.prompt = self.name


@dataclass
class FileSpec:
    """
    Specification for one output file (header or detail).

    The ERP import format consists of two files bundled in a ZIP:
    - Header file: Single line with order metadata
    - Detail file: Multiple lines with line items

    Both files share the same structure but contain different data.

    Attributes:
        filename: Name of the file inside the ZIP.
                  Can contain ${placeholder} syntax (e.g., "${sourceName}_HDR.txt").

        properties: Ordered list of columns in this file.
                    Output order matches list order.

        prolog: Optional text prepended to the file (before data lines).
                Useful for file headers or format markers.

        epilog: Optional text appended to the file (after data lines).
                Useful for file footers or checksums.
    """
    filename: str
    properties: list[ResultProperty]
    prolog: str = ""
    epilog: str = ""

    @property
    def default_values(self) -> dict[str, str]:
        """
        Collect default values from all properties in this file spec.

        Returns a dictionary of property name → default value for all
        properties that have a default_value defined. Used as the base
        layer in the value resolution hierarchy.
        """
        return {p.name: p.default_value for p in self.properties if p.default_value}


@dataclass
class ResultConfig:
    """
    Configuration for output file generation.

    Defines the format and structure of the ERP import files.

    Attributes:
        separator: Field delimiter for the output files.
                   Common values: "\t" (tab), ";" (semicolon), "," (comma).

        base_name: Template for the ZIP filename.
                   Supports ${placeholder} syntax.
                   Example: "ORDER_${customerCode}_${orderDate}"

        header: FileSpec for the header output file.

        detail: FileSpec for the detail output file.
    """
    separator: str
    base_name: str
    header: FileSpec
    detail: FileSpec


@dataclass
class Config:
    """
    Top-level application configuration.

    This is the root object parsed from the YAML configuration file.
    It contains everything needed to run the application: metadata,
    source definitions, and output specifications.

    Attributes:
        name: Internal application identifier.

        description: Application title shown in the window title bar.

        logo: Filename of the main application logo (in shared/fixtures/assets/).
              Displayed in the header area of the UI.

        parameters: UI localization strings.
                    Keys are identifiers used in code; values are displayed text.
                    Example: {"source": "Cliente", "workbook": "Archivo pedido"}
                    This allows the same codebase to support multiple languages
                    without code changes.

        sources: List of supported Excel formats.
                 Populates the source selector dropdown in the UI.

        result: Output file configuration.
    """
    name: str
    description: str
    logo: str
    parameters: dict[str, str]
    sources: list[Source]
    result: ResultConfig

    def param(self, name: str) -> str:
        """
        Get a UI parameter value by name.

        Falls back to the name itself if not found, allowing code to work
        even with incomplete parameter definitions.

        Args:
            name: Parameter key (e.g., "source", "workbook", "submit")

        Returns:
            The localized string for that parameter, or the name if not found.
        """
        return self.parameters.get(name, name)
