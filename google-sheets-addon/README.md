# Bitculator for Google Sheets — Marketplace add-on

The one-click edition of the [paste-in connector](../google-sheets/): same six
`=BITCULATOR_*` custom functions, but installed from the **Google Workspace
Marketplace** with a verified Bitculator consent screen (no "unverified app"
warning) and a sidebar for the API key (no code editing).

| File | Purpose |
|---|---|
| `Code.gs` | Functions + transport (derived from `../google-sheets/Code.gs` — keep transports in sync) + add-on menu/sidebar plumbing |
| `Sidebar.html` | "Set API key" sidebar (per-user storage; collaborators never see it) |
| `appsscript.json` | Manifest: V8, minimal OAuth scopes, **fetch whitelist locked to bitculator.com** |

Design notes that differ from the paste-in edition — deliberate, don't "fix":

- **Keys live in User Properties, not Script Properties.** A published add-on
  is ONE script project shared by every installer; Script Properties would
  share one user's key with all of them. User Properties are per-user.
- The cache is `getUserCache()` for the same reason (quota isolation per user).
- The named-range `BITCULATOR_KEY` fallback still works, and matters: custom
  functions run in a restricted context, and the named range is the guaranteed
  path for shared sheets where viewers haven't opened the sidebar.

---

## Publishing checklist (one-time, ~1 hour of clicks + Google's review wait)

### A · Create the Apps Script project

1. Go to <https://script.google.com> → **New project**. Name it `Bitculator`.
2. Paste `Code.gs` over the default file. **+ → HTML**, name it `Sidebar`,
   paste `Sidebar.html`.
3. Project Settings (⚙) → check **"Show appsscript.json manifest file"** →
   replace its contents with our `appsscript.json`.
4. Still in Project Settings → **Change project** under "Google Cloud
   Platform (GCP) Project" — you'll paste a project number from step B4.

### B · Google Cloud project + OAuth consent screen

1. <https://console.cloud.google.com> → New project → `bitculator-sheets-addon`.
2. **APIs & Services → OAuth consent screen**: User type **External** →
   app name `Bitculator`, support email, the Bitculator logo, app domain
   `bitculator.com`, privacy policy + terms URLs (reuse the ones from the
   Chrome Web Store listing), developer contact.
3. **Scopes** → add exactly the three from `appsscript.json`:
   `script.external_request`, `script.container.ui`,
   `spreadsheets.currentonly`.
4. **Audience → Publish app** (to "In production"). Copy the **project
   number** (IAM & Admin → Settings) and link it in step A4.
5. Because `script.external_request` is a *sensitive* scope, Google asks for
   verification. Suggested justification text:

   > Bitculator for Google Sheets provides spreadsheet functions
   > (=BITCULATOR_PRICE etc.) that fetch cryptocurrency market data from the
   > user's own Bitculator Data API account. `script.external_request` is used
   > exclusively to call `https://bitculator.com/api/v1/*` (see the
   > `urlFetchWhitelist` in the manifest — no other host is reachable).
   > `script.container.ui` shows the sidebar where the user stores their own
   > API key. `spreadsheets.currentonly` reads an optional key cell named
   > BITCULATOR_KEY in the active sheet only. No user data is collected,
   > transmitted anywhere except bitculator.com, or shared.

   They may also ask for a short demo video (screen-record: install → sidebar
   → key → formula fills a cell).

### C · Test it yourself before review

Apps Script editor → **Deploy → Test deployments → Install** (type:
Editor add-on, Sheets). Open any spreadsheet → Extensions → Bitculator →
Set API key → paste a real key → `=BITCULATOR_PRICE("bitcoin")`.
This install path is exactly what users get post-publication, minus review.

### D · Marketplace listing

1. In the **Cloud console**: APIs & Services → Library → enable
   **Google Workspace Marketplace SDK**.
2. Marketplace SDK → **App Configuration**: app integration = *Editor add-on →
   Sheets*; deployment = create a versioned deployment in the Apps Script
   editor (Deploy → New deployment → Add-on) and paste its ID; visibility
   Public.
3. **Store Listing**: name `Bitculator`, category Productivity/Finance,
   descriptions (crib from `../google-sheets/README.md` intro), icons
   (128/96/48/32 px), at least one 1280×800 screenshot (the sidebar + a sheet
   of live formulas), support links (bitculator.com/en/contact, the docs).
4. Submit for review. Sensitive-scope review typically lands within days to
   ~2 weeks. The single-domain fetch whitelist and tiny scope set are the
   strongest levers we have — they make the reviewer's job trivial.

### E · After approval

- Update the Sheets card link in `ApiIntegrations.vue` (the /crypto-api
  landing section) from the GitHub guide to the Marketplace listing URL.
- Keep the paste-in guide (`../google-sheets/`) published — it's the
  power-user/instant path and needs no review to update.
- Future function changes: edit the Apps Script project, create a new
  versioned deployment, update it in Marketplace SDK → App Configuration.
  Listing-only edits don't need re-review; new scopes do.
