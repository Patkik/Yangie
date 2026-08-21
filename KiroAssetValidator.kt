package com.hakdog.kiro.utils

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * Kiro Companion App Asset Validator (KiroAssetValidator.kt)
 * Run this local JUnit test during CI/CD or local gradle builds to verify
 * that the modular ES6 asset structure is 100% complete and valid before deployment.
 * Prevents runtime WebGL WebView crashes caused by missing dependencies.
 */
class KiroAssetValidator {

    // Relative root to main assets folder from project module root
    private val assetsRoot = File("src/main/assets")

    // The strict list of required files established in the Space Capsule V2 modular blueprint
    private val requiredAssets = listOf(
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

    @Test
    fun verifyAssetDirectoryStructure() {
        // 1. Verify Assets folder exists
        if (!assetsRoot.exists() || !assetsRoot.isDirectory) {
            fail("Android assets directory not found at path: ${assetsRoot.absolutePath}. Ensure this test is run from the app module root.")
        }

        println("🌌 Starting Kiro's Haven Asset Integrity Scan...")
        println("Asset Root: ${assetsRoot.absolutePath}")
        
        var missingFiles = 0
        var emptyFiles = 0

        // 2. Scan and verify each required module file
        requiredAssets.forEach { relativePath ->
            val file = File(assetsRoot, relativePath)
            print("  ✦ Verifying asset '${relativePath}'... ")
            
            if (!file.exists()) {
                System.err.println(" [MISSING ❌]")
                missingFiles++
            } else if (file.length() == 0L) {
                System.err.println(" [EMPTY ⚠️]")
                emptyFiles++
            } else {
                println(" [OK LOKI LOKI! (Size: ${file.length()} bytes) ✨]")
            }
        }

        // 3. Fail-fast build feedback
        if (missingFiles > 0) {
            fail("Build Blocked: $missingFiles critical ES6 modules are missing from your assets structure! Check your modular layout.")
        }
        
        if (emptyFiles > 0) {
            fail("Build Blocked: $emptyFiles asset files exist but are empty (0 bytes). Check that compilation sync completed.")
        }

        println("🎉 All ${requiredAssets.size} Kiro modules are present and healthy! Ready to build. 🛰️")
    }

    @Test
    fun verifyNoForbiddenFiles() {
        // Prevent deployment of temporary backup files, scratchpads, or raw design elements
        val forbiddenExtensions = listOf("tmp", "bak", "scratch", "sketch", "blend")
        
        assetsRoot.walkTopDown().forEach { file ->
            if (file.isFile && forbiddenExtensions.contains(file.extension.lowercase())) {
                fail("Forbidden build artifact leaked into assets folder: ${file.name}. Clean up your workspaces!")
            }
        }
    }
}
