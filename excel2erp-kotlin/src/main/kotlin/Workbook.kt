import org.dhatim.fastexcel.reader.Cell
import org.dhatim.fastexcel.reader.CellType
import org.dhatim.fastexcel.reader.ReadableWorkbook
import org.dhatim.fastexcel.reader.Row
import org.dhatim.fastexcel.reader.Sheet
import java.io.InputStream
import java.math.BigDecimal

/**
 * Represents a cell address in A1 notation (e.g., "A1", "B2", "AA10").
 * Provides row and column as zero-based indices.
 */
data class CellAddress(val row: Int, val column: Int) {
    constructor(address: String) : this(
        row = address.dropWhile { it.isLetter() }.toInt() - 1,
        column = address.takeWhile { it.isLetter() }
            .fold(0) { acc, c -> acc * 26 + (c.uppercaseChar() - 'A' + 1) } - 1
    )
}

/**
 * Safely get a cell from a row, returning null if index is out of bounds.
 */
private fun Row.getCellOrNull(column: Int): Cell? =
    if (column < cellCount) getCell(column) else null

/**
 * Wrapper around FastExcel Sheet that caches all rows for random access.
 * FastExcel is streaming-based and only returns rows that contain data,
 * so we build a map from actual row numbers to Row objects.
 * Note: FastExcel Row.rowNum is 1-based, but we expose 0-based indexing for consistency.
 */
class CachedSheet(sheet: Sheet) {
    // FastExcel rowNum is 1-based, convert to 0-based by subtracting 1
    private val rowMap: Map<Int, Row> = sheet.read().associateBy { it.rowNum - 1 }
    private val maxRowNum: Int = rowMap.keys.maxOrNull() ?: -1

    fun getRow(rowIndex: Int): Row? = rowMap[rowIndex]

    fun cellAsString(row: Int, column: Int): String? =
        getRow(row)?.getCellOrNull(column)?.toFormattedString()

    fun readTable(
        initialRow: Int,
        initialColumn: Int,
        endValue: String? = null
    ): List<Map<String, String?>> {
        val headerRow = getRow(initialRow) ?: return emptyList()

        // Find last column (first null/empty cell in header row)
        val lastColumn = (initialColumn..Int.MAX_VALUE)
            .find { col ->
                headerRow.getCellOrNull(col)?.toFormattedString().isNullOrBlank()
            }?.minus(1) ?: (headerRow.cellCount - 1)

        // Extract labels from header row
        val labels = (initialColumn..lastColumn).map { col ->
            headerRow.getCellOrNull(col)?.toFormattedString()
        }

        // Find last data row (check up to maxRowNum + 1 for termination)
        val lastRow = (initialRow + 1..maxRowNum + 1)
            .find { rowIndex ->
                val row = getRow(rowIndex)
                if (endValue == null) {
                    // Row doesn't exist or first column is empty
                    row == null || row.getCellOrNull(0)?.toFormattedString()?.trim().isNullOrEmpty()
                } else {
                    val cell = row?.getCellOrNull(initialColumn)
                    cell == null || cell.toFormattedString() == endValue
                }
            }?.minus(1) ?: maxRowNum

        // Extract data rows
        return (initialRow + 1..lastRow).mapNotNull { rowIndex ->
            val row = getRow(rowIndex) ?: return@mapNotNull null
            labels.indices.associate { colOffset ->
                val label = labels[colOffset] ?: "col$colOffset"
                val value = cellAsString(rowIndex, initialColumn + colOffset)
                label to value
            }
        }
    }
}

/**
 * Opens a workbook from an InputStream and provides cached sheet access.
 */
fun openWorkbook(input: InputStream): ReadableWorkbook = ReadableWorkbook(input)

/**
 * Gets a cached sheet for random access operations.
 */
fun ReadableWorkbook.getCachedSheet(index: Int): CachedSheet =
    CachedSheet(getSheet(index).orElseThrow {
        IllegalArgumentException("Sheet at index $index not found")
    })

/**
 * Extension to convert FastExcel Cell to String, handling all cell types.
 */
fun Cell.toFormattedString(): String? = when (type) {
    CellType.STRING -> asString()
    CellType.NUMBER -> {
        val num = toBigDecimal()
        // Check if it's a whole number to avoid ".0" suffix
        if (num.stripTrailingZeros().scale() <= 0) {
            num.toBigInteger().toString()
        } else {
            DefaultNumberFormatter.format(num.toDouble())
        }
    }
    CellType.BOOLEAN -> asBoolean().toString()
    CellType.FORMULA -> {
        // FastExcel returns cached formula result via rawValue or typed accessors
        rawValue ?: text
    }
    CellType.ERROR -> null
    CellType.EMPTY -> null
    else -> text
}

/**
 * Extension to safely get cell as BigDecimal.
 */
fun Cell.toBigDecimal(): BigDecimal =
    when (type) {
        CellType.NUMBER -> rawValue?.let { BigDecimal(it) } ?: BigDecimal.ZERO
        CellType.STRING -> rawValue?.toBigDecimalOrNull() ?: BigDecimal.ZERO
        else -> BigDecimal.ZERO
    }
