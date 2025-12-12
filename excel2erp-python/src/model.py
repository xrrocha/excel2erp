"""
Configuration Model

Dataclasses defining the YAML configuration schema.
"""

from dataclasses import dataclass, field


@dataclass
class SourceProperty:
    """Property extraction: name, cell/column locator, optional replacements."""
    name: str
    locator: str
    replacements: dict[str, str] = field(default_factory=dict)


@dataclass
class DetailConfig:
    """Detail table extraction: starting cell and column mappings."""
    locator: str
    properties: list[SourceProperty]
    end_value: str | None = None


@dataclass
class Source:
    """Source-specific extraction configuration."""
    name: str
    description: str
    sheet_index: int
    header: list[SourceProperty]
    detail: DetailConfig
    logo: str | None = None
    default_values: dict[str, str] = field(default_factory=dict)


@dataclass
class ResultProperty:
    """Output property with optional default and type."""
    name: str
    type: str = "text"
    prompt: str | None = None
    default_value: str | None = None

    def __post_init__(self):
        if self.prompt is None:
            self.prompt = self.name


@dataclass
class FileSpec:
    """Output file specification."""
    filename: str
    properties: list[ResultProperty]
    prolog: str = ""
    epilog: str = ""

    @property
    def default_values(self) -> dict[str, str]:
        return {p.name: p.default_value for p in self.properties if p.default_value}


@dataclass
class ResultConfig:
    """Result output configuration."""
    separator: str
    base_name: str
    header: FileSpec
    detail: FileSpec


@dataclass
class Config:
    """Full application configuration."""
    name: str
    description: str
    logo: str
    parameters: dict[str, str]
    sources: list[Source]
    result: ResultConfig

    def param(self, name: str) -> str:
        return self.parameters.get(name, name)
