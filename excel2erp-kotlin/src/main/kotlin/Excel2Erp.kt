import tools.jackson.dataformat.yaml.YAMLMapper
import tools.jackson.module.kotlin.KotlinModule
import java.io.File
import java.io.FileInputStream

data class ParsedArgs(
    val configFile: String = "excel2erp.yaml",
    val port: Int = 7070,
    val host: String = "0.0.0.0",
    val baseDir: String = System.getProperty("user.dir")
)

fun parseArgs(args: Array<String>): ParsedArgs {
    var configFile = "excel2erp.yaml"
    var port = 7070
    var host = "0.0.0.0"
    var baseDir = System.getProperty("user.dir")

    val iter = args.iterator()
    while (iter.hasNext()) {
        when (val arg = iter.next()) {
            "--port" -> port = iter.next().toInt()
            "--host" -> host = iter.next()
            "--basedir" -> baseDir = iter.next()
            else -> if (!arg.startsWith("--")) configFile = arg
        }
    }

    return ParsedArgs(configFile, port, host, baseDir)
}

fun main(args: Array<String>) {
    val parsed = parseArgs(args)

    val mapper = YAMLMapper.builder()
        .addModule(KotlinModule.Builder().build())
        .build()

    val configPath = if (File(parsed.configFile).isAbsolute)
        parsed.configFile
    else
        File(parsed.baseDir, parsed.configFile).path

    val model: Model = FileInputStream(configPath).use {
        mapper.readValue(it, Model::class.java)
    }

    val assetsDir = File(parsed.baseDir, "assets").path
    val server = Server(parsed.port, parsed.host, assetsDir, model)

    server.start()
    println("Server running at http://${parsed.host}:${parsed.port}")
}
