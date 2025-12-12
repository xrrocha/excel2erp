# Excel2ERP

> *"The limits of my language mean the limits of my world."* — Wittgenstein
>
> *"The limits of my configuration mean the limits of my software."* — Every developer

**A polyglot showcase of metadata-driven, functional-style programming.**

Convert Excel order files into ERP import formats using a single YAML configuration that works identically across multiple programming languages.

---

## The Idea

Instead of writing code that hardcodes column names and cell positions for each client:

```python
# ❌ Arithmetic: one function per client
def formato_el_dorado():
    df['codigoArticulo'] = df['Cod.']  # Hardcoded!
```

Write code that **interprets** a configuration:

```yaml
# ✅ Algebra: configuration drives the logic
sources:
  - name: el-dorado
    detail:
      properties:
        - name: ItemCode
          locator: Cod.  # Configurable!
```

Add a new client? Add 15 lines of YAML. Zero code changes.

---

## Implementations

| Language | Directory | Targets | Status |
|----------|-----------|---------|--------|
| 🟣 **Kotlin** | [excel2erp-kotlin/](excel2erp-kotlin/) | JVM, JS | ✅ Complete (JVM) |
| 🔵 **TypeScript** | [excel2erp-typescript/](excel2erp-typescript/) | Browser, Bun/Node | ✅ Complete (Browser) |
| 🟢 **Python** | [excel2erp-python/](excel2erp-python/) | CPython | ✅ Complete |
| 🔴 **Java** | excel2erp-java/ | JVM | 📋 Planned |
| 🟠 **Scala** | excel2erp-scala/ | JVM, JS | 📋 Planned |

**Multi-target languages**: TypeScript, Kotlin, and Scala can run on multiple platforms. The browser target provides a standalone SPA; server targets (JVM, Bun/Node) enable HTMX-style server-rendered UIs.

All implementations:
- Read the **same configuration** ([shared/excel2erp.yaml](shared/excel2erp.yaml))
- Process the **same test fixtures** ([shared/fixtures/](shared/fixtures/))
- Produce **byte-identical output**

---

## Quick Start

### Kotlin

```bash
cd excel2erp-kotlin
./gradlew build
java -jar build/libs/excel2erp.jar
# Open http://localhost:9090
```

### TypeScript

```bash
cd excel2erp-typescript
bun install
bun run dev
# Open http://localhost:5173
```

---

## Project Structure

```
excel2erp/
├── shared/                     # Shared across all implementations
│   ├── excel2erp.yaml          # THE canonical configuration
│   ├── fixtures/               # Test data and expected outputs
│   │   ├── assets/             # Logo images
│   │   ├── excel/              # Sample Excel files
│   │   └── expected/           # Golden output files
│   ├── spec/                   # Configuration schema docs
│   └── docs/                   # Website content (EN, ES, PT)
│
├── excel2erp-kotlin/           # Kotlin implementation
│   └── shared -> ../shared     # Symlink to shared resources
├── excel2erp-typescript/       # TypeScript implementation
│   └── shared -> ../shared     # Symlink to shared resources
├── excel2erp-python/           # Python implementation
│   └── shared -> ../shared     # Symlink to shared resources
└── ...                         # Future implementations
```

> **Note:** Each implementation directory contains a `shared` symlink pointing to `../shared`. This allows each implementation to be self-contained (copy the directory and it works), while maintaining a single source of truth for configuration and test fixtures. Files that appear duplicated across implementations are actually symlinks.

---

## Documentation

Available in three languages:

| Language | Shared Docs | Schema Spec |
|----------|-------------|-------------|
| 🇬🇧 English | [shared/docs/en/](shared/docs/en/) | [config-schema.en.md](shared/spec/config-schema.en.md) |
| 🇪🇸 Spanish | [shared/docs/es/](shared/docs/es/) | config-schema.es.md |
| 🇧🇷 Portuguese | [shared/docs/pt/](shared/docs/pt/) | config-schema.pt.md |

---

## Learn More

- **[The Story](shared/README.md)** — Why this project exists
- **[Configuration Schema](shared/spec/config-schema.en.md)** — How to write configs
- **[Kotlin README](excel2erp-kotlin/README.md)** — Kotlin-specific details
- **[TypeScript README](excel2erp-typescript/README.md)** — TypeScript-specific details

---

## License

MIT License. See individual implementation directories for details.
