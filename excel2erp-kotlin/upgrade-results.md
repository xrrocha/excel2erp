# Upgrade Results: excel2erp Dependency & Build Modernization

## Summary

This document summarizes all changes made during the excel2erp upgrade session. It includes both planned changes from `upgrade-plan.md` and additional improvements discovered during implementation.

**Date:** December 2025
**Status:** Complete (with documented limitations)

---

## Completed Changes

### Phase 1: Gradle Wrapper Setup ✅

**Planned:** Yes
**Result:** Success

- Added Gradle 9.2.1 wrapper for reproducible builds
- Created files:
  - `gradle/wrapper/gradle-wrapper.jar`
  - `gradle/wrapper/gradle-wrapper.properties`
  - `gradlew` (Unix)
  - `gradlew.bat` (Windows)
- Updated `.gitignore` to include wrapper files

### Phase 2: Build Configuration Updates ✅

**Planned:** Yes
**Result:** Success

#### Plugin Updates

| Plugin | Before | After |
|--------|--------|-------|
| Kover | 0.9.1 | 0.9.3 |
| Shadow | 9.0.0-beta12 | 9.3.0 |
| GraalVM Native | (none) | 0.11.3 |
| Application | (none) | Added |

#### Dependency Updates

| Dependency | Before | After |
|------------|--------|-------|
| Apache POI | 5.4.1 | 5.5.1 |
| Jackson Module Kotlin | 2.19.1 (com.fasterxml) | 3.0.3 (tools.jackson) |
| Jackson YAML | 2.19.1 (com.fasterxml) | 3.0.3 (tools.jackson) |

### Phase 3: Jackson 3.x Migration ✅

**Planned:** Yes
**Result:** Success

All Jackson imports updated from `com.fasterxml.jackson.*` to `tools.jackson.*`:

| File | Changes |
|------|---------|
| `src/main/kotlin/Excel2Erp.kt` | Import updates |
| `src/test/kotlin/DataFlowTest.kt` | Import updates |
| `src/test/kotlin/E2ETest.kt` | Import updates (FQN usage) |

**API Changes:**
- Switched from `ObjectMapper(YAMLFactory())` pattern to `YAMLMapper.builder()` fluent API
- KotlinModule now uses `KotlinModule.Builder().build()`

### Phase 4: GraalVM Native Image Configuration ⚠️

**Planned:** Yes
**Result:** Partial Success

#### What Works
- Native image compiles successfully (~94MB binary)
- Startup time: ~6ms (vs ~500ms for JVM)
- UI/static content serving works correctly
- YAML configuration loading works

#### What Doesn't Work
- Excel file processing fails silently (returns empty response)
- Apache POI's XMLBeans requires extensive reflection configuration beyond current setup

#### Configuration Files Created
- `src/main/resources/META-INF/native-image/reflect-config.json`
- `src/main/resources/META-INF/native-image/resource-config.json`

#### Build Args
```kotlin
buildArgs.add("-H:IncludeResourceBundles=org.apache.xmlbeans.impl.regex.message")
buildArgs.add("-H:+ReportExceptionStackTraces")
```

#### Documentation
Added detailed comment block in `build.gradle.kts` explaining limitations with references:
- https://poi.apache.org/components/spreadsheet/
- https://github.com/oracle/graal/issues/460
- https://www.graalvm.org/latest/reference-manual/native-image/metadata/

---

## Additional Changes (Not in Original Plan)

### E2E Test Refactoring ✅

**Planned:** No (emerged during native image testing)
**Result:** Success

Created parameterized E2E test infrastructure to exercise all server modes:

| Test Class | Server Mode | Condition |
|------------|-------------|-----------|
| `EmbeddedE2ETest` | In-process | Default (no property) |
| `UberjarE2ETest` | java -jar | `-Dtest.serverMode=uberjar` |
| `NativeE2ETest` | Native executable | `-Dtest.serverMode=native` |

**Implementation:**
- Created abstract `AbstractE2ETest` base class with 17 common tests
- Three concrete implementations with JUnit 5 conditional annotations
- Updated `build.gradle.kts` to forward `test.serverMode` system property

**Test Commands:**
```bash
./gradlew test                              # Embedded (default)
./gradlew test -Dtest.serverMode=uberjar    # Uberjar
./gradlew test -Dtest.serverMode=native     # Native
./gradlew test -Dtest.serverMode=all        # Uberjar + Native
```

**Results:**
- Embedded: 17/17 pass
- Uberjar: 17/17 pass
- Native: 12/17 pass (5 download tests fail due to POI limitation)

### Browser Auto-Open Removal ✅

**Planned:** No (emerged during native image testing)
**Result:** Success

- Removed AWT `Desktop.getDesktop().browse()` call from main entry point
- Native image cannot load AWT native libraries
- Server now prints URL to console instead of opening browser

### Config & Source File Renaming ✅

**Planned:** No (user requested during session)
**Result:** Success

| Old Name | New Name |
|----------|----------|
| `demo/wb-server.yaml` | `demo/excel2erp.yml` |
| `src/main/kotlin/WBMain.kt` | `src/main/kotlin/Excel2Erp.kt` |
| Main class: `WBMainKt` | Main class: `Excel2ErpKt` |

**Files Updated:**
- `build.gradle.kts` - 3 main class references
- `src/main/kotlin/Excel2Erp.kt` - config file reference
- `src/test/kotlin/E2ETest.kt` - 2 config file references
- `src/test/kotlin/DataFlowTest.kt` - config file reference
- `demo/run.sh` - command line argument
- `demo/run.bat` - command line argument
- `demo/algebra-vs-aritmetica.html` - code examples

---

## Test Results Summary

### Unit Tests
```
109 tests passed (DataFlowTest, ModelTest, PropertyTest, etc.)
```

### E2E Tests
| Mode | Total | Passed | Failed | Skipped |
|------|-------|--------|--------|---------|
| Embedded | 17 | 17 | 0 | 0 |
| Uberjar | 17 | 17 | 0 | 0 |
| Native | 17 | 12 | 5 | 0 |

**Native Failures:** All 5 failures are download-related tests that require Excel processing:
- `downloaded ZIP contains expected files()`
- `downloaded ZIP has correct filename pattern()`
- `la-nanita completes full flow with all required fields()`
- `la-pinta completes full flow()`
- `submitting valid form triggers download()`

---

## File Changes Summary

### New Files
| File | Description |
|------|-------------|
| `gradle/wrapper/gradle-wrapper.jar` | Wrapper bootstrap |
| `gradle/wrapper/gradle-wrapper.properties` | Gradle 9.2.1 config |
| `gradlew` | Unix wrapper script |
| `gradlew.bat` | Windows wrapper script |
| `src/main/resources/META-INF/native-image/reflect-config.json` | GraalVM reflection config |
| `src/main/resources/META-INF/native-image/resource-config.json` | GraalVM resource config |
| `upgrade-results.md` | This document |

### Renamed Files
| Old | New |
|-----|-----|
| `src/main/kotlin/WBMain.kt` | `src/main/kotlin/Excel2Erp.kt` |
| `demo/wb-server.yaml` | `demo/excel2erp.yml` |

### Modified Files
| File | Changes |
|------|---------|
| `build.gradle.kts` | Plugins, deps, native config, main class refs |
| `src/main/kotlin/Excel2Erp.kt` | Jackson imports, config filename, removed browser open |
| `src/test/kotlin/E2ETest.kt` | Jackson imports, config filename, parameterized modes |
| `src/test/kotlin/DataFlowTest.kt` | Jackson imports, config filename |
| `demo/run.sh` | Config filename |
| `demo/run.bat` | Config filename |
| `demo/algebra-vs-aritmetica.html` | Updated code examples |
| `.gitignore` | Include gradle wrapper |

---

## Known Limitations

### GraalVM Native Image + Apache POI

The native executable cannot process Excel files due to Apache POI's extensive use of:
- Dynamic class loading via XMLBeans
- Reflection-based XML schema processing
- Runtime resource bundle loading

**Workaround:** Use uberjar (`java -jar`) for full functionality, native executable for fast-startup scenarios that don't require Excel processing.

**Future Options:**
1. Use GraalVM tracing agent to generate comprehensive reflection config
2. Replace Apache POI with a native-image-friendly Excel library
3. Accept limitation and document native image as UI-only mode

---

## Commands Reference

### Build
```bash
./gradlew clean build           # Build uberjar
./gradlew nativeCompile         # Build native executable (~5-10 min)
```

### Test
```bash
./gradlew test                              # All unit + embedded E2E
./gradlew test -Dtest.serverMode=uberjar    # Uberjar E2E
./gradlew test -Dtest.serverMode=native     # Native E2E
./gradlew koverHtmlReport                   # Coverage report
```

### Run
```bash
# Uberjar
java -jar build/libs/excel2erp-1.0-SNAPSHOT-all.jar demo/excel2erp.yml

# Native (UI only, no Excel processing)
./build/native/nativeCompile/excel2erp demo/excel2erp.yml
```

---

## Conclusion

The upgrade was largely successful:
- ✅ Gradle 8.10 → 9.2.1 with wrapper
- ✅ Jackson 2.x → 3.x (tools.jackson package)
- ✅ Shadow plugin stable release
- ✅ Kover minor upgrade
- ✅ Apache POI minor upgrade
- ✅ E2E test infrastructure for multiple server modes
- ✅ Cleaner naming (excel2erp.yml, Excel2Erp.kt)
- ⚠️ GraalVM native image (partial - UI works, Excel processing doesn't)

The native image limitation is documented in code and tests, allowing future work to address it if needed.
