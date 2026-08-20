package com.hakdog.kiro

import android.content.Intent
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.espresso.web.assertion.WebViewAssertions.webMatches
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms
import androidx.test.espresso.web.webdriver.DriverAtoms.findElement
import androidx.test.espresso.web.webdriver.DriverAtoms.getText
import androidx.test.espresso.web.webdriver.DriverAtoms.webClick
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import org.hamcrest.Matchers.containsString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Kiro WebView Integration Test (KiroWebViewTest.kt)
 * Verifies that the native single-activity WebView container successfully compiles,
 * mounts Kiro's ES6 modules, renders the WebGL canvas, and handles persona selection transitions.
 */
@RunWith(AndroidJUnit4::class)
@LargeTest
class KiroWebViewTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun webView_loadsAssetsSuccessfully() {
        // 1. Verify that the native WebView container is displayed
        onView(withId(R.id.webview))
            .check(matches(isDisplayed()))

        // 2. Assert that the secure virtual URL assets are successfully mounted and displayed
        onWebView()
            .withElement(findElement(Locator.CLASS_NAME, "intro-stage-title"))
            .check(webMatches(
                androidx.test.espresso.web.webdriver.DriverAtoms.getText(),
                containsString("Sanctuary Portal")
            ))
    }

    @Test
    fun onboarding_personaSelectionFlow_transitionsToDashboard() {
        // 1. Wait briefly for WebView asset loading and ThreeJS starfield initialization.
        Thread.sleep(1500)

        // 2. Ensure that the cinematic stardust warp has slowed down and selection portals exist in the DOM
        onWebView()
            .withElement(findElement(Locator.CLASS_NAME, "portal-selection-board"))
            .check(webMatches(androidx.test.espresso.web.webdriver.DriverAtoms.getText(), containsString("Choose your capsule identity")))

        // 3. Simulate tapping Patrick's glassmorphic companion card portal
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, ".portal-pat"))
            .perform(webClick())

        // 4. Tap the explicit glowing "Choose" button to trigger transition arrival sequence
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, ".portal-pat .portal-choose-btn"))
            .perform(webClick())

        // 5. Wait for the lightweight cinematic warp fade-out and canvas context cleanup
        Thread.sleep(2000)

        // 6. Verify that the primary Space Capsule HUD elements are smoothly revealed
        onWebView()
            .withElement(findElement(Locator.ID, "app-ui"))
            .check(webMatches(androidx.test.espresso.web.webdriver.DriverAtoms.getText(), containsString("GOOD")))
    }
}
