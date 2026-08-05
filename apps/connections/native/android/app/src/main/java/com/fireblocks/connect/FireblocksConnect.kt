package com.fireblocks.connect

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.browser.customtabs.CustomTabsIntent
import java.security.SecureRandom

// ── Result ───────────────────────────────────────────────────────────────────

/** A wallet the user connected through the hosted Fireblocks flow. */
data class WalletConnection(
    val address: String,
    /** "evm" | "solana" */
    val chain: String,
    val walletName: String,
    /** Icon URL — usually an SVG-sprite URL, so render it in a WebView <img>. */
    val walletImage: String,
    /** The flow's session id, echoed back on the callback. Log it so a support
     *  report can be tied to a specific attempt. */
    val sessionId: String,
)

sealed class FireblocksConnectResult {
    data class Success(val wallet: WalletConnection) : FireblocksConnectResult()
    /** User dismissed the browser, or the flow reported a cancel. */
    object Cancelled : FireblocksConnectResult()
    /** Nonce mismatch (possible CSRF), an unparseable return, or a failure the
     *  flow reported. `code` is a stable machine code (e.g. "user_rejected")
     *  when the flow reported one; `sessionId` names the attempt. */
    data class Error(val reason: String, val code: String? = null, val sessionId: String? = null) :
        FireblocksConnectResult()
}

// ── Flow ─────────────────────────────────────────────────────────────────────

/**
 * Connect a self-custodial wallet through a hosted Fireblocks page — no SDK.
 *
 * ```kotlin
 * FireblocksConnect.present(
 *     context = this,
 *     flowURL = "https://connect.example.com/",
 *     scheme = "myapp",          // must match the intent-filter in AndroidManifest
 * ) { result ->
 *     when (result) {
 *         is FireblocksConnectResult.Success -> { /* result.wallet.address, .chain … */ }
 *         is FireblocksConnectResult.Cancelled -> {}
 *         is FireblocksConnectResult.Error -> { /* result.reason */ }
 *     }
 * }
 * ```
 *
 * Opens the page in a **Chrome Custom Tab** — Android's secure, sandboxed in-app
 * browser (the analog of iOS `ASWebAuthenticationSession`). The page returns to
 * `<scheme>://wallet-callback?address=…&nonce=…`, which `FireblocksRedirectActivity`
 * catches (see the AndroidManifest snippet in the README). This object appends
 * `redirect_uri` + a random `nonce` + `embedded=1`, verifies the nonce, and calls
 * your callback.
 *
 * Single in-flight connection at a time; the callback is held statically. For a
 * production app, prefer holding it in a ViewModel so it survives process death.
 */
object FireblocksConnect {
    private const val CALLBACK_HOST = "wallet-callback"

    private var pendingNonce: String? = null
    private var pendingCallback: ((FireblocksConnectResult) -> Unit)? = null

    fun present(
        context: Context,
        flowURL: String,
        scheme: String,
        onResult: (FireblocksConnectResult) -> Unit,
    ) {
        pendingNonce = randomNonce()
        pendingCallback = onResult
        val url = buildUrl(flowURL, scheme, pendingNonce!!)
        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
    }

    /** Called by [FireblocksRedirectActivity] when the return URL fires. */
    internal fun handleRedirect(uri: Uri) {
        val callback = pendingCallback ?: return
        val expected = pendingNonce
        pendingCallback = null
        pendingNonce = null

        if (uri.getQueryParameter("nonce") != expected) {
            callback(FireblocksConnectResult.Error("nonce mismatch"))
            return
        }
        // The flow reports failures through this same callback (status=error /
        // cancelled) so we learn the outcome and which session it was.
        val sessionId = uri.getQueryParameter("session_id").orEmpty()
        when (uri.getQueryParameter("status")) {
            "cancelled" -> {
                callback(FireblocksConnectResult.Cancelled)
                return
            }
            "error" -> {
                val code = uri.getQueryParameter("error_code") ?: "unknown"
                callback(FireblocksConnectResult.Error("connection failed", code, sessionId))
                return
            }
        }
        val address = uri.getQueryParameter("address").orEmpty()
        if (address.isEmpty()) {
            callback(FireblocksConnectResult.Error("malformed result"))
            return
        }
        callback(
            FireblocksConnectResult.Success(
                WalletConnection(
                    address = address,
                    chain = uri.getQueryParameter("chain").orEmpty(),
                    walletName = uri.getQueryParameter("walletName").orEmpty(),
                    walletImage = uri.getQueryParameter("walletImage").orEmpty(),
                    sessionId = sessionId,
                )
            )
        )
    }

    private fun buildUrl(flowURL: String, scheme: String, nonce: String): String {
        val sep = if (flowURL.contains("?")) "&" else "?"
        return flowURL + sep +
            "redirect_uri=" + Uri.encode("$scheme://$CALLBACK_HOST") +
            "&nonce=" + Uri.encode(nonce) +
            "&embedded=1"
    }

    /** Cryptographically-random nonce (CSRF correlation; not a secret). */
    private fun randomNonce(): String {
        val bytes = ByteArray(16)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }
}

// ── Return catcher ─────────────────────────────────────────────────────────────

/**
 * Receives `<scheme>://wallet-callback`, hands it to [FireblocksConnect], and
 * bounces back to the app (dismissing the Custom Tab). Declare it in your
 * AndroidManifest with `launchMode="singleTask"` and an intent-filter for your
 * scheme + the `wallet-callback` host (see README).
 */
class FireblocksRedirectActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        intent?.data?.let { uri ->
            // Headless Phantom returns to <scheme>://phantom-headless — let the
            // headless engine consume it first; otherwise it's a visible-flow return.
            if (!FireblocksHeadlessConnect.handleReturnURL(uri)) {
                FireblocksConnect.handleRedirect(uri)
            }
        }
        // Bring the app's own UI back to the front, closing the Custom Tab.
        packageManager.getLaunchIntentForPackage(packageName)?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            startActivity(it)
        }
        finish()
    }
}
