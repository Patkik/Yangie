plugins {
    id("com.android.application")
}

android {
    namespace = "com.starlight.sanctuary"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.starlight.sanctuary"
        minSdk = 24
        targetSdk = 34
        versionCode = 8
        versionName = "1.2.0"

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
}

abstract class VerifyKiroAssetsTask : DefaultTask() {
    @get:InputDirectory
    abstract val assetsDir: DirectoryProperty

    @TaskAction
    fun verify() {
        val dir = assetsDir.get().asFile
        val required = listOf(
            "index.html",
            "css/main.css", "css/intro.css", "css/messenger.css",
            "js/app.js", "js/state.js", "js/audio/synth.js",
            "js/three/intro.js", "js/three/scene.js", "js/ui/mailbox.js"
        )

        required.forEach { path ->
            val file = File(dir, path)
            if (!file.exists() || file.length() == 0L) {
                throw GradleException("❌ Critical Kiro module missing or empty: assets/$path")
            }
        }
        println("✨ All Kiro modules verified and healthy for build!")
    }
}

tasks.register<VerifyKiroAssetsTask>("verifyKiroAssets") {
    group = "verification"
    description = "Verifies that all modular ES6 client assets are in place before building."
    assetsDir.set(layout.projectDirectory.dir("src/main/assets"))
}

tasks.named("preBuild") {
    dependsOn("verifyKiroAssets")
}
