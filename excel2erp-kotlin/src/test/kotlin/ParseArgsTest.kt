import kotlin.test.Test
import kotlin.test.assertEquals

class ParseArgsTest {

    @Test
    fun `defaults when no args`() {
        val result = parseArgs(emptyArray())

        assertEquals("excel2erp.yaml", result.configFile)
        assertEquals(7070, result.port)
        assertEquals("0.0.0.0", result.host)
        assertEquals(System.getProperty("user.dir"), result.baseDir)
    }

    @Test
    fun `config file as positional arg`() {
        val result = parseArgs(arrayOf("custom.yaml"))

        assertEquals("custom.yaml", result.configFile)
        assertEquals(7070, result.port)
    }

    @Test
    fun `port flag`() {
        val result = parseArgs(arrayOf("--port", "8080"))

        assertEquals(8080, result.port)
        assertEquals("excel2erp.yaml", result.configFile)
    }

    @Test
    fun `host flag`() {
        val result = parseArgs(arrayOf("--host", "localhost"))

        assertEquals("localhost", result.host)
    }

    @Test
    fun `basedir flag`() {
        val result = parseArgs(arrayOf("--basedir", "/opt/app"))

        assertEquals("/opt/app", result.baseDir)
    }

    @Test
    fun `config file with all flags`() {
        val result = parseArgs(arrayOf(
            "demo/excel2erp.yaml",
            "--port", "9090",
            "--host", "127.0.0.1",
            "--basedir", "/var/data"
        ))

        assertEquals("demo/excel2erp.yaml", result.configFile)
        assertEquals(9090, result.port)
        assertEquals("127.0.0.1", result.host)
        assertEquals("/var/data", result.baseDir)
    }

    @Test
    fun `flags before config file`() {
        val result = parseArgs(arrayOf(
            "--port", "8888",
            "myconfig.yaml"
        ))

        assertEquals("myconfig.yaml", result.configFile)
        assertEquals(8888, result.port)
    }

    @Test
    fun `flags mixed order`() {
        val result = parseArgs(arrayOf(
            "--host", "10.0.0.1",
            "app.yaml",
            "--port", "3000",
            "--basedir", "/home/user"
        ))

        assertEquals("app.yaml", result.configFile)
        assertEquals(3000, result.port)
        assertEquals("10.0.0.1", result.host)
        assertEquals("/home/user", result.baseDir)
    }
}
