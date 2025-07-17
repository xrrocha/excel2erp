import org.apache.poi.ss.usermodel.Cell
import org.apache.poi.ss.usermodel.CellType.*
import org.apache.poi.ss.usermodel.DateUtil
import org.apache.poi.ss.usermodel.Row
import org.apache.poi.ss.usermodel.Sheet

fun Sheet.readTable(
    initialRow: Int,
    initialColumn: Int,
    endValue: String? = null
): List<Map<String, String?>> {
    val lastColumn =
        (initialColumn..Int.MAX_VALUE)
            .find { columnIndex ->
                getRow(initialRow).getCell(columnIndex) == null
            }!! - 1
    val lastRow =
        (initialRow + 1..Int.MAX_VALUE)
            .find { rowIndex ->
                // TODO Generalize table-terminating endValue
                if (endValue == null) (getRow(rowIndex)?.getCell(0)?.asString()
                    ?: "").trim().isEmpty()
                else {
                    val cell = getRow(rowIndex).getCell(initialColumn)
                    cell == null || cell.asString() == endValue
                }
            }!! - 1
    val labels =
        (initialColumn..lastColumn)
            .map { columnIndex ->
                getRow(initialRow).getCell(columnIndex).asString()
            }
    val rows =
        (initialRow + 1..lastRow)
            .map { rowIndex ->
                labels.indices.associate { columnIndex ->
                    Pair(
                            labels[columnIndex]!!,
                            cellAsString(rowIndex, initialColumn + columnIndex)
                    )
                }
            }

    return rows
}

fun Sheet.cellAsString(row: Int, column: Int): String? =
    getRow(row)?.readCell(column)

fun Row.readCell(cellNum: Int) =
    getCell(cellNum)?.let(Cell::asString)

fun Cell.asString(): String? =
    when (cellType) {
        STRING -> stringCellValue
        FORMULA -> {
            val cellValue =
                sheet.workbook.creationHelper.createFormulaEvaluator()
                    .evaluate(this)
            when (cachedFormulaResultType) {
                NUMERIC -> {
                    if (DateUtil.isCellDateFormatted(this)) {
                        DefaultDateTimeFormatter.format(localDateTimeCellValue)
                    } else {
                        DefaultNumberFormatter.format(cellValue.numberValue)
                    }
                }

                BOOLEAN -> cellValue.booleanValue
                STRING -> cellValue.stringValue
                else -> cellValue.toString()
            }
        }

        NUMERIC -> {
            if (DateUtil.isCellDateFormatted(this)) {
                DefaultDateTimeFormatter.format(localDateTimeCellValue)
            } else {
                DefaultNumberFormatter.format(numericCellValue)
            }
        }

        BOOLEAN -> booleanCellValue
        else -> null
    }
        ?.toString()
