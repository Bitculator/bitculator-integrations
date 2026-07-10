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

## Install (2 minutes)

1. **Get an API key** — free tier, no card: create one in your
   [developer console](https://bitculator.com/user/developer/api).
2. In your spreadsheet: **Extensions → Apps Script**, delete the sample code,
   paste the contents of [`Code.gs`](Code.gs), and save.
3. **Set your key** (pick one):
   - *Hidden (recommended):* in the Apps Script editor, edit `setApiKey()`,
     paste your key into the placeholder, run it once (Run ▶), then remove the
     key from the source again. It is stored in Script Properties, invisible
     to people you share the sheet with.
   - *Simple:* put the key in any cell and name that cell `BITCULATOR_KEY`
     (Data → Named ranges). Anyone who can open the sheet can see it — fine
     for personal sheets, not for shared ones.
4. **First run only — authorize your own script.** Google shows a
   *"Google hasn't verified this app"* warning whenever a personal Apps Script
   asks for permissions (here: fetching from the API, storing your key). The
   "developer" it warns about is **you** — your own account, running your own
   pasted script. Click **Advanced → Go to project (unsafe) → Allow**.
   (Marketplace verification only applies to published add-ons; a pasted
   script always shows this screen once.)
5. Type `=BITCULATOR_PRICE("bitcoin")` in a cell.

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
