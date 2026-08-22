plugins {
    id("com.android.application")
}

android {
    namespace = "com.starlight.sanctuary"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.patkik.yangie"
        minSdk = 26
        targetSdk = 34
        versionCode = 72
        versionName = "2.3.4"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.webkit:webkit:1.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.test.espresso:espresso-web:3.5.1")
    androidTestImplementation("androidx.test:rules:1.5.0")
}

abstract class VerifyKiroAssetsTask : DefaultTask() {
    @get:InputDirectory
    abstract val assetsDir: DirectoryProperty

    @get:OutputFile
    abstract val markerFile: RegularFileProperty

    @TaskAction
    fun verify() {
        val dir = assetsDir.get().asFile
        val required = listOf(
            "index.html",
            "css/main.css", "css/intro.css", "css/messenger.css", "css/call.css",
            "js/app.js", "js/state.js", "js/synth.js",
            "js/intro.js", "js/scene.js", "js/mailbox.js",
            "js/call-engine.js", "js/crypto-engine.js",
            "js/three.min.js", "js/gsap.min.js",
            "kiro-agent-harness.py"
        )

        required.forEach { path ->
            val file = File(dir, path)
            if (!file.exists() || file.length() == 0L) {
                throw GradleException("❌ Critical Kiro module missing or empty: assets/$path")
            }
        }

        val marker = markerFile.get().asFile
        marker.parentFile.mkdirs()
        marker.writeText("VERIFIED: ${System.currentTimeMillis()}")
        println("✨ All Kiro modules verified and healthy for build!")
    }
}

tasks.register<VerifyKiroAssetsTask>("verifyKiroAssets") {
    group = "verification"
    description = "Verifies that all modular ES6 client assets are in place before building."
    assetsDir.set(layout.projectDirectory.dir("src/main/assets"))
    markerFile.set(layout.buildDirectory.file("intermediates/kiro_assets/verified.txt"))
}

tasks.named("preBuild") {
    dependsOn("verifyKiroAssets")
}
