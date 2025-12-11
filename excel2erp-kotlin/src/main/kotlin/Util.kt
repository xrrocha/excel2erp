import java.io.FileNotFoundException
import java.io.InputStream
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

fun openResource(resourceName: String): InputStream =
    Thread.currentThread().contextClassLoader.getResourceAsStream(resourceName)
        ?: throw FileNotFoundException("No such resource: $resourceName")

// TODO Optimize property reference expansion
fun expand(string: String, props: Map<String, Any?>): String =
    props.toList().fold(string) { str, (name, value) ->
        str.replace("${"$"}{$name}", asString(value))
    }

// TODO Make default formatters configurable
val DefaultDateTimeFormatter = DateTimeFormatter.BASIC_ISO_DATE!!

val DefaultNumberFormatter =
    DecimalFormatSymbols() // Locale.getDefault()
        .apply {
            decimalSeparator = '.'
        }
        .let { dfs ->
            DecimalFormat("############.##", dfs)
        }

fun asString(value: Any?): String = when (value) {
    null -> ""
    is LocalDate -> DefaultDateTimeFormatter.format(value)
    is LocalDateTime -> DefaultDateTimeFormatter.format(value)
    else -> value.toString()
}

fun baseName(filename: String): String =
    filename.substring(0, filename.lastIndexOf('.'))

fun extension(filename: String): String =
    filename.substring(filename.lastIndexOf('.') + 1)
