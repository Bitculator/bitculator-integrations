# Bitculator integrations

Ready-made connectors for tools that aren't programming languages — the
spreadsheet crowd. For code, use the
[official SDKs](https://bitculator.com/en/crypto-api#sdks)
(TypeScript, Python, PHP, Go, Rust, Java, C#, C++ — all under
[github.com/Bitculator](https://github.com/Bitculator)).

| Integration | What you get | Docs |
|---|---|---|
| **Google Sheets** | `=BITCULATOR_PRICE("bitcoin")` and friends — custom functions with 60s caching | [google-sheets/](google-sheets/) |
| **Google Sheets add-on** | Same functions as a one-click Workspace Marketplace install (sidebar for the key, no code editing) | [google-sheets-addon/](google-sheets-addon/) *(Marketplace review pending)* |
| **Microsoft Excel** | Power Query refreshable tables (desktop) + Office Script (web/365) | [excel/](excel/) |

All of them use the [Bitculator Data API](https://bitculator.com/en/crypto-api)
with a personal Bearer key (free tier available — create one in the
[developer console](https://bitculator.com/user/developer/api)).

Unlike the SDKs, these connectors deliberately cover only the read endpoints a
spreadsheet needs (prices, coins, history, conversion, global, sentiment) — an
API change only touches them when one of those endpoints changes.
