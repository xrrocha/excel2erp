# Upgrade Plan: excel2erp Dependency & Build Modernization

## Overview

This document details the upgrade plan for modernizing the excel2erp project's build system and dependencies, including:
- Gradle 8.10 → 9.2.1
- Jackson 2.x → 3.x
- Various dependency updates
- GraalVM Native Image support (new)

## Current State

| Component | Current Version |
|-----------|-----------------|
| Gradle | 8.10 (external, no wrapper) |
| Kotlin | 2.2.21 |
| Kover | 0.9.1 |
| Shadow | 9.0.0-beta12 |
| kotlinx-datetime | 0.7.1 |
| Javalin | 6.7.0 |
| Apache POI | 5.4.1 |
| kotlinx-html-jvm | 0.12.0 |
| Jackson Kotlin | 2.19.1 (com.fasterxml.jackson) |
| Jackson YAML | 2.19.1 (com.fasterxml.jackson) |
| SLF4J Simple | 2.0.17 |
| Playwright | 1.56.0 |

## Target State

| Component | Target Version | Change Type |
|-----------|----------------|-------------|
| Gradle | 9.2.1 | Major upgrade |
| Kotlin | 2.2.21 | No change |
| Kover | 0.9.3 | Minor upgrade |
| Shadow | 9.3.0 | Stable release |
| GraalVM Native Plugin | 0.11.3 | **New** |
| kotlinx-datetime | 0.7.1 | No change |
| Javalin | 6.7.0 | No change |
| Apache POI | 5.5.1 | Minor upgrade |
| kotlinx-html-jvm | 0.12.0 | No change |
| Jackson Kotlin | 3.0.3 (tools.jackson) | **Major upgrade** |
| Jackson YAML | 3.0.3 (tools.jackson) | **Major upgrade** |
| SLF4J Simple | 2.0.17 | No change |
| Playwright | 1.56.0 | No change |

---

## Phase 1: Gradle Wrapper Setup

### Objective
Add Gradle wrapper to the project for reproducible builds, targeting Gradle 9.2.1.

### Actions

1. **Generate wrapper using system Gradle:**
   ```bash
   /Users/ricardo/.sdkman/candidates/gradle/current/bin/gradle wrapper --gradle-version 9.2.1
   ```

2. **Files created:**
   - `gradle/wrapper/gradle-wrapper.jar` - Wrapper bootstrap JAR
   - `gradle/wrapper/gradle-wrapper.properties` - Version configuration
   - `gradlew` - Unix shell script
   - `gradlew.bat` - Windows batch script

3. **Verify `.gitignore`:**
   - Ensure `.gradle/` is ignored (build cache)
   - Ensure `gradle/wrapper/` is NOT ignored (should be committed)

### Verification
```bash
./gradlew --version
# Should output: Gradle 9.2.1
```

---

## Phase 2: Update build.gradle.kts

### 2.1 Plugin Updates

**Before:**
```kotlin
plugins {
    kotlin("jvm") version "2.2.21"
    id("org.jetbrains.kotlinx.kover") version "0.9.1"
    id("com.gradleup.shadow") version "9.0.0-beta12"
}
```

**After:**
```kotlin
plugins {
    kotlin("jvm") version "2.2.21"
    id("org.jetbrains.kotlinx.kover") version "0.9.3"
    id("com.gradleup.shadow") version "9.3.0"
    id("org.graalvm.buildtools.native") version "0.11.3"
    application
}
```

### 2.2 Dependency Updates

**Before:**
```kotlin
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.7.1")
    implementation("io.javalin:javalin:6.7.0")
    implementation("org.apache.poi:poi-ooxml:5.4.1")
    implementation("org.jetbrains.kotlinx:kotlinx-html-jvm:0.12.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.19.1")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:2.19.1")
    implementation("org.slf4j:slf4j-simple:2.0.17")

    testImplementation(kotlin("test"))
    testImplementation("com.microsoft.playwright:playwright:1.56.0")
}
```

**After:**
```kotlin
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.7.1")
    implementation("io.javalin:javalin:6.7.0")
    implementation("org.apache.poi:poi-ooxml:5.5.1")                          // Updated
    implementation("org.jetbrains.kotlinx:kotlinx-html-jvm:0.12.0")
    implementation("tools.jackson.module:jackson-module-kotlin:3.0.3")        // Major change
    implementation("tools.jackson.dataformat:jackson-dataformat-yaml:3.0.3")  // Major change
    implementation("org.slf4j:slf4j-simple:2.0.17")

    testImplementation(kotlin("test"))
    testImplementation("com.microsoft.playwright:playwright:1.56.0")
}
```

### 2.3 Application Configuration (New)

Required for both Shadow and GraalVM Native Image:

```kotlin
application {
    mainClass.set("WBMainKt")
}
```

### 2.4 GraalVM Native Image Configuration (New)

```kotlin
graalvmNative {
    binaries {
        named("main") {
            imageName.set("excel2erp")
            mainClass.set("WBMainKt")

            // Apache POI / XMLBeans requirements
            buildArgs.add("-H:IncludeResourceBundles=org.apache.xmlbeans.impl.regex.message")

            // Jackson requirements (annotations remain in old package)
            buildArgs.add("--initialize-at-build-time=com.fasterxml.jackson.annotation.JsonProperty\$Access")

            // Fallback mode if reflection config is incomplete
            buildArgs.add("-H:+ReportExceptionStackTraces")
        }
    }

    // Enable tracing agent for generating reflection configs
    agent {
        defaultMode.set("standard")
    }
}
```

### 2.5 Remove Unused Imports

The following imports in build.gradle.kts may become unnecessary and should be reviewed:

```kotlin
// These may no longer be needed:
import org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile
import org.jetbrains.kotlin.gradle.dsl.jvm.JvmTargetValidationMode
import org.gradle.kotlin.dsl.invoke
import org.gradle.kotlin.dsl.kotlin
```

### 2.6 Shadow JAR Configuration

Update to work with application plugin:

```kotlin
tasks {
    named<com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar>("shadowJar") {
        archiveBaseName.set("excel2erp")
        archiveClassifier.set("all")
        mergeServiceFiles()
        manifest {
            attributes(mapOf("Main-Class" to "WBMainKt"))
        }
    }

    build {
        dependsOn(shadowJar)
    }
}
```

---

## Phase 3: Jackson 3.x Migration

### 3.1 Package Changes

Jackson 3.x uses a new root package. All imports must be updated:

| Jackson 2.x Package | Jackson 3.x Package |
|---------------------|---------------------|
| `com.fasterxml.jackson.databind` | `tools.jackson.databind` |
| `com.fasterxml.jackson.dataformat.yaml` | `tools.jackson.dataformat.yaml` |
| `com.fasterxml.jackson.module.kotlin` | `tools.jackson.module.kotlin` |

**Note:** `com.fasterxml.jackson.annotation` remains unchanged (for backward compatibility).

### 3.2 Files Requiring Changes

#### Server.kt
```kotlin
// Before
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule

// After
import tools.jackson.databind.ObjectMapper
import tools.jackson.dataformat.yaml.YAMLFactory
import tools.jackson.module.kotlin.KotlinModule
```

#### WBMain.kt
```kotlin
// Before
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule

// After
import tools.jackson.databind.ObjectMapper
import tools.jackson.dataformat.yaml.YAMLFactory
import tools.jackson.module.kotlin.KotlinModule
```

#### DataFlowTest.kt
```kotlin
// Before
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule

// After
import tools.jackson.databind.ObjectMapper
import tools.jackson.dataformat.yaml.YAMLFactory
import tools.jackson.module.kotlin.KotlinModule
```

#### E2ETest.kt
```kotlin
// Before
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule

// After
import tools.jackson.databind.ObjectMapper
import tools.jackson.dataformat.yaml.YAMLFactory
import tools.jackson.module.kotlin.KotlinModule
```

### 3.3 API Compatibility

The core API (`ObjectMapper`, `readValue`, `registerModule`) remains compatible. Key differences:

| Aspect | Jackson 2.x | Jackson 3.x |
|--------|-------------|-------------|
| `ObjectMapper` mutability | Mutable | Immutable (use builders) |
| `FAIL_ON_UNKNOWN_PROPERTIES` | Enabled by default | Disabled by default |
| `WRITE_DATES_AS_TIMESTAMPS` | Disabled by default | Enabled by default |
| Java 8 time module | Separate dependency | Built-in |

For this codebase, the existing usage patterns should work without API changes beyond imports.

---

## Phase 4: GraalVM Native Image Configuration

### 4.1 Overview

Apache POI uses extensive reflection (via XMLBeans), requiring explicit configuration for Native Image compilation.

### 4.2 Configuration Files

Create directory: `src/main/resources/META-INF/native-image/`

#### Option A: Generate via Tracing Agent (Recommended)

Run the application with the tracing agent to auto-generate configs:

```bash
./gradlew -Pagent run --args="path/to/config.yaml"
# or
./gradlew -Pagent nativeTest
```

This generates:
- `reflect-config.json`
- `resource-config.json`
- `jni-config.json`
- `proxy-config.json`
- `serialization-config.json`

#### Option B: Manual Configuration

Create `src/main/resources/META-INF/native-image/reflect-config.json`:

```json
[
  {
    "name": "org.apache.poi.xssf.usermodel.XSSFWorkbook",
    "allDeclaredConstructors": true,
    "allDeclaredMethods": true
  },
  {
    "name": "org.apache.xmlbeans.impl.store.Locale",
    "allDeclaredConstructors": true,
    "allDeclaredMethods": true
  }
  // Additional entries will be needed - use tracing agent
]
```

Create `src/main/resources/META-INF/native-image/resource-config.json`:

```json
{
  "resources": {
    "includes": [
      {"pattern": "org/apache/poi/.*"},
      {"pattern": "org/apache/xmlbeans/.*"},
      {"pattern": ".*\\.xsd"},
      {"pattern": ".*\\.xml"}
    ]
  },
  "bundles": [
    {"name": "org.apache.xmlbeans.impl.regex.message"}
  ]
}
```

### 4.3 Known Issues with Apache POI

1. **XMLBeans reflection** - Extensive reflection config required
2. **Resource bundles** - Must explicitly include regex message bundle
3. **Schema loading** - XML schemas must be included as resources
4. **Build time** - Native image compilation may take 5-10 minutes

### 4.4 Fallback Strategy

If native image proves too problematic, the feature can be disabled while retaining other upgrades:

```kotlin
// Comment out in build.gradle.kts:
// id("org.graalvm.buildtools.native") version "0.11.3"
```

---

## Phase 5: Verification

### 5.1 Build Verification

```bash
# Clean build
./gradlew clean build

# Expected: BUILD SUCCESSFUL
# Outputs:
#   - build/libs/excel2erp-1.0-SNAPSHOT.jar
#   - build/libs/excel2erp-1.0-SNAPSHOT-all.jar (shadow)
```

### 5.2 Test Verification

```bash
# Run all tests
./gradlew test

# Expected: 109 tests passed
```

### 5.3 Coverage Verification

```bash
# Generate coverage report
./gradlew koverHtmlReport

# Expected: Report at build/reports/kover/html/index.html
# Target: >95% line coverage
```

### 5.4 Native Image Verification

```bash
# Build native executable
./gradlew nativeCompile

# Expected: build/native/nativeCompile/excel2erp
# Note: This may take 5-10 minutes

# Test native executable
./build/native/nativeCompile/excel2erp --help
```

### 5.5 Functional Verification

```bash
# Run with JAR
java -jar build/libs/excel2erp-1.0-SNAPSHOT-all.jar demo/wb-server.yaml

# Run with native executable
./build/native/nativeCompile/excel2erp demo/wb-server.yaml

# Both should start server on configured port
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `gradle/wrapper/gradle-wrapper.properties` | Create | Gradle 9.2.1 config |
| `gradle/wrapper/gradle-wrapper.jar` | Create | Wrapper bootstrap |
| `gradlew` | Create | Unix wrapper script |
| `gradlew.bat` | Create | Windows wrapper script |
| `build.gradle.kts` | Modify | Plugins, deps, native config |
| `src/main/kotlin/Server.kt` | Modify | Jackson imports |
| `src/main/kotlin/WBMain.kt` | Modify | Jackson imports |
| `src/test/kotlin/DataFlowTest.kt` | Modify | Jackson imports |
| `src/test/kotlin/E2ETest.kt` | Modify | Jackson imports |
| `src/main/resources/META-INF/native-image/*` | Create | Reflection configs |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Jackson 3.x API incompatibility | Low | Medium | API usage is basic; imports are mechanical change |
| Gradle 9.x plugin compatibility | Low | High | Shadow 9.3 and Kover 0.9.3 tested with Gradle 9 |
| Native image build failure | Medium | Low | Feature is additive; can be disabled without affecting JAR |
| Apache POI reflection issues | High | Medium | Use tracing agent; extensive config may be needed |
| Test failures after upgrade | Low | Medium | Run tests incrementally after each phase |

---

## Rollback Plan

If critical issues arise:

1. **Gradle**: Remove wrapper, use external Gradle 8.10
2. **Jackson**: Revert to 2.19.1 with old coordinates
3. **Native Image**: Remove plugin from build.gradle.kts
4. **Other deps**: Revert individual version numbers

Git provides full rollback capability:
```bash
git checkout HEAD -- build.gradle.kts src/
```

---

## Timeline Estimate

| Phase | Estimated Effort |
|-------|------------------|
| Phase 1: Gradle Wrapper | ~5 minutes |
| Phase 2: build.gradle.kts | ~15 minutes |
| Phase 3: Jackson Migration | ~10 minutes |
| Phase 4: Native Image Config | ~30-60 minutes (iterative) |
| Phase 5: Verification | ~20 minutes |

**Total: ~1-2 hours** (excluding native image troubleshooting)

---

## Post-Upgrade Maintenance

1. **Delete this file** after successful upgrade
2. **Update README** if native executable usage differs
3. **Document native image build** in project docs if retained
4. **Monitor** for Jackson 3.x or Gradle 9.x issues in production
