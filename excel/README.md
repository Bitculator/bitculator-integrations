# Bitculator for Microsoft Excel

Two supported paths, depending on how you use Excel:

| You use… | Use this | Refresh model |
|---|---|---|
| Excel desktop (Windows/Mac) | **Power Query** (below) | Data → Refresh All, or auto-refresh interval |
| Excel on the web / Microsoft 365 | **Office Script** ([`bitculator-refresh.ts`](bitculator-refresh.ts)) | Run from Automate tab, or schedule with Power Automate |

Both need a Data API key — free tier, no card:
create one in your [developer console](https://bitculator.com/user/developer/api).

---

## Power Query (Excel desktop)

Power Query is Excel's built-in data engine; it can call the API with your
Bearer key and gives you real refreshable tables.

**1. Create the reusable query function.** Data → Get Data → From Other
Sources → Blank Query → Advanced Editor, paste:

```m
// fnBitculator — call any Bitculator Data API endpoint.
// Usage: fnBitculator("coins", [per_page = "10"])
let
    ApiKey = "PASTE-YOUR-API-KEY-HERE",
    fnBitculator = (path as text, optional query as record) as any =>
        Json.Document(
            Web.Contents(
                "https://bitculator.com/api/v1",
                [
                    RelativePath = path,
                    Query = if query = null then [] else query,
                    Headers = [
                        #"Authorization" = "Bearer " & ApiKey,
                        #"Accept" = "application/json"
                    ]
                ]
            )
        )
in
    fnBitculator
```

Name the query `fnBitculator`. When prompted for credentials choose
**Anonymous** (the key travels in the header, which is why we never use
Excel's `WEBSERVICE()` — it cannot send headers).

**2. Build tables from it.** New Blank Query → Advanced Editor:

```m
// Top-100 coins table
let
    Response = fnBitculator("coins", [per_page = "100"]),
    Coins    = Table.FromRecords(Response[data]),
    Typed    = Table.TransformColumnTypes(Coins, {{"price", type number}, {"rank", Int64.Type}})
in
    Typed
```

```m
// 90 daily BTC candles
let
    Response = fnBitculator("coins/bitcoin/history", [interval = "1d", limit = "90"]),
    Candles  = Table.FromRecords(Response[data])
in
    Candles
```

```m
// Single live price as a value
let
    Response = fnBitculator("prices/bitcoin", [convert = "usd"])
in
    Response[data][price]
```

Load To… → Table. Refresh with **Data → Refresh All**; right-click the query →
Properties to set a background refresh interval (keep it ≥ 1 minute — prices
update about once a minute, faster refreshes only spend quota).

**Key visibility note:** the key lives inside the query text, readable by
anyone who can open the workbook. Use a key you can rotate, and keep shared
workbooks on the free tier.

---

## Office Script (Excel on the web)

[`bitculator-refresh.ts`](bitculator-refresh.ts) writes a live coins table
into a worksheet. Automate tab → New Script → paste → set your key → Run.
Schedule it hands-free with Power Automate ("Run script" action on a timer).

---

- Coin **slugs** are the ones bitculator.com uses in its URLs (`bitcoin`, `ethereum`, …).
- Prices arrive as decimal strings for precision; both recipes convert to
  numbers for spreadsheet math.
- Full API reference: <https://bitculator.com/en/documentation/api/v1>
