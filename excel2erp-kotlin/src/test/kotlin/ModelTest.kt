import kotlinx.html.InputType
import org.dhatim.fastexcel.Workbook as FastExcelWriter
import org.dhatim.fastexcel.reader.ReadableWorkbook
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipInputStream
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Helper to create test workbooks using FastExcel writer.
 */
private fun createTestWorkbook(builder: FastExcelWriter.() -> Unit): ReadableWorkbook {
    val outputStream = ByteArrayOutputStream()
    FastExcelWriter(outputStream, "Test", "1.0").use { wb ->
        wb.builder()
    }
    return ReadableWorkbook(ByteArrayInputStream(outputStream.toByteArray()))
}

class PropertyTest {

    @Test
    fun `normalize strips non-digits for date type`() {
        val property = Property("date", type = InputType.date)
        assertEquals("20240115", property.normalize("2024-01-15"))
    }

    @Test
    fun `normalize strips slashes for date type`() {
        val property = Property("date", type = InputType.date)
        assertEquals("20240115", property.normalize("2024/01/15"))
    }

    @Test
    fun `normalize preserves text type values`() {
        val property = Property("text", type = InputType.text)
        assertEquals("hello-world", property.normalize("hello-world"))
    }

    @Test
    fun `normalize handles null value`() {
        val property = Property("text")
        assertNull(property.normalize(null))
    }

    @Test
    fun `normalize handles empty string`() {
        val property = Property("date", type = InputType.date)
        assertEquals("", property.normalize(""))
    }

    @Test
    fun `default prompt equals name`() {
        val property = Property("myField")
        assertEquals("myField", property.prompt)
    }

    @Test
    fun `default fyi equals prompt`() {
        val property = Property("myField", prompt = "My Field")
        assertEquals("My Field", property.fyi)
    }

    @Test
    fun `custom fyi overrides prompt`() {
        val property = Property("myField", prompt = "My Field", fyi = "Help text")
        assertEquals("Help text", property.fyi)
    }
}

class SourcePropertyTest {

    @Test
    fun `convert applies single replacement`() {
        val property = SourceProperty("code", "A1", mapOf("old" to "new"))
        assertEquals("new value", property.convert("old value"))
    }

    @Test
    fun `convert applies multiple replacements in sequence`() {
        val property = SourceProperty("code", "A1", mapOf("a" to "b", "b" to "c"))
        assertEquals("c", property.convert("a"))
    }

    @Test
    fun `convert with no replacements returns original`() {
        val property = SourceProperty("code", "A1")
        assertEquals("unchanged", property.convert("unchanged"))
    }

    @Test
    fun `convert handles regex patterns`() {
        val property = SourceProperty("date", "A1", mapOf("/" to "", "-" to ""))
        assertEquals("20240115", property.convert("2024/01/15"))
    }

    @Test
    fun `convert applies all matching occurrences`() {
        val property = SourceProperty("text", "A1", mapOf("x" to "y"))
        assertEquals("yyy", property.convert("xxx"))
    }

    @Test
    fun `convert handles regex special characters`() {
        val property = SourceProperty("code", "A1", mapOf("\\d+" to "NUM"))
        assertEquals("NUM-NUM", property.convert("123-456"))
    }
}

class FileSpecTest {

    @Test
    fun `content generates single line with separator`() {
        val spec = FileSpec(
            filename = "test.txt",
            properties = listOf(
                Property("a"),
                Property("b"),
                Property("c")
            )
        )
        val result = spec.content("\t", mapOf("a" to "1", "b" to "2", "c" to "3"))
        assertEquals("1\t2\t3", result)
    }

    @Test
    fun `content includes prolog and epilog`() {
        val spec = FileSpec(
            filename = "test.txt",
            prolog = "HEADER\n",
            epilog = "\nFOOTER",
            properties = listOf(Property("a"))
        )
        val result = spec.content(",", mapOf("a" to "value"))
        assertEquals("HEADER\nvalue\nFOOTER", result)
    }

    @Test
    fun `content for records joins with newlines`() {
        val spec = FileSpec(
            filename = "test.txt",
            properties = listOf(Property("name"))
        )
        val records = listOf(
            mapOf("name" to "first"),
            mapOf("name" to "second"),
            mapOf("name" to "third")
        )
        val result = spec.content(",", records)
        assertEquals("first\nsecond\nthird", result)
    }

    @Test
    fun `content substitutes index placeholder in records`() {
        val spec = FileSpec(
            filename = "test.txt",
            properties = listOf(
                Property("line", defaultValue = "\${index}"),
                Property("name")
            )
        )
        val records = listOf(
            mapOf("name" to "a"),
            mapOf("name" to "b")
        )
        val result = spec.content(",", records)
        assertEquals("0,a\n1,b", result)
    }

    @Test
    fun `content uses property defaultValue when field missing`() {
        val spec = FileSpec(
            filename = "test.txt",
            properties = listOf(
                Property("provided"),
                Property("missing", defaultValue = "default")
            )
        )
        val result = spec.content(",", mapOf("provided" to "value"))
        assertEquals("value,default", result)
    }

    @Test
    fun `propertyMap lazy initialization`() {
        val spec = FileSpec(
            filename = "test.txt",
            properties = listOf(
                Property("a"),
                Property("b")
            )
        )
        assertEquals(setOf("a", "b"), spec.propertyMap.keys)
        assertEquals("a", spec.propertyMap["a"]?.name)
    }

    @Test
    fun `defaultValues filters properties with defaults`() {
        val spec = FileSpec(
            filename = "test.txt",
            properties = listOf(
                Property("withDefault", defaultValue = "value"),
                Property("withoutDefault"),
                Property("anotherDefault", defaultValue = "other")
            )
        )
        assertEquals(
            mapOf("withDefault" to "value", "anotherDefault" to "other"),
            spec.defaultValues
        )
    }
}

class ResultTest {

    @Test
    fun `filename expands placeholders from props`() {
        val result = Result(
            baseName = "order-\${client}-\${num}",
            separator = "\t",
            header = FileSpec("header.txt", properties = emptyList()),
            detail = FileSpec("detail.txt", properties = emptyList())
        )
        val filename = result.filename("zip", mapOf("client" to "acme", "num" to "123"))
        assertEquals("order-acme-123.zip", filename)
    }

    @Test
    fun `writeZip creates valid ZIP with header and detail entries`() {
        val result = Result(
            baseName = "test",
            separator = "\t",
            header = FileSpec("header.txt", properties = listOf(Property("h1"))),
            detail = FileSpec("detail.txt", properties = listOf(Property("d1")))
        )

        val outputStream = ByteArrayOutputStream()
        result.writeZip(
            outputStream,
            mapOf("h1" to "headerValue"),
            listOf(mapOf("d1" to "detailValue"))
        )

        val zipStream = ZipInputStream(ByteArrayInputStream(outputStream.toByteArray()))
        val entries = mutableListOf<String>()
        var entry = zipStream.nextEntry
        while (entry != null) {
            entries.add(entry.name)
            entry = zipStream.nextEntry
        }

        assertEquals(listOf("header.txt", "detail.txt"), entries)
        zipStream.close()
    }

    @Test
    fun `writeZip writes correct header content`() {
        val result = Result(
            baseName = "test",
            separator = "\t",
            header = FileSpec("header.txt", properties = listOf(Property("a"), Property("b"))),
            detail = FileSpec("detail.txt", properties = emptyList())
        )

        val outputStream = ByteArrayOutputStream()
        result.writeZip(outputStream, mapOf("a" to "1", "b" to "2"), emptyList())

        val zipStream = ZipInputStream(ByteArrayInputStream(outputStream.toByteArray()))
        zipStream.nextEntry // header.txt
        val content = zipStream.bufferedReader().readText()

        assertEquals("1\t2", content)
        zipStream.close()
    }

    @Test
    fun `writeZip writes correct detail content`() {
        val result = Result(
            baseName = "test",
            separator = ",",
            header = FileSpec("header.txt", properties = emptyList()),
            detail = FileSpec("detail.txt", properties = listOf(Property("x"), Property("y")))
        )

        val outputStream = ByteArrayOutputStream()
        result.writeZip(
            outputStream,
            emptyMap(),
            listOf(mapOf("x" to "a", "y" to "b"), mapOf("x" to "c", "y" to "d"))
        )

        val zipStream = ZipInputStream(ByteArrayInputStream(outputStream.toByteArray()))
        zipStream.nextEntry // header.txt
        zipStream.nextEntry // detail.txt
        val content = zipStream.bufferedReader().readText()

        assertEquals("a,b\nc,d", content)
        zipStream.close()
    }
}

class DetailTest {

    @Test
    fun `extract reads from correct origin`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            // Header at B3 (row 2, col 1), data at B4
            ws.value(2, 0, "ignored") // Column A to not trigger termination
            ws.value(2, 1, "Code")    // Column B - actual header
            ws.value(3, 0, "x")       // Column A
            ws.value(3, 1, "ABC")     // Column B - actual data
            ws.value(4, 0, "")        // Terminator row - empty cell at column 0
        }

        val detail = Detail(
            locator = "B3",
            properties = listOf(SourceProperty("ItemCode", "Code"))
        )

        val sheet = workbook.getCachedSheet(0)
        val result = detail.extract(sheet)

        assertEquals(1, result.size)
        assertEquals("ABC", result[0]["ItemCode"])
        workbook.close()
    }

    @Test
    fun `extract filters columns by property locators`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Keep")
            ws.value(0, 1, "Ignore")
            ws.value(0, 2, "AlsoKeep")
            ws.value(1, 0, "A")
            ws.value(1, 1, "B")
            ws.value(1, 2, "C")
            // Row 2 empty - terminates table
        }

        val detail = Detail(
            locator = "A1",
            properties = listOf(
                SourceProperty("first", "Keep"),
                SourceProperty("third", "AlsoKeep")
            )
        )

        val sheet = workbook.getCachedSheet(0)
        val result = detail.extract(sheet)

        assertEquals(1, result.size)
        assertEquals(setOf("first", "third"), result[0].keys)
        assertEquals("A", result[0]["first"])
        assertEquals("C", result[0]["third"])
        workbook.close()
    }

    @Test
    fun `extract maps locator labels to property names`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "OriginalLabel")
            ws.value(1, 0, "value")
            // Row 2 empty
        }

        val detail = Detail(
            locator = "A1",
            properties = listOf(SourceProperty("MappedName", "OriginalLabel"))
        )

        val sheet = workbook.getCachedSheet(0)
        val result = detail.extract(sheet)

        assertEquals("value", result[0]["MappedName"])
        workbook.close()
    }

    @Test
    fun `extract respects endValue terminator`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Name")
            ws.value(1, 0, "First")
            ws.value(2, 0, "TOTAL")
            ws.value(3, 0, "Ignored")
        }

        val detail = Detail(
            locator = "A1",
            endValue = "TOTAL",
            properties = listOf(SourceProperty("name", "Name"))
        )

        val sheet = workbook.getCachedSheet(0)
        val result = detail.extract(sheet)

        assertEquals(1, result.size)
        assertEquals("First", result[0]["name"])
        workbook.close()
    }
}

class SourceTest {

    @Test
    fun `resolveHeader returns extractor and missing properties`() {
        val source = Source(
            name = "test",
            description = "Test Source",
            header = listOf(SourceProperty("available", "A1")),
            detail = Detail("A1", properties = emptyList())
        )

        val headerSpec = FileSpec(
            filename = "header.txt",
            properties = listOf(
                Property("available"),
                Property("missing")
            )
        )

        val (_, missingProperties) = source.resolveHeader(headerSpec)

        assertEquals(1, missingProperties.size)
        assertEquals("missing", missingProperties[0].name)
    }

    @Test
    fun `resolveHeader extractor reads values from workbook`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "HeaderValue")
        }

        val source = Source(
            name = "test",
            description = "Test Source",
            header = listOf(SourceProperty("field", "A1")),
            detail = Detail("A1", properties = emptyList())
        )

        val headerSpec = FileSpec(
            filename = "header.txt",
            properties = listOf(Property("field"))
        )

        val (extractor, _) = source.resolveHeader(headerSpec)
        val result = extractor(workbook)

        assertEquals("HeaderValue", result["field"])
        workbook.close()
    }

    @Test
    fun `resolveHeader extractor applies conversions`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "2024-01-15")
        }

        val source = Source(
            name = "test",
            description = "Test Source",
            header = listOf(SourceProperty("date", "A1", mapOf("-" to ""))),
            detail = Detail("A1", properties = emptyList())
        )

        val headerSpec = FileSpec(
            filename = "header.txt",
            properties = listOf(Property("date"))
        )

        val (extractor, _) = source.resolveHeader(headerSpec)
        val result = extractor(workbook)

        assertEquals("20240115", result["date"])
        workbook.close()
    }

    @Test
    fun `resolveHeader extractor merges defaultValues`() {
        val workbook = createTestWorkbook {
            newWorksheet("Test")
        }

        val source = Source(
            name = "test",
            description = "Test Source",
            header = emptyList(),
            detail = Detail("A1", properties = emptyList()),
            defaultValues = mapOf("sourceDefault" to "fromSource")
        )

        val headerSpec = FileSpec(
            filename = "header.txt",
            properties = listOf(
                Property("sourceDefault"),
                Property("specDefault", defaultValue = "fromSpec")
            )
        )

        val (extractor, _) = source.resolveHeader(headerSpec)
        val result = extractor(workbook)

        assertEquals("fromSource", result["sourceDefault"])
        assertEquals("fromSpec", result["specDefault"])
        workbook.close()
    }

    @Test
    fun `resolveHeader extractor throws on empty required properties`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "   ") // whitespace only
        }

        val source = Source(
            name = "test",
            description = "Test Source",
            header = listOf(SourceProperty("required", "A1")),
            detail = Detail("A1", properties = emptyList())
        )

        val headerSpec = FileSpec(
            filename = "header.txt",
            properties = listOf(Property("required"))
        )

        val (extractor, _) = source.resolveHeader(headerSpec)

        assertFailsWith<IllegalArgumentException> {
            extractor(workbook)
        }
        workbook.close()
    }

    @Test
    fun `resolveDetail returns extractor for detail rows`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Code")
            ws.value(1, 0, "ABC")
            ws.value(2, 0, "DEF")
            // Row 3 empty
        }

        val source = Source(
            name = "test",
            description = "Test Source",
            header = emptyList(),
            detail = Detail("A1", properties = listOf(SourceProperty("ItemCode", "Code")))
        )

        val detailSpec = FileSpec(
            filename = "detail.txt",
            properties = listOf(Property("ItemCode"))
        )

        val extractor = source.resolveDetail(detailSpec)
        val result = extractor(workbook)

        assertEquals(2, result.size)
        assertEquals("ABC", result[0]["ItemCode"])
        assertEquals("DEF", result[1]["ItemCode"])
        workbook.close()
    }

    @Test
    fun `resolveDetail extractor merges default properties`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Code")
            ws.value(1, 0, "ABC")
            // Row 2 empty
        }

        val source = Source(
            name = "test",
            description = "Test Source",
            header = emptyList(),
            detail = Detail("A1", properties = listOf(SourceProperty("ItemCode", "Code")))
        )

        val detailSpec = FileSpec(
            filename = "detail.txt",
            properties = listOf(
                Property("ItemCode"),
                Property("DefaultField", defaultValue = "default")
            )
        )

        val extractor = source.resolveDetail(detailSpec)
        val result = extractor(workbook)

        assertEquals("ABC", result[0]["ItemCode"])
        assertEquals("default", result[0]["DefaultField"])
        workbook.close()
    }

    @Test
    fun `resolveDetail extractor throws on empty required detail properties`() {
        val workbook = createTestWorkbook {
            val ws = newWorksheet("Test")
            // Use endValue terminator so the whitespace row gets extracted
            ws.value(0, 0, "Code")
            ws.value(1, 0, "   ") // whitespace - detected as empty required property
            ws.value(2, 0, "END") // Terminator row
        }

        val source = Source(
            name = "test",
            description = "Test Source",
            header = emptyList(),
            detail = Detail("A1", endValue = "END", properties = listOf(SourceProperty("ItemCode", "Code")))
        )

        val detailSpec = FileSpec(
            filename = "detail.txt",
            properties = listOf(Property("ItemCode"))
        )

        val extractor = source.resolveDetail(detailSpec)

        assertFailsWith<IllegalArgumentException> {
            extractor(workbook)
        }
        workbook.close()
    }
}

class ModelTest {

    @Test
    fun `parameter returns value from parameters map`() {
        val model = Model(
            name = "test",
            description = "Test",
            logo = "logo.png",
            parameters = mapOf("key" to "value"),
            result = Result(
                baseName = "test",
                separator = ",",
                header = FileSpec("h.txt", properties = emptyList()),
                detail = FileSpec("d.txt", properties = emptyList())
            ),
            sources = emptyList()
        )

        assertEquals("value", model.parameter("key"))
    }

    @Test
    fun `parameter throws on missing key`() {
        val model = Model(
            name = "test",
            description = "Test",
            logo = "logo.png",
            parameters = emptyMap(),
            result = Result(
                baseName = "test",
                separator = ",",
                header = FileSpec("h.txt", properties = emptyList()),
                detail = FileSpec("d.txt", properties = emptyList())
            ),
            sources = emptyList()
        )

        assertFailsWith<NullPointerException> {
            model.parameter("missing")
        }
    }
}
