package com.starlight.sanctuary

import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * KiroAssetValidatorTest
 * Automated Build-Time Asset Integrity Check for Kiro's ES6 Modular Architecture
 */
class KiroAssetValidatorTest {

    @Test
    fun verifyKiroModularAssets() {
        val possiblePaths = listOf(
            File("src/main/assets"),
            File("app/src/main/assets"),
            File("android-app/app/src/main/assets")
        )

        val assetsDir = possiblePaths.firstOrNull { it.exists() && it.isDirectory }
            ?: File("src/main/assets")

        val requiredAssets = listOf(
            "index.html",
            "css/main.css",
            "css/intro.css",
            "css/messenger.css",
            "css/call.css",
            "js/app.js",
            "js/state.js",
            "js/synth.js",
            "js/intro.js",
            "js/scene.js",
            "js/mailbox.js",
            "js/call-engine.js",
            "js/crypto-engine.js",
            "js/three.min.js",
            "js/gsap.min.js"
        )

        requiredAssets.forEach { relativePath ->
            val assetFile = File(assetsDir, relativePath)
            assertTrue("Critical Kiro asset missing: $relativePath", assetFile.exists())
            assertTrue("Critical Kiro asset is empty: $relativePath", assetFile.length() > 0L)
        }
    }
}
