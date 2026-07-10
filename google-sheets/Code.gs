/**
 * Bitculator for Google Sheets — live crypto market data as custom functions.
 *
 *   =BITCULATOR_PRICE("bitcoin")               → live price (USD)
 *   =BITCULATOR_PRICE("bitcoin"; "eur")        → live price converted
 *   =BITCULATOR("bitcoin"; "rank")             → any field of a coin
 *   =BITCULATOR_CONVERT(0.5; "bitcoin"; "usd") → conversion at live rates
 *   =BITCULATOR_HISTORY("bitcoin"; "1d"; 30)   → OHLC candles (spills a table)
 *   =BITCULATOR_GLOBAL("marketcap")            → global market metrics
 *   =BITCULATOR_FEARGREED()                    → Fear & Greed index
 *
 * Setup (one time):
 *   1. Get a Data API key: https://bitculator.com/user/developer/api
 *   2. In the sheet: Extensions → Apps Script → paste this file → save.
 *   3. Set the key EITHER by running setApiKey() once from the editor
 *      (stores it in Script Properties, hidden from the grid) OR by naming
 *      a cell "BITCULATOR_KEY" (Data → Named ranges) and putting it there.
 *
 * Every response is cached for 60 seconds, so a sheet full of formulas
 * re-uses one API call per endpoint instead of draining your quota on
 * every recalculation.
 *
 * Precision note: the API returns prices as decimal strings; Sheets cells
 * are IEEE doubles, so values are parsed to numbers for use in formulas.
 *
 * API reference: https://bitculator.com/en/documentation/api/v1
 */

var BASE_URL = 'https://bitculator.com/api/v1';
var CACHE_SECONDS = 60;

// ── setup ────────────────────────────────────────────────────────────────────

/**
 * Run this ONCE from the Apps Script editor (Run → setApiKey) after pasting
 * your key below. Stored in Script Properties — not visible in the sheet.
 */
function setApiKey() {
  var key = 'PASTE-YOUR-API-KEY-HERE';
  if (key === 'PASTE-YOUR-API-KEY-HERE') {
    throw new Error('Edit setApiKey() and replace the placeholder with your real key first.');
  }
  PropertiesService.getScriptProperties().setProperty('BITCULATOR_API_KEY', key);
}

function getApiKey_() {
  try {
    var stored = PropertiesService.getScriptProperties().getProperty('BITCULATOR_API_KEY');
    if (stored) return stored;
  } catch (ignored) {
    // Custom-function context without Properties access — fall through.
  }
  try {
    var range = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('BITCULATOR_KEY');
    if (range) {
      var value = String(range.getValue() || '').trim();
      if (value) return value;
    }
  } catch (ignored2) {}
  throw new Error('No API key. Run setApiKey() in the script editor, or put your key in a cell named BITCULATOR_KEY.');
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

  var cache = CacheService.getScriptCache();
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
  // The endpoint answers with the conversion result; accept the common shapes.
  if (data !== null && typeof data === 'object') {
    var field = ['result', 'amount', 'value', 'converted'].filter(function (key) { return key in data; })[0];
    if (field) return numify_(data[field]);
  }
  return numify_(data);
}

/** API interval names + the shorthands spreadsheet users actually type. */
var INTERVAL_ALIASES = { '1m': 'minutely', '30m': 'half-hourly', '1h': 'hourly', '1d': 'daily' };

/**
 * OHLC candle history — spills a table of Date | Open | High | Low | Close.
 *
 * @param {"bitcoin"} slug Coin slug.
 * @param {"daily"} interval minutely, half-hourly, hourly or daily (default daily; 1m/30m/1h/1d also accepted).
 * @param {30} limit Number of candles (default 30).
 * @return {Array<Array>} A table of candles, newest last.
 * @customfunction
 */
function BITCULATOR_HISTORY(slug, interval, limit) {
  if (!slug) throw new Error('Bitculator: pass a coin slug.');
  var normalized = String(interval || 'daily').toLowerCase();
  var params = { interval: INTERVAL_ALIASES[normalized] || normalized, limit: limit || 30 };
  var rows = fetch_('/coins/' + encodeURIComponent(slug) + '/history', params);
  if (!rows || !rows.length) return [['(no data)']];

  var header = ['Date', 'Open', 'High', 'Low', 'Close'];
  var table = [header];
  for (var i = 0; i < rows.length; i++) {
    var candle = rows[i];
    var when = candle.time || candle.date || candle.timestamp || '';
    var parsed = when ? new Date(when) : null;
    table.push([
      parsed && !isNaN(parsed.getTime()) ? parsed : when,
      numify_(candle.open), numify_(candle.high), numify_(candle.low), numify_(candle.close),
    ]);
  }
  return table;
}

/** Friendly names → the /global endpoint's real keys. */
var GLOBAL_ALIASES = {
  marketcap: 'total_marketcap',
  volume: 'total_volume_24h',
  volume_24h: 'total_volume_24h',
  cryptocurrencies: 'total_cryptocurrencies',
  coins: 'total_cryptocurrencies',
  tokens: 'total_tokens',
  exchanges: 'total_exchanges',
  pairs: 'total_pairs',
  markets: 'total_markets',
  feargreed: 'fear_greed',
};

/**
 * Global market metrics (marketcap, volume, dominance, …).
 *
 * @param {"marketcap"} field Field name (marketcap, volume, dominance.btc, fear_greed, …); omit to spill all fields as rows.
 * @return The metric, or a two-column table of all metrics.
 * @customfunction
 */
function BITCULATOR_GLOBAL(field) {
  var data = fetch_('/global', {});
  if (field) {
    var parts = String(field).toLowerCase().split('.');
    parts[0] = GLOBAL_ALIASES[parts[0]] || parts[0];
    return pluck_(data, parts.join('.'));
  }
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
