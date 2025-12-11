import tools.jackson.dataformat.yaml.YAMLMapper
import tools.jackson.module.kotlin.KotlinModule
import java.io.FileInputStream

fun main(args: Array<String>) {
    val configIs =
        if (args.isNotEmpty()) FileInputStream(args[0])
        else openResource("excel2erp.yml")
    val mapper = YAMLMapper.builder()
        .addModule(KotlinModule.Builder().build())
        .build()
    val server: Server = mapper.readValue(configIs, Server::class.java)

    server.start()
    println("Server running at http://localhost:${server.port}")
}
