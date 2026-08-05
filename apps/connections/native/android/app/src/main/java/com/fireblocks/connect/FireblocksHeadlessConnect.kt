package com.fireblocks.connect

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject

// ── Headless connect engine (Android) ────────────────────────────────────────

/**
 * Runs the hosted Fireblocks connect logic (the Dynamic SDK) inside a HIDDEN
 * [WebView], so the app can render its own native wallet list and still keep
 * every bit of connection logic in the web layer. The Android analog of iOS's
 * `FireblocksHeadlessConnect`.
 *
 * For WalletConnect-protocol wallets (MetaMask, Rainbow, Trust, …) the pairing
 * is relay-based: the engine mints a URI, we open the wallet via deeplink, the
 * user approves, and the approval resolves over a WebSocket — no visible page.
 * Wallets with no such path (Base Account passkey/email, …) come back as
 * [Result.FallbackRequired] so the caller opens the visible [FireblocksConnect].
 *
 * The app links **no wallet SDK**: it loads a URL, relays JSON messages over a
 * bridge, opens a deeplink, and renders a list. Everything wallet-specific is
 * JavaScript in the hidden WebView.
 *
 * ```kotlin
 * FireblocksHeadlessConnect.prewarm(activity)                 // at launch
 * FireblocksHeadlessConnect.connect(activity, "rainbow", "evm") { result ->
 *     when (result) {
 *         is FireblocksHeadlessConnect.Result.Success -> { /* result.wallet */ }
 *         is FireblocksHeadlessConnect.Result.FallbackRequired -> { /* visible flow */ }
 *         is FireblocksHeadlessConnect.Result.Failure -> { /* result.code */ }
 *     }
 * }
 * ```
 */
object FireblocksHeadlessConnect {

    /** The no-UI engine page. `returnScheme` points Phantom's redirect at your
     *  app scheme so it returns to the app. Replace `fbapp` with your scheme. */
    private const val ENGINE_URL =
        // Point this at your own deployment of apps/connections.
        "https://connections.dynamic.dev/headless?returnScheme=fbapp"

    /** If the engine hasn't produced a deeplink within this window, fall back to
     *  the visible flow. Cancelled once the wallet opens. */
    private const val STARTUP_TIMEOUT_MS = 20_000L

    /** Wallet universal-link hosts iOS/Android won't hand to the wallet app from
     *  inside a WebView (only Phantom's redirect navigates the WebView today) —
     *  the WebViewClient opens these externally. */
    private val WALLET_HOSTS = setOf(
        "phantom.app", "phantom.com",
        "link.metamask.io", "metamask.app.link",
        "link.trustwallet.com", "rnbwapp.com", "rainbow.me",
        "www.okx.com", "link.okx.com", "zerion.io",
    )

    /** A wallet in the native list, delivered live by the engine (derived from
     *  the Dynamic catalogue — no static file). */
    data class Wallet(
        val key: String,
        val name: String,
        val icon: String?,
        val chains: List<String>,
        /** "headless" → drive this engine; "fallback" → the visible flow. */
        val mode: String,
        /** Shown by default; the rest of the catalogue rides along for search. */
        val featured: Boolean,
    ) {
        val isMultiChain: Boolean get() = chains.size > 1
    }

    sealed class Result {
        data class Success(val wallet: WalletConnection) : Result()
        data class FallbackRequired(val reason: String) : Result()
        data class Failure(val code: String, val message: String) : Result()
    }

    private val main = Handler(Looper.getMainLooper())
    private var appContext: Context? = null
    private var webView: WebView? = null
    private var ready = false
    private val pendingReady = mutableListOf<() -> Unit>()

    // Single in-flight attempt (mirrors the iOS engine). For production, hold
    // this in a ViewModel so it survives configuration changes / process death.
    private var handler: ((Result) -> Unit)? = null
    private var timeout: Runnable? = null

    private var walletsList: List<Wallet> = emptyList()
    /** Set to receive the wallet menu. Replayed immediately if already delivered. */
    var onWallets: ((List<Wallet>) -> Unit)? = null
        set(value) {
            field = value
            if (walletsList.isNotEmpty()) value?.invoke(walletsList)
        }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Build + load the hidden WebView ahead of time so the first connect is
     *  fast. Safe to call more than once. */
    fun prewarm(activity: Activity) = main.post { ensureWebView(activity) }

    fun connect(
        activity: Activity,
        walletKey: String,
        chain: String?,
        onResult: (Result) -> Unit,
    ) = main.post {
        ensureWebView(activity)
        // A previous attempt is still in flight (e.g. the user opened MetaMask,
        // ignored the prompt, and is now trying another wallet). The SDK can hold
        // a stuck pending connection that blocks the next mint — reset to a fresh
        // engine so the new wallet gets a clean slate.
        if (handler != null) resetEngine()
        handler = onResult
        scheduleStartupTimeout()
        val work = { drive(walletKey, chain) }
        if (ready) work() else pendingReady.add(work)
    }

    // Reload the hidden WebView to abandon a stuck previous attempt. The reloaded
    // page re-fires `ready` (flushing any queued connect) and re-pushes the list.
    private fun resetEngine() {
        handler = null
        clearTimeout()
        ready = false
        pendingReady.clear()
        webView?.reload()
    }

    /** Abort the in-flight attempt (e.g. the user backed out of the list). */
    fun cancel() = main.post {
        webView?.evaluateJavascript("window.fbHeadless && window.fbHeadless.cancel('');", null)
        clearTimeout()
        handler = null
    }

    /** Called from [FireblocksRedirectActivity] when Phantom returns to the
     *  app's `<scheme>://phantom-headless`. Forwards it into the WebView so the
     *  engine can complete the connection. Returns true if it consumed the URL. */
    fun handleReturnURL(uri: Uri): Boolean {
        if (uri.host?.lowercase() != "phantom-headless") return false
        val js = "window.fbHeadless && window.fbHeadless.handleReturnURL(${JSONObject.quote(uri.toString())});"
        main.post { webView?.evaluateJavascript(js, null) }
        return true
    }

    // ── WebView lifecycle ───────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun ensureWebView(activity: Activity) {
        if (webView != null) return
        appContext = activity.applicationContext
        val wv = WebView(activity)
        wv.settings.javaScriptEnabled = true
        wv.settings.domStorageEnabled = true
        wv.addJavascriptInterface(Bridge(), "fbNative")
        wv.webViewClient = object : WebViewClient() {
            // The engine navigates to wallet deeplinks (Phantom's redirect); the
            // system won't open those from inside a WebView, so we do.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val scheme = url.scheme?.lowercase()
                if (scheme != "http" && scheme != "https") {
                    openExternally(url); return true
                }
                val host = url.host?.lowercase()
                if (host != null && WALLET_HOSTS.any { host == it || host.endsWith(".$it") }) {
                    openExternally(url); return true
                }
                return false
            }
        }
        // Keep it in the hierarchy (1×1) so its JS + relay socket keep running,
        // and DON'T call onPause() — that would suspend the socket. We rely on
        // Android keeping a short app-switch alive; for long approvals consider a
        // foreground service.
        val root = activity.findViewById<ViewGroup>(android.R.id.content)
        root.addView(wv, 1, 1)
        wv.loadUrl(ENGINE_URL)
        webView = wv
    }

    private fun drive(walletKey: String, chain: String?) {
        val params = JSONObject()
            .put("requestId", "req")
            .put("walletKey", walletKey)
        if (chain != null) params.put("chain", chain)
        webView?.evaluateJavascript("window.fbHeadless && window.fbHeadless.connect($params);", null)
    }

    private fun openExternally(uri: Uri) {
        val ctx = appContext ?: return
        try {
            ctx.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) {
            // No app to handle it — the engine will surface an error/timeout.
        }
    }

    // ── Bridge (JS → native) ──────────────────────────────────────────────────

    // @JavascriptInterface methods run on a binder thread; marshal to main.
    private inner class Bridge {
        @JavascriptInterface
        fun postMessage(json: String) = main.post { handleMessage(json) }
    }

    private fun handleMessage(json: String) {
        val o = runCatching { JSONObject(json) }.getOrNull() ?: return
        when (o.optString("type")) {
            "ready" -> {
                ready = true
                val work = pendingReady.toList()
                pendingReady.clear()
                work.forEach { it() }
            }
            "wallets" -> {
                walletsList = parseWallets(o.optJSONArray("wallets"))
                onWallets?.invoke(walletsList)
            }
            "deeplink" -> {
                clearTimeout() // the wallet is opening; wait for the user now
                o.optString("url").takeIf { it.isNotEmpty() }?.let { openExternally(Uri.parse(it)) }
            }
            "opening" -> clearTimeout()
            "connected" -> finish(
                Result.Success(
                    WalletConnection(
                        address = o.optString("address"),
                        chain = o.optString("chain"),
                        walletName = o.optString("walletName"),
                        walletImage = o.optString("walletImage"),
                        sessionId = o.optString("sessionId"),
                    ),
                ),
            )
            "fallback" -> finish(Result.FallbackRequired(o.optString("reason")))
            "error" -> finish(Result.Failure(o.optString("code", "unknown"), o.optString("message")))
            // "event" — diagnostic timeline; hook up logging/analytics if wanted.
        }
    }

    private fun parseWallets(arr: JSONArray?): List<Wallet> {
        if (arr == null) return emptyList()
        return (0 until arr.length()).mapNotNull { i ->
            val w = arr.optJSONObject(i) ?: return@mapNotNull null
            val chains = w.optJSONArray("chains")
            Wallet(
                key = w.optString("key"),
                name = w.optString("name"),
                icon = w.optString("icon").takeIf { it.isNotEmpty() },
                chains = if (chains == null) emptyList()
                else (0 until chains.length()).map { chains.optString(it) },
                mode = w.optString("mode", "fallback"),
                featured = w.optBoolean("featured", false),
            )
        }
    }

    private fun finish(result: Result) {
        val cb = handler ?: return
        handler = null
        clearTimeout()
        main.post { cb(result) }
    }

    private fun scheduleStartupTimeout() {
        clearTimeout()
        timeout = Runnable {
            finish(Result.FallbackRequired("headless startup timeout"))
        }.also { main.postDelayed(it, STARTUP_TIMEOUT_MS) }
    }

    private fun clearTimeout() {
        timeout?.let { main.removeCallbacks(it) }
        timeout = null
    }
}
