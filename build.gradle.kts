import org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile
import org.jetbrains.kotlin.gradle.dsl.jvm.JvmTargetValidationMode
import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar
import org.gradle.kotlin.dsl.invoke
import org.gradle.kotlin.dsl.kotlin
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm") version "2.2.0"
    id("com.github.johnrengelman.shadow") version "8.1.1"
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
    implementation("org.apache.poi:poi-ooxml:5.4.1")
    implementation("org.jetbrains.kotlinx:kotlinx-html-jvm:0.12.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.19.1")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:2.19.1")
    implementation("org.slf4j:slf4j-simple:2.0.17")
    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlin:kotlin-script-runtime:2.2.0")

}


kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
    }
}

tasks.test {
    useJUnitPlatform()
}

tasks {
    named<ShadowJar>("shadowJar") {
        archiveBaseName.set("shadow")
        mergeServiceFiles()
        manifest {
            attributes(mapOf("Main-Class" to "WBMainKt"))
        }
    }
}

tasks {
    build {
        dependsOn(shadowJar)
    }
}
