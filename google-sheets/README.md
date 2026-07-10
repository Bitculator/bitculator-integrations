# Bitculator for Google Sheets

Live crypto market data in your spreadsheet — prices, history, conversions,
global metrics and the Fear & Greed index, powered by the
[Bitculator Data API](https://bitculator.com/en/crypto-api).

```
=BITCULATOR_PRICE("bitcoin")                live BTC price (USD)
=BITCULATOR_PRICE("ethereum"; "eur")        live ETH price in EUR
=BITCULATOR("bitcoin"; "rank")              any coin field (rank, marketcap, …)
=BITCULATOR_CONVERT(0.5; "bitcoin"; "usd")  convert at live rates
=BITCULATOR_HISTORY("bitcoin"; "1d"; 30)    30 daily OHLC candles (spills a table)
=BITCULATOR_GLOBAL("marketcap")             global market metrics
=BITCULATOR_FEARGREED()                     Fear & Greed index
```

## Install (5 minutes, one time)

### 1 · Get an API key

Free tier, no card: create one in your
[developer console](https://bitculator.com/user/developer/api) and keep the
tab open — you'll paste the key in step 3.

### 2 · Paste the script

In your spreadsheet: **Extensions → Apps Script**. An editor opens with a
sample `function myFunction() {}` — delete it, paste the whole contents of
[`Code.gs`](Code.gs), and press the 💾 save icon (or Ctrl/Cmd+S).

### 3 · Put your key into `setApiKey()`

In the editor, find this line near the top and replace the placeholder with
your real key (keep the quotes):

```js
var key = 'PASTE-YOUR-API-KEY-HERE';   →   var key = 'bc_live_your-key';
```

Save again. Make sure the function dropdown in the toolbar (next to Debug)
says **setApiKey**, then press **▶ Run**.

### 4 · Authorize the script — the scary-looking part, explained

The first Run pops up Google's authorization window. This is normal: the
script needs permission to call the Bitculator API and to store your key,
and because it is a *personal pasted script* (not a Marketplace add-on),
Google brands it "unverified". **The "developer" it warns you about is you —
your own account running your own script.** Walk it through:

1. Pick your Google account.
2. On the **"Google hasn't verified this app"** screen, click the small grey
   **Advanced** link — bottom-left, on the same row as the blue
   "Back to safety" button.
3. The dialog expands: click **Go to Untitled project (unsafe)** at the
   bottom.
4. On the permissions screen, click **Allow**.

Common stumbles:

- **"This project requires access to your Google Account to run. Please try
  again and allow it this time."** in the execution log — you closed the
  popup or clicked "Back to safety", so the run aborted unauthorized. Press
  ▶ Run again and complete all four clicks above.
- **The popup never appears or closes itself** — a popup blocker (Brave
  shields, strict adblock) is eating it. Allow popups for
  `script.google.com` and run again.
- **"Edit setApiKey() and replace the placeholder with your real key first."**
  — that's this script's own guard rail: step 3 wasn't done. Paste your real
  key and run again.

A successful run logs *Execution completed* with no red text. Your key is now
in Script Properties (invisible to people you share the sheet with) — you can
delete it from the `setApiKey()` source line if you like.

> **No-editor alternative:** skip steps 3–4's key handling by putting the key
> in a cell instead — name any cell `BITCULATOR_KEY` (Data → Named ranges)
> and paste the key there. Simpler, but anyone who can open the sheet can
> read the key — fine for personal sheets, not shared ones. (The first
> formula you type still triggers the authorization popup of step 4.)

### 5 · Use it

Back in the sheet, type in any cell:

```
=BITCULATOR_PRICE("bitcoin")
```

If a price appears — you're done. Every function is listed at the top of
this page.

## Quota-friendly by design

Google Sheets recalculates custom functions liberally. Every API response is
cached for **60 seconds**, so a dashboard with fifty formulas costs a handful
of API calls per minute, not fifty per recalculation. The free plan's monthly
pool goes a long way; watch live usage in your
[developer console](https://bitculator.com/user/developer/api).

## Notes

- Coin **slugs** are the ones bitculator.com uses in its URLs
  (`bitcoin`, `ethereum`, `solana`, …).
- The API returns prices as decimal **strings** for full precision; Sheets
  cells are floating-point numbers, so values are parsed for use in formulas.
- Errors show in the cell (`#ERROR!` with the reason on hover): a wrong key
  reads `Invalid API key`, an exhausted quota reads `quota/rate limit exceeded`.
- Full API reference: <https://bitculator.com/en/documentation/api/v1>
