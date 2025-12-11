import io.javalin.Javalin
import io.javalin.http.UploadedFile
import io.javalin.http.staticfiles.Location.EXTERNAL
import kotlinx.html.*
import kotlinx.html.FormMethod.post
import kotlinx.html.InputType.file
import kotlinx.html.InputType.submit
import kotlinx.html.stream.createHTML
import org.dhatim.fastexcel.reader.ReadableWorkbook
import java.io.OutputStream
import java.io.PrintWriter
import java.io.StringWriter
import kotlin.system.exitProcess

data class Server(
    val port: Int = 7070,
    val assetsDir: String = "./assets",
    val config: Model
) {

    private val sources: Map<String, ResolvedSource> =
        config.sources.associate { source ->
            val (headerReader, missingProperties) = source.resolveHeader(config.result.header)
            val detailReader = source.resolveDetail(config.result.detail)
            source.name to ResolvedSource(
                    headerReader,
                    detailReader,
                    source.logo,
                    missingProperties
            )
        }

    fun start(): Javalin =
        Javalin
            .create { config ->
                config.staticFiles.add { staticFiles ->
                    staticFiles.hostedPath = "/"
                    staticFiles.directory = assetsDir
                    staticFiles.location = EXTERNAL
                }
            }
            .apply {

                get("/") { ctx -> ctx.html(index) }

                post("/load") { ctx ->
                    ctx.uploadedFile("wbFile")?.let { file ->
                        val sourceName = ctx.formParam("source")
                            ?: throw IllegalArgumentException("Missing 'source' parameter")
                        val source = sources[sourceName]
                            ?: throw IllegalArgumentException("Unknown source: $sourceName")

                        runCatching {
                            val workbook = openWorkBook(file)
                            Pair(
                                    source.headerReader(workbook),
                                    source.detailReader(workbook)
                            )
                        }
                            .onFailure {
                                ctx.html(errorPage("extractionError", it))
                            }
                            .map { (header, detail) ->
                                val providedFields =
                                    source.missingProperties.associate { property ->
                                        property.name to property.normalize(
                                                ctx.formParam(
                                                        property.name
                                                )
                                        )
                                    }
                                val allFields =
                                    header + providedFields + ("sourceName" to sourceName)
                                val filename =
                                    config.result.filename("zip", allFields)

                                ctx.header(
                                        "Content-Disposition",
                                        "attachment; filename=\"$filename\""
                                )
                                processWorkbook(
                                        allFields,
                                        detail,
                                        config.result,
                                        ctx.outputStream()
                                )
                            }
                    }
                }

                get("/forms") { ctx ->
                    ctx.html(sources[ctx.queryParam("source")]?.formHtml ?: "")
                }

                get("/close") { ctx ->
                    ctx.result("")
                    stop()
                    exitProcess(0)
                }

                start(port)
            }

    private val index =
        createHTML().html {
            head {
                meta { charset = "UTF-8" }
                link(href = "/wb.css", rel = "stylesheet", type = "text/css")
                script(
                    src = config.parameter("htmx"),
                    type = "text/javascript"
                ) {}
            }
            body {
                div {
                    img(src = config.logo, classes = "icon")
                    h1("top-title") { +config.description }
                }
                br()
                form {
                    action = "/load"
                    method = post
                    encType = FormEncType.multipartFormData

                    table {
                        tr {
                            attributes["valign"] = "top"
                            td {
                                div {
                                    label { +"${config.parameter("source")}: " }
                                    select {
                                        name = "source"

                                        attributes["hx-get"] = "/forms"
                                        attributes["hx-target"] = "click"
                                        attributes["hx-target"] = "#source"
                                        attributes["hx-swap"] = "innerHTML"

                                        option { selected = true }
                                        config.sources
                                            .map {
                                                option {
                                                    value = it.name
                                                    +it.description
                                                }
                                            }
                                    }
                                }
                            }
                            td {
                                attributes["valign"] = "top"
                                div { id = "source" }
                            }
                        }
                    }

                }
                hr()
                a(href = "/close") { +"Close" }
            }
        }

    private fun errorPage(parameterName: String, error: Throwable? = null) =
        createHTML().html {
            head {
                title { +"Error" }
                meta { charset = "UTF-8" }
            }
            body {
                div {
                    style = "color: red; font-size: 200%"
                    h1 { +"Error" }
                    p {
                        +config.parameter(parameterName)
                        br()
                        a {
                            href = "javascript:history.back()"
                            +"⇦"
                        }
                    }
                }
                hr()
                div {
                    error?.let { error ->
                        pre {
                            style = "color: navy; font-size: 75%"
                            +StringWriter().also { out ->
                                error.printStackTrace(PrintWriter(out))
                            }
                                .toString()
                        }
                    }
                }
            }
        }

    private fun processWorkbook(
        header: Map<String, String?>,
        detail: List<Map<String, String?>>,
        result: Result, outputStream: OutputStream
    ) =
        result.writeZip(outputStream, header, detail)

    private fun openWorkBook(uploadedFile: UploadedFile): ReadableWorkbook {
        val ext = extension(uploadedFile.filename())
        if (ext != "xlsx") {
            throw IllegalArgumentException("Only .xlsx files are supported. Got: .${ext}")
        }
        return ReadableWorkbook(uploadedFile.content())
    }

    inner class ResolvedSource(
        val headerReader: (ReadableWorkbook) -> Map<String, String?>,
        val detailReader: (ReadableWorkbook) -> List<Map<String, String?>>,
        logo: String?,
        val missingProperties: List<Property>
    ) {
        val formHtml = createHTML().div {
            table {
                caption {
                    logo?.let { img { src = it } }
                    hr()
                }
                missingProperties
                    .map { property ->
                        tr {
                            td { label { +"${property.prompt}: " } }
                            td {
                                input {
                                    required = true
                                    name = property.name
                                    type = property.type
                                    title = property.fyi
                                }
                            }
                        }
                    }
                tr {
                    td { label { +"${config.parameter("workbook")}: " } }
                    td {
                        input {
                            type = file
                            name = "wbFile"
                            required = true
                        }
                    }
                }
            }
            div {
                input {
                    type = submit
                    name = "submit"
                    value = config.parameter("submit")
                }
            }
        }
    }
}
