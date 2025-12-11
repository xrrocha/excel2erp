---
layout: default
title: "Model.kt"
---

# Model.kt

<p class="snapshot">Código al momento de publicación. <a href="https://github.com/xrrocha/excel2erp/blob/main/excel2erp-kotlin/src/main/kotlin/Model.kt">Ver versión actual en GitHub</a>.</p>

```kotlin
import kotlinx.html.InputType
import kotlinx.html.InputType.text
import org.dhatim.fastexcel.reader.ReadableWorkbook
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

data class Model(
    val name: String,
    val description: String,
    val logo: String,
    val parameters: Map<String, String>,
    val result: Result,
    val sources: List<Source>
) {
    fun parameter(name: String): String = parameters[name]!!
}

data class Result(
    val baseName: String,
    val separator: String,
    val header: FileSpec,
    val detail: FileSpec
) {
    fun filename(extension: String, props: Map<String, String?>): String =
        "${expand(baseName, props)}.$extension"

    fun writeZip(
        outputStream: OutputStream,
        headerData: Map<String, String?>,
        detailData: List<Map<String, String?>>
    ) =
        ZipOutputStream(outputStream).also { zos ->
            zos.putNextEntry(ZipEntry(header.filename))
            zos.write(headerContent(headerData))
            zos.closeEntry()
            zos.putNextEntry(ZipEntry(detail.filename))
            zos.write(detailContent(detailData))
            zos.closeEntry()
            zos.flush()
            zos.close()
        }

    private fun headerContent(fields: Map<String, String?>) =
        header.content(separator, fields).toByteArray()

    private fun detailContent(records: List<Map<String, String?>>) =
        detail.content(separator, records).toByteArray()
}

data class Property(
    val name: String,
    val type: InputType = text,
    val prompt: String = name,
    val fyi: String = prompt,
    val defaultValue: String? = null
) {
    companion object {
        val NotDigit = "\\D+".toRegex()
    }

    fun normalize(value: String?) =
        value?.let {
            when (type) {
                InputType.date -> it.replace(NotDigit, "")
                else -> it
            }
        }
}

data class FileSpec(
    val filename: String,
    val prolog: String = "",
    val epilog: String = "",
    val properties: List<Property>
) {

    val propertyMap by lazy { properties.associateBy(Property::name) }
    val defaultValues by lazy {
        properties.filter { it.defaultValue != null }
            .associate { it.name to it.defaultValue }
    }

    fun content(separator: String, fields: Map<String, String?>) =
        prolog + line(separator, fields, emptyMap()) + epilog

    fun content(
        separator: String,
        records: List<Map<String, String?>>
    ): String =
        prolog + content(separator, records, emptyMap()) + epilog

    private fun content(
        separator: String,
        records: List<Map<String, String?>>,
        placeHolders: Map<String, String>
    ): String =
        records.withIndex()
            .joinToString("\n") { (index, record) ->
                line(
                        separator,
                        record,
                        placeHolders + ("index" to index.toString())
                )
            }

    private fun line(
        separator: String,
        fields: Map<String, String?>,
        substitutions: Map<String, String>
    ): String =
        properties.joinToString(separator) { property ->
            val propertyValue = fields[property.name] ?: property.defaultValue
            expand(asString(propertyValue), substitutions)
        }
}

data class SourceProperty(
    val name: String,
    val locator: String,
    val replacements: Map<String, String> = emptyMap()
) {
    private val conversions = replacements.map { (expr, replacement) ->
        Pair(
                expr.toRegex(),
                replacement
        )
    }

    fun convert(str: String) =
        conversions.fold(str) { value, (regex, replacement) ->
            regex.replace(value, replacement)
        }
}

data class Source(
    val name: String,
    val description: String,
    val logo: String? = null,
    val sheetIndex: Int = 0,
    val header: List<SourceProperty> = emptyList(),
    val detail: Detail,
    val defaultValues: Map<String, String?> = emptyMap()
) {

    fun resolveHeader(
        headerSpec: FileSpec
    ): Pair<(ReadableWorkbook) -> Map<String, String?>, List<Property>> {

        val headerMap =
            header.associateBy { headerProperty -> headerProperty.name }

        val (presentProperties, absentProperties) =
            headerSpec.properties.partition { property ->
                headerMap.containsKey(property.name)
            }

        val providedDefaultValues = headerSpec.defaultValues + defaultValues
        val missingProperties = absentProperties.filterNot { absentProperty ->
            providedDefaultValues.containsKey(absentProperty.name)
        }

        val extractor = { wb: ReadableWorkbook ->
            val sheet = wb.getCachedSheet(sheetIndex)
            providedDefaultValues +
                    presentProperties.associate { property ->
                        val sourceProperty = headerMap[property.name]!!
                        val cellAddress = CellAddress(sourceProperty.locator)
                        val cellValue = sheet.cellAsString(
                                cellAddress.row,
                                cellAddress.column
                        )
                        Pair(
                                property.name,
                                cellValue?.let(sourceProperty::convert)
                        )
                    }
                        .also { map ->
                            val emptyProperties = emptyProperties(map)
                            if (emptyProperties.isNotEmpty()) {
                                val list = emptyProperties.sorted()
                                    .joinToString(", ", "[", "]")
                                throw IllegalArgumentException("Missing properties: $list")
                            }
                        }
        }

        return Pair(extractor, missingProperties)
    }

    fun resolveDetail(
        detailSpec: FileSpec
    ): (ReadableWorkbook) -> List<Map<String, String?>> {
        val detailMap =
            detail.properties.associateBy { detailProperty ->
                detailProperty.name
            }

        val defaultProperties = detailSpec.properties
            .filterNot { property ->
                detailMap.containsKey(property.name)
            }
            .associate { property ->
                Pair(
                        property.name,
                        detailSpec.propertyMap[property.name]?.defaultValue
                )
            }

        return { wb: ReadableWorkbook ->
            detail.extract(wb.getCachedSheet(sheetIndex)).map { record ->
                defaultProperties + record
            }
                .also { records ->
                    val emptyRecords =
                        records.withIndex()
                            .map { (index, record) ->
                                index to emptyProperties(
                                        record
                                )
                            }
                            .filter { (_, emptyProperties) ->
                                emptyProperties.isNotEmpty()
                            }
                            .map { (index, emptyProperties) ->
                                "row($index): ${
                                    emptyProperties.joinToString(
                                            ", ",
                                            "[",
                                            "]"
                                    )
                                }"
                            }
                    if (emptyRecords.isNotEmpty()) {
                        val list = emptyRecords.joinToString(", ", "{", "}")
                        throw IllegalArgumentException(
                                "${emptyRecords.size} details in error: $list"
                        )
                    }
                }
        }
    }

    private fun emptyProperties(map: Map<String, String?>) =
        map
            .filter { (_, value) -> value?.trim().isNullOrBlank() }
            .keys
            .sorted()
}

data class Detail(
    val locator: String,
    val endValue: String? = null,
    val properties: List<SourceProperty>
) {

    private val origin = CellAddress(locator)
    private val labels =
        properties.associate { property -> property.locator to property.name }

    fun extract(sheet: CachedSheet): List<Map<String, String?>> =
        sheet.readTable(origin.row, origin.column, endValue)
            .map { row ->
                row
                    .filterKeys(labels::containsKey)
                    .map { (name, value) -> labels[name]!! to value }.toMap()
            }
}
```

---

<div class="nav">
  <a class="prev" href="../05-model.html">← Volver a "Un Vistazo al Motor"</a>
</div>
