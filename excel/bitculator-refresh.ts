/**
 * Bitculator → Excel (Office Script, for Excel on the web / Microsoft 365).
 *
 * Writes a live top-coins table into the "Bitculator" worksheet. Run it from
 * the Automate tab, or schedule it with Power Automate's "Run script" action.
 *
 * Setup: paste your Data API key below (create one, free, at
 * https://bitculator.com/user/developer/api) and adjust COINS/CONVERT to taste.
 */

const API_KEY = "PASTE-YOUR-API-KEY-HERE";
const PER_PAGE = 25;        // how many coins to pull
const CONVERT = "usd";      // currency for prices
const SHEET_NAME = "Bitculator";

async function main(workbook: ExcelScript.Workbook): Promise<void> {
  if (API_KEY.startsWith("PASTE-")) {
    throw new Error("Set API_KEY at the top of the script first.");
  }

  const response = await fetch(
    `https://bitculator.com/api/v1/coins?per_page=${PER_PAGE}&convert=${CONVERT}`,
    { headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" } },
  );
  const body: {
    data?: Record<string, unknown>[];
    error?: { code?: string; message?: string };
  } = await response.json();

  if (!response.ok) {
    throw new Error(`Bitculator: ${body.error?.message ?? `HTTP ${response.status}`}`);
  }
  const coins = body.data ?? [];
  if (coins.length === 0) {
    throw new Error("Bitculator: the API returned no coins.");
  }

  // Columns to show, in order; dot paths are not needed at the top level.
  const columns = ["rank", "name", "symbol", "price", "marketcap", "volume"];
  const header = ["Rank", "Name", "Symbol", `Price (${CONVERT.toUpperCase()})`, "Marketcap", "Volume"];

  const rows: (string | number)[][] = coins.map((coin) =>
    columns.map((field) => {
      const value = coin[field];
      // Prices/supplies arrive as decimal strings for precision; cells want numbers.
      if (typeof value === "string" && value !== "" && !isNaN(Number(value))) return Number(value);
      return (value as string | number) ?? "";
    }),
  );

  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.addWorksheet(SHEET_NAME);
  sheet.getUsedRange()?.clear(ExcelScript.ClearApplyTo.contents);
  sheet.getRangeByIndexes(0, 0, 1, header.length).setValues([header]);
  sheet.getRangeByIndexes(1, 0, rows.length, header.length).setValues(rows);
  sheet.getRangeByIndexes(0, 0, 1, header.length).getFormat().getFont().setBold(true);
  sheet
    .getRange("A1")
    .getSurroundingRegion()
    .getFormat()
    .autofitColumns();

  // Timestamp so schedulers can see freshness at a glance.
  sheet.getRangeByIndexes(0, header.length + 1, 1, 1).setValue(`Updated ${new Date().toISOString()}`);
}
