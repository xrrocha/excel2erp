import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm") version "2.2.21"
    id("org.jetbrains.kotlinx.kover") version "0.9.3"
    id("com.gradleup.shadow") version "9.3.0"
    id("org.graalvm.buildtools.native") version "0.11.3"
    application
}

group = "rrocha"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
    google()
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.7.1")
    implementation("io.javalin:javalin:6.7.0")
    implementation("org.dhatim:fastexcel-reader:0.19.0")
    implementation("org.jetbrains.kotlinx:kotlinx-html-jvm:0.12.0")
    implementation("tools.jackson.module:jackson-module-kotlin:3.0.3")
    implementation("tools.jackson.dataformat:jackson-dataformat-yaml:3.0.3")
    implementation("org.slf4j:slf4j-simple:2.0.17")

    // Test dependencies
    testImplementation(kotlin("test"))
    testImplementation("com.microsoft.playwright:playwright:1.56.0")
    testImplementation("org.dhatim:fastexcel:0.19.0")  // For creating test workbooks
}


java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

tasks.test {
    useJUnitPlatform()
    // Forward test.serverMode system property to JUnit for conditional test execution
    systemProperty("test.serverMode", System.getProperty("test.serverMode") ?: "")
}

application {
    mainClass.set("Excel2ErpKt")
}

graalvmNative {
    binaries {
        named("main") {
            imageName.set("excel2erp")
            mainClass.set("Excel2ErpKt")
            buildArgs.add("-H:+ReportExceptionStackTraces")
        }
    }
}

tasks {
    named<ShadowJar>("shadowJar") {
        archiveBaseName.set("excel2erp")
        archiveClassifier.set("all")
        mergeServiceFiles()
        manifest {
            attributes(mapOf("Main-Class" to "Excel2ErpKt"))
        }
    }

    val copyJarToDemo by registering(Copy::class) {
        dependsOn(shadowJar)
        from(shadowJar.flatMap { it.archiveFile })
        into(layout.projectDirectory.dir("demo"))
        rename { "excel2erp.jar" }
    }

    build {
        dependsOn(shadowJar)
        finalizedBy(copyJarToDemo)
    }
}
