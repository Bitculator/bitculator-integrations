/**
 * Bitculator for Google Sheets — Marketplace add-on edition.
 *
 * Same custom functions as the paste-in connector (../google-sheets/Code.gs —
 * the canonical transport; keep the two in sync), plus the add-on chrome:
 * an "Extensions → Bitculator" menu and a sidebar where users paste their
 * Data API key — no code editing, no unverified-app warning.
 *
 * Key differences from the paste-in edition (deliberate, do not "fix"):
 *  - Keys live in USER properties: in a published add-on the script project is
 *    shared by every installer, so Script Properties would leak one user's key
 *    to all of them. User Properties are per-user per-add-on.
 *  - The manifest (appsscript.json) pins the OAuth scopes and whitelists
 *    https://bitculator.com/ as the only fetchable host.
 *
 * API reference: https://bitculator.com/en/documentation/api/v1
 */

var BASE_URL = 'https://bitculator.com/api/v1';
var CACHE_SECONDS = 60;
var KEY_PROPERTY = 'BITCULATOR_API_KEY';

// ── add-on lifecycle ─────────────────────────────────────────────────────────

/** Runs when the add-on is installed from the Marketplace. */
function onInstall(e) {
  onOpen(e);
}

/** Runs on every spreadsheet open; may run without authorization (AuthMode.NONE). */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem('Set API key…', 'showSidebar')
    .addToUi();
}

/** Opens the key-management sidebar. */
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Bitculator');
  SpreadsheetApp.getUi().showSidebar(html);
}

// ── sidebar server API ───────────────────────────────────────────────────────

/** Saves the user's API key (per user, invisible to other users of the sheet). */
function saveApiKey(key) {
  key = String(key || '').trim();
  if (!key) throw new Error('Paste your API key first.');
  PropertiesService.getUserProperties().setProperty(KEY_PROPERTY, key);
  return keyStatus();
}

/** Removes the stored key. */
function clearApiKey() {
  PropertiesService.getUserProperties().deleteProperty(KEY_PROPERTY);
  return keyStatus();
}

/** Sidebar state: whether a key is stored, and its last 4 chars for recognition. */
function keyStatus() {
  var key = PropertiesService.getUserProperties().getProperty(KEY_PROPERTY);
  return { set: !!key, tail: key ? '…' + key.slice(-4) : null };
}

function getApiKey_() {
  var stored = PropertiesService.getUserProperties().getProperty(KEY_PROPERTY);
  if (stored) return stored;
  try {
    var range = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('BITCULATOR_KEY');
    if (range) {
      var value = String(range.getValue() || '').trim();
      if (value) return value;
    }
  } catch (ignored) {}
  throw new Error('No API key. Open Extensions → Bitculator → Set API key… (or put your key in a cell named BITCULATOR_KEY).');
}

// ── transport (one place: auth, cache, envelope, errors) ─────────────────────

function fetch_(path, params) {
  var query = [];
  for (var name in (params || {})) {
    var value = params[name];
    if (value === null || value === undefined || value === '') continue;
    query.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
  }
  var url = BASE_URL + path + (query.length ? '?' + query.join('&') : '');

  var cache = CacheService.getUserCache();
  var cached = cache.get(url);
  if (cached) return JSON.parse(cached);

  var response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + getApiKey_(), Accept: 'application/json' },
    muteHttpExceptions: true,
  });
  var status = response.getResponseCode();
  var body = JSON.parse(response.getContentText() || '{}');

  if (status < 200 || status >= 300) {
    var message = body && body.error && body.error.message ? body.error.message : 'HTTP ' + status;
    if (status === 401) message = 'Invalid API key (' + message + ')';
    if (status === 429) message = 'API quota/rate limit exceeded (' + message + ')';
    throw new Error('Bitculator: ' + message);
  }

  var data = body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
  try {
    cache.put(url, JSON.stringify(data), CACHE_SECONDS);
  } catch (tooLarge) {} // >100KB payloads simply skip the cache
  return data;
}

/** Walk a dot path ("change.day") into an object; numbers-as-strings become numbers. */
function pluck_(object, path) {
  var value = object;
  var parts = String(path).split('.');
  for (var i = 0; i < parts.length; i++) {
    if (value === null || value === undefined || !(parts[i] in Object(value))) {
      throw new Error('Bitculator: field "' + path + '" not found. Try "price", "rank", "marketcap", …');
    }
    value = value[parts[i]];
  }
  return numify_(value);
}

function numify_(value) {
  if (typeof value === 'string' && value !== '' && !isNaN(value)) return Number(value);
  return value;
}

// ── custom functions ─────────────────────────────────────────────────────────

/**
 * Live price of a coin.
 *
 * @param {"bitcoin"} slug Coin slug as used on bitculator.com.
 * @param {"eur"} convert Optional currency to convert into (default USD).
 * @return {number} The live price.
 * @customfunction
 */
function BITCULATOR_PRICE(slug, convert) {
  if (!slug) throw new Error('Bitculator: pass a coin slug, e.g. =BITCULATOR_PRICE("bitcoin")');
  var data = fetch_('/prices/' + encodeURIComponent(slug), convert ? { convert: convert } : {});
  return pluck_(data, 'price');
}

/**
 * Any field of a coin (price, rank, marketcap, volume, …; dot paths allowed).
 *
 * @param {"bitcoin"} slug Coin slug.
 * @param {"rank"} field Field name (default "price").
 * @return The field value.
 * @customfunction
 */
function BITCULATOR(slug, field) {
  if (!slug) throw new Error('Bitculator: pass a coin slug, e.g. =BITCULATOR("bitcoin"; "rank")');
  var data = fetch_('/coins/' + encodeURIComponent(slug), {});
  return pluck_(data, field || 'price');
}

/**
 * Convert an amount between currencies at live rates.
 *
 * @param {0.5} amount Amount to convert.
 * @param {"bitcoin"} from Source coin/fiat slug.
 * @param {"usd"} to Target coin/fiat slug.
 * @return {number} The converted amount.
 * @customfunction
 */
function BITCULATOR_CONVERT(amount, from, to) {
  var data = fetch_('/convert', { from: from, to: to, amount: amount });
  if (data !== null && typeof data === 'object') {
    var field = ['result', 'amount', 'value', 'converted'].filter(function (key) { return key in data; })[0];
    if (field) return numify_(data[field]);
  }
  return numify_(data);
}

/**
 * OHLC candle history — spills a table of Date | Open | High | Low | Close.
 *
 * @param {"bitcoin"} slug Coin slug.
 * @param {"1d"} interval Candle interval (default "1d").
 * @param {30} limit Number of candles (default 30).
 * @return {Array<Array>} A table of candles, newest last.
 * @customfunction
 */
function BITCULATOR_HISTORY(slug, interval, limit) {
  if (!slug) throw new Error('Bitculator: pass a coin slug.');
  var params = { interval: interval || '1d', limit: limit || 30 };
  var rows = fetch_('/coins/' + encodeURIComponent(slug) + '/history', params);
  if (!rows || !rows.length) return [['(no data)']];

  var header = ['Date', 'Open', 'High', 'Low', 'Close'];
  var table = [header];
  for (var i = 0; i < rows.length; i++) {
    var candle = rows[i];
    table.push([
      candle.date || candle.time || candle.timestamp || '',
      numify_(candle.open), numify_(candle.high), numify_(candle.low), numify_(candle.close),
    ]);
  }
  return table;
}

/**
 * Global market metrics (marketcap, volume, dominance, …).
 *
 * @param {"marketcap"} field Field name; omit to spill all fields as rows.
 * @return The metric, or a two-column table of all metrics.
 * @customfunction
 */
function BITCULATOR_GLOBAL(field) {
  var data = fetch_('/global', {});
  if (field) return pluck_(data, field);
  var table = [];
  for (var key in data) table.push([key, numify_(data[key])]);
  return table;
}

/**
 * The Fear & Greed index.
 *
 * @param {"bitcoin"} coin Optional coin slug for a per-coin index.
 * @return {number} The current index value.
 * @customfunction
 */
function BITCULATOR_FEARGREED(coin) {
  var data = fetch_('/sentiment/fear-greed', coin ? { coin: coin } : {});
  if (data !== null && typeof data === 'object') {
    var field = ['value', 'index', 'score'].filter(function (key) { return key in data; })[0];
    if (field) return numify_(data[field]);
  }
  return numify_(data);
}
