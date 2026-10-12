import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDailyValue,
  selectDailyForecast,
  temperatureScale,
} from "../src/utils/dailyForecast.js";
import { mapWeatherData } from "../src/utils/weatherMapper.js";
import { buildForecastUrl } from "../src/api/openMeteo.js";
const days = Array.from({ length: 12 }, (_, i) => ({
  date: `2026-10-${String(11 + i).padStart(2, "0")}`,
  high: i + 10,
  low: i - 5,
}));
test("seven and twelve real dates share local midnight filtering; missing days are not fabricated", () => {
  assert.equal(selectDailyForecast(days, "2026-10-11", 7).length, 7);
  assert.equal(selectDailyForecast(days, "2026-10-11").length, 12);
  assert.equal(selectDailyForecast(days, "2026-10-12")[0].date, "2026-10-12");
  assert.equal(selectDailyForecast(days, "2026-10-12").length, 11);
  assert.deepEqual(
    selectDailyForecast(
      [{ date: "2026-02-30" }, { date: null }, days[0], days[0]],
      null,
    ),
    [days[0]],
  );
  assert.deepEqual(selectDailyForecast([], "2026-10-11"), []);
});
test("bar scale is shared by high and low temperatures and handles negatives, missing, constant and extreme values", () => {
  const scale = temperatureScale([
    { high: 40, low: -20 },
    { high: 0, low: null },
  ]);
  assert.equal(scale(-20), 0);
  assert.equal(scale(40), 1);
  assert.equal(scale(0), 1 / 3);
  assert.equal(scale(null), null);
  assert.equal(temperatureScale([{ high: -10, low: -10 }])(-10), 0.5);
  assert.equal(
    temperatureScale([{ high: Number.MAX_VALUE, low: -Number.MAX_VALUE }])(0),
    0.5,
  );
});
test("precipitation distinguishes valid zero from unavailable data and limits decimal precision", () => {
  assert.equal(formatDailyValue(0, "mm"), "0 mm");
  assert.equal(formatDailyValue(null, "mm"), "—");
  assert.equal(formatDailyValue(1.234, "mm"), "1.2 mm");
});
test("mapper keeps twelve provider dates and normalizes wind/precipitation without replacing missing values", () => {
  const mapped = mapWeatherData({
    timezone: "Asia/Tokyo",
    utc_offset_seconds: 32400,
    current: { time: Date.parse("2026-10-10T15:00:00Z") / 1000 },
    daily: {
      time: days.map((d) => Date.parse(`${d.date}T00:00:00+09:00`) / 1000),
      temperature_2m_max: days.map((d) => d.high),
      temperature_2m_min: days.map((d) => d.low),
      weather_code: days.map(() => 3),
      wind_speed_10m_max: days.map(() => 15.4),
      precipitation_sum: days.map((_, i) => (i === 0 ? 0 : null)),
    },
  });
  assert.equal(mapped.forecast.length, 12);
  assert.equal(mapped.forecast[0].date, "2026-10-11");
  assert.equal(mapped.forecast[0].day, "Today");
  assert.equal(mapped.forecast[0].windSpeedMax, 15.4);
  assert.equal(mapped.forecast[0].precipitationSum, 0);
  assert.equal(mapped.forecast[1].precipitationSum, null);
  const url = buildForecastUrl(35.7, 139.7);
  assert.equal(url.searchParams.get("forecast_days"), "12");
  assert(
    url.searchParams.get("daily").split(",").includes("precipitation_sum"),
  );
  assert(
    url.searchParams.get("daily").split(",").includes("wind_speed_10m_max"),
  );
});
