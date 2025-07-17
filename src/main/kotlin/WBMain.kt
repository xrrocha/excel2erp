import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import java.awt.Desktop
import java.io.FileInputStream
import java.io.InputStream
import java.net.URI

fun main(args: Array<String>) {
    val configIs =
        if (args.isNotEmpty()) FileInputStream(args[0])
        else openResource("wb-server.yaml")
    val mapper = ObjectMapper(YAMLFactory()).registerModule(
            KotlinModule.Builder().build()
    )
    val server: Server = mapper.readValue(configIs)

    server.start()
    Desktop.getDesktop().browse(URI("http://localhost:${server.port}"))
}

inline fun <reified T> ObjectMapper.readValue(inputStream: InputStream): T =
    readValue(inputStream, T::class.java)
