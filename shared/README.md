# The Excel2ERP Story

*A tale of gifts, love, and the difference between arithmetic and algebra in programming.*

---

## The Origin

It started with an email marked "URGENT."

A dairy company in South America—let's call them *Rey Pepinito*—needed to import customer orders into their ERP system. The orders arrived as Excel files, but each of their retail clients sent orders in different formats: different column names, different cell positions, different date formats.

The first solution was **arithmetic**: a Python script with five functions, one per client. Each function hardcoded the file path, column names, and output format. Copy-paste programming at its finest.

```python
def formato_el_dorado():
    df = pd.read_excel('data/el-dorado.xlsx', dtype={'Cod.':'str'})
    formatowms['codigoArticulo'] = df['Cod.']
    # ... 15 more lines of identical structure
    formatowms.to_excel('WMS_Pedido_ElDorado.xlsx')

def formato_cascabel():
    df = pd.read_excel('data/cascabel.xlsx', dtype={'CODIGO':'str'})
    formatowms['codigoArticulo'] = df['CODIGO']
    # ... the same 15 lines, with different column names
```

It worked. Then client six arrived. Then client seven. Each new client meant copying a function, changing magic strings, and praying nothing broke.

The developer who wrote it emigrated. The "solution" became an orphan.

---

## The Algebraic Turn

The insight was simple: **separate the what from the how**.

Instead of code that says "read column 'Cod.' from row 8," write code that says "read the column named by `config.detail.properties[0].locator` starting at `config.detail.locator`."

The specific values move to configuration; the code becomes a generic interpreter.

```yaml
sources:
  - name: el-dorado
    description: Mercados El Dorado
    defaultValues:
      CardCode: C800197225
    header:
      - name: NumAtCard
        locator: E2
    detail:
      locator: A8
      properties:
        - name: ItemCode
          locator: Cod.
        - name: Quantity
          locator: Cant.
```

Adding a new client now means adding 15 lines of YAML. Zero code changes. Zero recompilation. Zero risk of breaking existing clients.

This is the difference between **arithmetic** and **algebra**:
- Arithmetic solves *one* problem
- Algebra solves *a class* of problems

---

## The Educational Mission

This project demonstrates the pattern across multiple programming languages:

| Language | Key Libraries | Status |
|----------|---------------|--------|
| **Kotlin** | Javalin, FastExcel, Jackson YAML | ✅ Complete |
| **TypeScript** | Alpine.js, SheetJS, JSZip | ✅ Complete |
| **Python** | Flask, openpyxl, PyYAML | 📋 Planned |
| **Java** | Javalin, Apache POI, Jackson | 📋 Planned |
| **Scala** | Cask, Li Haoyi ecosystem | 📋 Planned |

Each implementation:
- Reads the **same YAML configuration**
- Processes the **same Excel test files**
- Produces **byte-identical output**

The configuration is the specification. The code is just an interpreter.

---

## What You'll Learn

### For "Arithmeticians"

Developers who solve each problem from scratch will learn:
- Configuration over code
- The interpreter pattern
- Separation of concerns
- How abstraction reduces complexity

### For Language Learners

Developers learning a new language will find:
- Idiomatic solutions to a real problem
- Shared test fixtures ensuring identical behavior
- A problem complex enough to be interesting, simple enough to understand

---

## The Fixtures

The `fixtures/` directory contains everything you need to test parity:

```
fixtures/
├── assets/          # Logo images for the UI
├── excel/           # Sample order files (5 clients)
└── expected/        # Golden output files
    ├── el-dorado/
    │   ├── cabecera.txt
    │   └── detalle.txt
    └── ...
```

The canonical configuration is `excel2erp.yaml` in this directory.

---

## Latin American Roots

This project was born in Ecuador, solving a real problem for a real dairy company. The fictional "Rey Pepinito" and its clients—El Dorado, Cascabel, La Ñañita, La Pinta, ÜberGroß—preserve the flavor of that origin.

The documentation is available in:
- 🇬🇧 English
- 🇪🇸 Spanish
- 🇧🇷 Portuguese

---

*"The limits of my configuration mean the limits of my software."*
— Every developer who's ever hardcoded a value
