package com.fireblocks.connect.sample

import android.app.Activity
import android.app.AlertDialog
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.widget.doAfterTextChanged
import com.fireblocks.connect.FireblocksConnect
import com.fireblocks.connect.FireblocksConnectResult
import com.fireblocks.connect.FireblocksHeadlessConnect
import com.fireblocks.connect.FireblocksHeadlessConnect.Wallet
import com.fireblocks.connect.WalletConnection

// Reference example: the app renders its OWN native wallet list and drives
// FireblocksHeadlessConnect (a hidden WebView). Tapping a headless wallet
// connects with no visible web UI; a fallback wallet (or any headless failure)
// opens the visible FireblocksConnect flow. All connection logic — and the list
// itself — comes from the web layer. This list UI is sample code you'd replace
// with your own design.
class MainActivity : Activity() {

    private val flowUrl = "https://connections.dynamic.dev/"
    private val scheme = "fbapp" // must match the intent-filter in AndroidManifest

    private var all: List<Wallet> = emptyList()
    private var connectingKey: String? = null

    private lateinit var status: TextView
    private lateinit var search: EditText
    private lateinit var listContainer: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 60, 40, 40)
            setBackgroundColor(Color.WHITE)
        }
        root.addView(TextView(this).apply {
            text = "Connect a wallet"
            textSize = 22f
            setTextColor(Color.parseColor("#0E121B"))
        })
        status = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.parseColor("#606770"))
            setPadding(0, 16, 0, 16)
        }
        root.addView(status)
        search = EditText(this).apply {
            hint = "Search for your wallet"
            doAfterTextChanged { renderList() }
        }
        root.addView(search)
        listContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(ScrollView(this).apply { addView(listContainer) })
        setContentView(root)

        // Pre-warm the engine so the first connect is fast, and receive the
        // wallet list it derives from the catalogue.
        FireblocksHeadlessConnect.prewarm(this)
        FireblocksHeadlessConnect.onWallets = { wallets ->
            runOnUiThread { all = wallets; renderList() }
        }
        renderList()
    }

    private fun visible(): List<Wallet> {
        val q = search.text.toString().trim().lowercase()
        // Default: featured wallets (like the web home). Searching: the whole catalogue.
        return if (q.isEmpty()) all.filter { it.featured }
        else all.filter { it.name.lowercase().contains(q) || it.key.lowercase().contains(q) }
    }

    private fun renderList() {
        listContainer.removeAllViews()
        if (all.isEmpty()) {
            listContainer.addView(TextView(this).apply { text = "Loading wallets…" })
            return
        }
        for (w in visible()) listContainer.addView(walletRow(w))
    }

    private fun walletRow(wallet: Wallet): View = Button(this).apply {
        text = wallet.name + if (connectingKey == wallet.key) "  · connecting…" else ""
        isAllCaps = false
        gravity = Gravity.START or Gravity.CENTER_VERTICAL
        setBackgroundColor(Color.parseColor("#F0F2F5"))
        setTextColor(Color.parseColor("#0E121B"))
        isEnabled = connectingKey == null
        setOnClickListener { tap(wallet) }
        layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = 12 }
    }

    private fun tap(wallet: Wallet) {
        if (wallet.isMultiChain) {
            val chains = wallet.chains.toTypedArray()
            AlertDialog.Builder(this)
                .setTitle("Choose a chain")
                .setItems(chains.map(::chainLabel).toTypedArray()) { _, i -> start(wallet, chains[i]) }
                .show()
        } else {
            start(wallet, wallet.chains.firstOrNull())
        }
    }

    private fun start(wallet: Wallet, chain: String?) {
        connectingKey = wallet.key
        status.text = "Opening ${wallet.name}…"
        renderList()
        if (wallet.mode == "fallback") {
            openFallback(wallet, chain)
            return
        }
        FireblocksHeadlessConnect.connect(this, wallet.key, chain) { result ->
            runOnUiThread {
                when (result) {
                    is FireblocksHeadlessConnect.Result.Success -> showConnected(result.wallet)
                    is FireblocksHeadlessConnect.Result.FallbackRequired -> openFallback(wallet, chain)
                    is FireblocksHeadlessConnect.Result.Failure -> fail("Couldn't connect (${result.code})")
                }
            }
        }
    }

    // The visible flow, deep-linked straight to this wallet via `?wallet=`.
    private fun openFallback(wallet: Wallet, chain: String?) {
        val builder = Uri.parse(flowUrl).buildUpon().appendQueryParameter("wallet", wallet.key)
        if (chain != null) builder.appendQueryParameter("chain", chain)
        FireblocksConnect.present(this, builder.build().toString(), scheme) { result ->
            runOnUiThread {
                when (result) {
                    is FireblocksConnectResult.Success -> showConnected(result.wallet)
                    is FireblocksConnectResult.Cancelled -> { connectingKey = null; status.text = ""; renderList() }
                    is FireblocksConnectResult.Error -> fail("Couldn't connect (${result.reason})")
                }
            }
        }
    }

    private fun showConnected(wallet: WalletConnection) {
        connectingKey = null
        val addr = wallet.address.let { if (it.length > 12) "${it.take(6)}…${it.takeLast(4)}" else it }
        status.text = "${wallet.walletName}\n${wallet.chain} · $addr"
        renderList()
    }

    private fun fail(message: String) {
        connectingKey = null
        status.text = message
        renderList()
    }

    private fun chainLabel(chain: String) = if (chain == "solana") "Solana" else "Ethereum & EVM"
}
