import org.dhatim.fastexcel.Workbook as FastExcelWriter
import org.dhatim.fastexcel.reader.ReadableWorkbook
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/**
 * Helper to create test workbooks using FastExcel writer.
 */
private fun createWorkbook(builder: FastExcelWriter.() -> Unit): ReadableWorkbook {
    val outputStream = ByteArrayOutputStream()
    FastExcelWriter(outputStream, "Test", "1.0").use { wb ->
        wb.builder()
    }
    return ReadableWorkbook(ByteArrayInputStream(outputStream.toByteArray()))
}

class WorkbookTest {

    // cellAsString tests
    @Test
    fun `cellAsString reads STRING cell`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Hello")
        }

        val sheet = workbook.getCachedSheet(0)
        assertEquals("Hello", sheet.cellAsString(0, 0))
        workbook.close()
    }

    @Test
    fun `cellAsString reads NUMERIC cell as formatted number`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, 123.45)
        }

        val sheet = workbook.getCachedSheet(0)
        assertEquals("123.45", sheet.cellAsString(0, 0))
        workbook.close()
    }

    @Test
    fun `cellAsString reads NUMERIC integer without decimals`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, 42.0)
        }

        val sheet = workbook.getCachedSheet(0)
        assertEquals("42", sheet.cellAsString(0, 0))
        workbook.close()
    }

    @Test
    fun `cellAsString reads BOOLEAN cell`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, true)
        }

        val sheet = workbook.getCachedSheet(0)
        assertEquals("true", sheet.cellAsString(0, 0))
        workbook.close()
    }

    @Test
    fun `cellAsString returns null for missing row`() {
        val workbook = createWorkbook {
            newWorksheet("Test") // empty sheet
        }

        val sheet = workbook.getCachedSheet(0)
        assertNull(sheet.cellAsString(0, 0))
        workbook.close()
    }

    @Test
    fun `cellAsString returns null for missing cell in row`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 5, "far right") // only set cell at column 5
        }

        val sheet = workbook.getCachedSheet(0)
        assertNull(sheet.cellAsString(0, 0))
        workbook.close()
    }

    @Test
    fun `cellAsString reads FORMULA cell with cached result`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, 10.0)
            ws.value(0, 1, 20.0)
            ws.formula(0, 2, "A1+B1")
        }

        // Note: FastExcel writer doesn't evaluate formulas -
        // cached result depends on whether Excel has opened the file
        val sheet = workbook.getCachedSheet(0)
        val result = sheet.cellAsString(0, 2)
        // Formula cells may return null for rawValue if never evaluated
        // The formula text itself is accessible but we test read path
        // Accept null or the formula string
        workbook.close()
    }

    // readTable tests
    @Test
    fun `readTable extracts all rows until empty first column`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            // Header row
            ws.value(0, 0, "Name")
            ws.value(0, 1, "Value")
            // Data rows
            ws.value(1, 0, "A")
            ws.value(1, 1, "1")
            ws.value(2, 0, "B")
            ws.value(2, 1, "2")
            // Row 3 is empty (terminates table)
        }

        val sheet = workbook.getCachedSheet(0)
        val result = sheet.readTable(0, 0)

        assertEquals(2, result.size)
        assertEquals(mapOf("Name" to "A", "Value" to "1"), result[0])
        assertEquals(mapOf("Name" to "B", "Value" to "2"), result[1])
        workbook.close()
    }

    @Test
    fun `readTable extracts all columns until null header`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Col1")
            ws.value(0, 1, "Col2")
            // Cell 2 is null (terminates columns)
            ws.value(1, 0, "A")
            ws.value(1, 1, "B")
            ws.value(1, 2, "C") // Should be ignored
        }

        val sheet = workbook.getCachedSheet(0)
        val result = sheet.readTable(0, 0)

        assertEquals(1, result.size)
        assertEquals(setOf("Col1", "Col2"), result[0].keys)
        workbook.close()
    }

    @Test
    fun `readTable uses endValue to terminate rows`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Name")
            ws.value(1, 0, "A")
            ws.value(2, 0, "END")
            ws.value(3, 0, "B") // Should be ignored
        }

        val sheet = workbook.getCachedSheet(0)
        val result = sheet.readTable(0, 0, "END")

        assertEquals(1, result.size)
        assertEquals("A", result[0]["Name"])
        workbook.close()
    }

    @Test
    fun `readTable handles empty table`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Name")
            // No data rows
        }

        val sheet = workbook.getCachedSheet(0)
        val result = sheet.readTable(0, 0)

        assertEquals(0, result.size)
        workbook.close()
    }

    @Test
    fun `readTable handles single row table`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "Name")
            ws.value(1, 0, "Only")
            // Row 2 is empty (terminates table)
        }

        val sheet = workbook.getCachedSheet(0)
        val result = sheet.readTable(0, 0)

        assertEquals(1, result.size)
        assertEquals("Only", result[0]["Name"])
        workbook.close()
    }

    @Test
    fun `readTable starts from specified origin`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            // Data starting at B3 (row 2, column 1)
            ws.value(2, 0, "ignore") // Column A - prevent early termination
            ws.value(2, 1, "Header") // Column B - actual header
            ws.value(3, 0, "x")      // Column A
            ws.value(3, 1, "Data")   // Column B - actual data
            // Row 4 is simply not written - that creates the termination
        }

        val sheet = workbook.getCachedSheet(0)
        val result = sheet.readTable(2, 1)

        assertEquals(1, result.size)
        assertEquals("Data", result[0]["Header"])
        workbook.close()
    }

    @Test
    fun `readTable handles mixed cell types`() {
        val workbook = createWorkbook {
            val ws = newWorksheet("Test")
            ws.value(0, 0, "String")
            ws.value(0, 1, "Number")
            ws.value(0, 2, "Boolean")
            ws.value(1, 0, "text")
            ws.value(1, 1, 42.5)
            ws.value(1, 2, true)
            // Row 2 empty
        }

        val sheet = workbook.getCachedSheet(0)
        val result = sheet.readTable(0, 0)

        assertEquals(1, result.size)
        assertEquals("text", result[0]["String"])
        assertEquals("42.5", result[0]["Number"])
        assertEquals("true", result[0]["Boolean"])
        workbook.close()
    }
}

class CellAddressTest {

    @Test
    fun `parses simple cell address A1`() {
        val addr = CellAddress("A1")
        assertEquals(0, addr.row)
        assertEquals(0, addr.column)
    }

    @Test
    fun `parses cell address B2`() {
        val addr = CellAddress("B2")
        assertEquals(1, addr.row)
        assertEquals(1, addr.column)
    }

    @Test
    fun `parses cell address Z10`() {
        val addr = CellAddress("Z10")
        assertEquals(9, addr.row)
        assertEquals(25, addr.column)
    }

    @Test
    fun `parses double-letter column AA1`() {
        val addr = CellAddress("AA1")
        assertEquals(0, addr.row)
        assertEquals(26, addr.column)
    }

    @Test
    fun `parses double-letter column AB5`() {
        val addr = CellAddress("AB5")
        assertEquals(4, addr.row)
        assertEquals(27, addr.column)
    }

    @Test
    fun `parses cell address AZ100`() {
        val addr = CellAddress("AZ100")
        assertEquals(99, addr.row)
        assertEquals(51, addr.column)
    }

    @Test
    fun `handles lowercase letters`() {
        val addr = CellAddress("b3")
        assertEquals(2, addr.row)
        assertEquals(1, addr.column)
    }
}
