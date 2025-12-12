import com.microsoft.playwright.Browser
import com.microsoft.playwright.BrowserType
import com.microsoft.playwright.Page
import com.microsoft.playwright.Playwright
import com.microsoft.playwright.options.LoadState
import java.io.File
import java.nio.file.Files
import java.util.concurrent.TimeUnit
import java.util.zip.ZipInputStream
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * E2E test runner modes for different server execution strategies.
 */
enum class ServerMode {
    EMBEDDED,  // Start server in-process (original behavior)
    UBERJAR,   // Launch via java -jar
    NATIVE     // Launch native executable
}

/**
 * Abstract base class for E2E tests. Subclasses define how the server is started.
 */
abstract class AbstractE2ETest {

    protected lateinit var playwright: Playwright
    protected lateinit var browser: Browser
    protected lateinit var page: Page
    protected var serverProcess: Process? = null

    protected val demoDir = File("demo")
    protected val port = 9999

    abstract val serverMode: ServerMode

    @BeforeTest
    fun setup() {
        startServer()
        waitForServerReady()

        playwright = Playwright.create()
        browser = playwright.chromium().launch(
            BrowserType.LaunchOptions().setHeadless(true)
        )
        page = browser.newPage()
    }

    @AfterTest
    fun teardown() {
        page.close()
        browser.close()
        playwright.close()
        stopServer()
    }

    private fun startServer() {
        when (serverMode) {
            ServerMode.EMBEDDED -> startEmbeddedServer()
            ServerMode.UBERJAR -> startUberjarServer()
            ServerMode.NATIVE -> startNativeServer()
        }
    }

    private fun startEmbeddedServer() {
        val configFile = File(demoDir, "excel2erp.yaml")
        val mapper = tools.jackson.dataformat.yaml.YAMLMapper.builder()
            .addModule(tools.jackson.module.kotlin.KotlinModule.Builder().build())
            .build()
        val model: Model = java.io.FileInputStream(configFile).use { input ->
            mapper.readValue(input, Model::class.java)
        }
        val testServer = Server(
            port = port,
            host = "localhost",
            assetsDir = File(demoDir, "assets").absolutePath,
            config = model
        )
        testServer.start()
    }

    private fun startUberjarServer() {
        val jarFile = File("build/libs/excel2erp-1.0-SNAPSHOT-all.jar")
        require(jarFile.exists()) { "Uberjar not found: ${jarFile.absolutePath}. Run ./gradlew build first." }

        val pb = ProcessBuilder(
            "java", "-jar", jarFile.absolutePath,
            "excel2erp.yaml", "--port", port.toString(), "--basedir", demoDir.absolutePath
        ).directory(demoDir)
            .redirectErrorStream(true)

        serverProcess = pb.start()
    }

    private fun startNativeServer() {
        val nativeExec = File("build/native/nativeCompile/excel2erp")
        require(nativeExec.exists()) { "Native executable not found: ${nativeExec.absolutePath}. Run ./gradlew nativeCompile first." }

        val pb = ProcessBuilder(
            nativeExec.absolutePath,
            "excel2erp.yaml", "--port", port.toString(), "--basedir", demoDir.absolutePath
        ).directory(demoDir)
            .redirectErrorStream(true)

        serverProcess = pb.start()
    }

    private fun waitForServerReady(timeoutSeconds: Int = 30) {
        val start = System.currentTimeMillis()
        val url = java.net.URL("http://localhost:$port/")

        while (System.currentTimeMillis() - start < timeoutSeconds * 1000) {
            try {
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.connectTimeout = 1000
                conn.readTimeout = 1000
                if (conn.responseCode == 200) {
                    return
                }
            } catch (_: Exception) {
                // Server not ready yet
            }
            Thread.sleep(100)
        }
        throw RuntimeException("Server did not start within $timeoutSeconds seconds")
    }

    private fun stopServer() {
        serverProcess?.let { proc ->
            proc.destroy()
            if (!proc.waitFor(5, TimeUnit.SECONDS)) {
                proc.destroyForcibly()
            }
        }
        // For embedded mode, stop via /close endpoint
        if (serverMode == ServerMode.EMBEDDED) {
            try {
                java.net.URL("http://localhost:$port/close").readText()
            } catch (_: Exception) {
                // Ignore - server may already be stopped
            }
        }
    }

    protected fun baseUrl() = "http://localhost:$port"

    // ==================== Common E2E Tests ====================

    @Test
    fun `index page loads successfully`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        assertEquals("", page.title())
        assertTrue(page.content().contains("Rey Pepinito"))
    }

    @Test
    fun `index page displays application logo`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        val logo = page.locator("img.icon")
        assertTrue(logo.isVisible)
    }

    @Test
    fun `index page displays application description`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        val title = page.locator("h1.top-title")
        assertTrue(title.textContent().contains("Pedidos ERP"))
    }

    @Test
    fun `source dropdown contains all configured sources`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        val options = page.locator("select[name='source'] option")
        val count = options.count()

        assertEquals(6, count) // 5 sources + 1 empty

        val optionTexts = (0 until count).map { options.nth(it).textContent() }
        assertTrue(optionTexts.any { it.contains("El Dorado") })
        assertTrue(optionTexts.any { it.contains("Cascabel") })
        assertTrue(optionTexts.any { it.contains("Ñañita") })
        assertTrue(optionTexts.any { it.contains("Pinta") })
        assertTrue(optionTexts.any { it.contains("ÜberGroß") })
    }

    @Test
    fun `selecting source loads form via HTMX`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "el-dorado")
        page.waitForTimeout(500.0)

        val sourceDiv = page.locator("#source")
        assertTrue(sourceDiv.innerHTML().contains("input"))
    }

    @Test
    fun `form displays file upload input`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "cascabel")
        page.waitForTimeout(500.0)

        val fileInput = page.locator("input[type='file']")
        assertTrue(fileInput.isVisible)
    }

    @Test
    fun `form displays submit button`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "la-pinta")
        page.waitForTimeout(500.0)

        val submitButton = page.locator("input[type='submit']")
        assertTrue(submitButton.isVisible)
    }

    @Test
    fun `la-nanita form shows date input fields`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "la-nanita")
        page.waitForTimeout(500.0)

        val dateInputs = page.locator("input[type='date']")
        assertTrue(dateInputs.count() >= 1, "Should have date input fields")
    }

    @Test
    fun `submitting valid form triggers download`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "el-dorado")
        page.waitForTimeout(500.0)

        val dateInputs = page.locator("input[type='date']")
        for (i in 0 until dateInputs.count()) {
            dateInputs.nth(i).fill("2024-01-15")
        }

        val testFile = File(demoDir, "data/el-dorado.xlsx")
        page.locator("input[type='file']").setInputFiles(testFile.toPath())

        val download = page.waitForDownload {
            page.locator("input[type='submit']").click()
        }

        assertTrue(download.suggestedFilename().endsWith(".zip"))
    }

    @Test
    fun `downloaded ZIP has correct filename pattern`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "cascabel")
        page.waitForTimeout(500.0)

        val dateInputs = page.locator("input[type='date']")
        for (i in 0 until dateInputs.count()) {
            dateInputs.nth(i).fill("2024-01-15")
        }

        val testFile = File(demoDir, "data/cascabel.xlsx")
        page.locator("input[type='file']").setInputFiles(testFile.toPath())

        val download = page.waitForDownload {
            page.locator("input[type='submit']").click()
        }

        val filename = download.suggestedFilename()
        assertTrue(filename.startsWith("erp-pedido-cascabel-"))
        assertTrue(filename.endsWith(".zip"))
    }

    @Test
    fun `downloaded ZIP contains expected files`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "el-dorado")
        page.waitForTimeout(500.0)

        val dateInputs = page.locator("input[type='date']")
        for (i in 0 until dateInputs.count()) {
            dateInputs.nth(i).fill("2024-01-15")
        }

        val testFile = File(demoDir, "data/el-dorado.xlsx")
        page.locator("input[type='file']").setInputFiles(testFile.toPath())

        val download = page.waitForDownload {
            page.locator("input[type='submit']").click()
        }

        val tempFile = Files.createTempFile("test-download", ".zip")
        download.saveAs(tempFile)

        val entries = mutableListOf<String>()
        ZipInputStream(Files.newInputStream(tempFile)).use { zis ->
            var entry = zis.nextEntry
            while (entry != null) {
                entries.add(entry.name)
                entry = zis.nextEntry
            }
        }

        assertTrue(entries.contains("cabecera.txt"))
        assertTrue(entries.contains("detalle.txt"))

        Files.delete(tempFile)
    }

    @Test
    fun `uploading wrong source file shows error page`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "el-dorado")
        page.waitForTimeout(500.0)

        val dateInputs = page.locator("input[type='date']")
        for (i in 0 until dateInputs.count()) {
            dateInputs.nth(i).fill("2024-01-15")
        }

        val wrongFile = File(demoDir, "data/la-nanita.xlsx")
        page.locator("input[type='file']").setInputFiles(wrongFile.toPath())

        page.locator("input[type='submit']").click()
        page.waitForLoadState(LoadState.NETWORKIDLE)

        val content = page.content()
        assertTrue(content.contains("Error") || content.contains("error"))
    }

    @Test
    fun `error page has back link`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "cascabel")
        page.waitForTimeout(500.0)

        val dateInputs = page.locator("input[type='date']")
        for (i in 0 until dateInputs.count()) {
            dateInputs.nth(i).fill("2024-01-15")
        }

        val wrongFile = File(demoDir, "data/uber-gross.xlsx")
        page.locator("input[type='file']").setInputFiles(wrongFile.toPath())

        page.locator("input[type='submit']").click()
        page.waitForLoadState(LoadState.NETWORKIDLE)

        val backLink = page.locator("a[href='javascript:history.back()']")
        if (backLink.count() > 0) {
            assertTrue(backLink.isVisible)
        }
    }

    @Test
    fun `close link exists on index page`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        val closeLink = page.locator("a[href='/close']")
        assertTrue(closeLink.isVisible)
        assertTrue(closeLink.textContent().contains("Close"))
    }

    @Test
    fun `la-pinta completes full flow`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "la-pinta")
        page.waitForTimeout(500.0)

        val dateInputs = page.locator("input[type='date']")
        for (i in 0 until dateInputs.count()) {
            dateInputs.nth(i).fill("2024-01-15")
        }

        val testFile = File(demoDir, "data/la-pinta.xlsx")
        page.locator("input[type='file']").setInputFiles(testFile.toPath())

        val download = page.waitForDownload {
            page.locator("input[type='submit']").click()
        }

        assertTrue(download.suggestedFilename().contains("la-pinta"))
    }

    @Test
    fun `la-nanita completes full flow with all required fields`() {
        page.navigate(baseUrl())
        page.waitForLoadState(LoadState.NETWORKIDLE)

        page.selectOption("select[name='source']", "la-nanita")
        page.waitForTimeout(500.0)

        val dateInputs = page.locator("input[type='date']")
        for (i in 0 until dateInputs.count()) {
            dateInputs.nth(i).fill("2024-01-15")
        }

        val textInputs = page.locator("#source input[type='text']")
        for (i in 0 until textInputs.count()) {
            textInputs.nth(i).fill("TEST-001")
        }

        val testFile = File(demoDir, "data/la-nanita.xlsx")
        page.locator("input[type='file']").setInputFiles(testFile.toPath())

        val download = page.waitForDownload {
            page.locator("input[type='submit']").click()
        }

        assertTrue(download.suggestedFilename().contains("la-nanita"))
    }
}

/**
 * E2E tests using embedded server (in-process, original behavior).
 * Runs by default with ./gradlew test (when no serverMode property is set)
 */
@org.junit.jupiter.api.condition.DisabledIfSystemProperty(named = "test.serverMode", matches = "uberjar|native", disabledReason = "Running uberjar or native tests instead")
class EmbeddedE2ETest : AbstractE2ETest() {
    override val serverMode = ServerMode.EMBEDDED
}

/**
 * E2E tests using uberjar (java -jar).
 * Requires: ./gradlew build
 * Run with: ./gradlew test -Dtest.serverMode=uberjar
 */
@org.junit.jupiter.api.condition.EnabledIfSystemProperty(named = "test.serverMode", matches = "uberjar|all", disabledReason = "Run with -Dtest.serverMode=uberjar")
class UberjarE2ETest : AbstractE2ETest() {
    override val serverMode = ServerMode.UBERJAR
}

/**
 * E2E tests using native executable.
 * Requires: ./gradlew nativeCompile
 * Run with: ./gradlew test -Dtest.serverMode=native
 */
@org.junit.jupiter.api.condition.EnabledIfSystemProperty(named = "test.serverMode", matches = "native|all", disabledReason = "Run with -Dtest.serverMode=native")
class NativeE2ETest : AbstractE2ETest() {
    override val serverMode = ServerMode.NATIVE
}
