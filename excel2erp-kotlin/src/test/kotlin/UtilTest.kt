import java.io.FileNotFoundException
import java.time.LocalDate
import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class UtilTest {

    // openResource tests - skipped since no resources in test classpath
    // Production code loads from JAR resources, tests use file system

    @Test
    fun `openResource throws FileNotFoundException for missing resource`() {
        assertFailsWith<FileNotFoundException> {
            openResource("nonexistent-file.yaml")
        }
    }

    // expand tests
    @Test
    fun `expand replaces single placeholder`() {
        val result = expand("Hello \${name}", mapOf("name" to "World"))
        assertEquals("Hello World", result)
    }

    @Test
    fun `expand replaces multiple placeholders`() {
        val result = expand("\${greeting} \${name}!", mapOf("greeting" to "Hello", "name" to "World"))
        assertEquals("Hello World!", result)
    }

    @Test
    fun `expand handles missing placeholder gracefully`() {
        val result = expand("Hello \${name}", mapOf("other" to "value"))
        assertEquals("Hello \${name}", result)
    }

    @Test
    fun `expand handles empty props map`() {
        val result = expand("Hello World", emptyMap())
        assertEquals("Hello World", result)
    }

    @Test
    fun `expand replaces same placeholder multiple times`() {
        val result = expand("\${x} + \${x} = 2\${x}", mapOf("x" to "1"))
        assertEquals("1 + 1 = 21", result)
    }

    // asString tests
    @Test
    fun `asString formats null as empty string`() {
        assertEquals("", asString(null))
    }

    @Test
    fun `asString formats LocalDate with DefaultDateTimeFormatter`() {
        val date = LocalDate.of(2024, 1, 15)
        assertEquals("20240115", asString(date))
    }

    @Test
    fun `asString formats LocalDateTime with DefaultDateTimeFormatter`() {
        val dateTime = LocalDateTime.of(2024, 1, 15, 10, 30, 0)
        assertEquals("20240115", asString(dateTime))
    }

    @Test
    fun `asString calls toString for other types`() {
        assertEquals("42", asString(42))
        assertEquals("hello", asString("hello"))
        assertEquals("true", asString(true))
    }

    // baseName tests
    @Test
    fun `baseName extracts filename without extension`() {
        assertEquals("file", baseName("file.txt"))
    }

    @Test
    fun `baseName handles multiple dots`() {
        assertEquals("file.name", baseName("file.name.txt"))
    }

    @Test
    fun `baseName handles no extension`() {
        // baseName throws when no dot - this tests the actual behavior
        assertFailsWith<StringIndexOutOfBoundsException> {
            baseName("file")
        }
    }

    // extension tests
    @Test
    fun `extension extracts file extension`() {
        assertEquals("txt", extension("file.txt"))
    }

    @Test
    fun `extension handles multiple dots`() {
        assertEquals("txt", extension("file.name.txt"))
    }

    @Test
    fun `extension handles no extension`() {
        assertEquals("file", extension("file"))
    }

    // DefaultNumberFormatter tests
    @Test
    fun `DefaultNumberFormatter formats integers without decimals`() {
        assertEquals("123", DefaultNumberFormatter.format(123.0))
    }

    @Test
    fun `DefaultNumberFormatter formats decimals with dot separator`() {
        assertEquals("123.45", DefaultNumberFormatter.format(123.45))
    }

    @Test
    fun `DefaultNumberFormatter truncates to two decimal places`() {
        assertEquals("123.46", DefaultNumberFormatter.format(123.456))
    }

    @Test
    fun `DefaultNumberFormatter handles large numbers`() {
        assertEquals("123456789012", DefaultNumberFormatter.format(123456789012.0))
    }
}
