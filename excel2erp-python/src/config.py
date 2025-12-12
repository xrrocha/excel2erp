"""
Configuration Loader

YAML parsing into Config dataclasses.
"""

import yaml
from model import (
    Config, Source, SourceProperty, DetailConfig,
    ResultConfig, FileSpec, ResultProperty
)


def load_config(path: str) -> Config:
    """Load and parse YAML configuration."""
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    sources = []
    for src in data.get("sources", []):
        header_props = [
            SourceProperty(p["name"], p["locator"], p.get("replacements", {}))
            for p in src.get("header", [])
        ]
        detail_props = [
            SourceProperty(p["name"], p["locator"], p.get("replacements", {}))
            for p in src["detail"]["properties"]
        ]
        sources.append(Source(
            name=src["name"],
            description=src["description"],
            logo=src.get("logo"),
            sheet_index=src.get("sheetIndex", 0),
            header=header_props,
            detail=DetailConfig(
                locator=src["detail"]["locator"],
                properties=detail_props,
                end_value=src["detail"].get("endValue")
            ),
            default_values=src.get("defaultValues", {})
        ))

    def parse_file_spec(spec: dict) -> FileSpec:
        return FileSpec(
            filename=spec["filename"],
            prolog=spec.get("prolog", ""),
            epilog=spec.get("epilog", ""),
            properties=[
                ResultProperty(
                    name=p["name"],
                    type=p.get("type", "text"),
                    prompt=p.get("prompt"),
                    default_value=p.get("defaultValue")
                )
                for p in spec["properties"]
            ]
        )

    result = data["result"]
    return Config(
        name=data["name"],
        description=data["description"],
        logo=data.get("logo", ""),
        parameters=data.get("parameters", {}),
        sources=sources,
        result=ResultConfig(
            separator=result["separator"],
            base_name=result["baseName"],
            header=parse_file_spec(result["header"]),
            detail=parse_file_spec(result["detail"])
        )
    )
