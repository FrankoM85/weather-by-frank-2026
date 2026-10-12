import test from "node:test";
import assert from "node:assert/strict";
import {
  localTimestamp,
  selectHourlyForecast,
} from "../src/utils/hourlyForecast.js";
import { mapWeatherData } from "../src/utils/weatherMapper.js";
import { buildForecastUrl } from "../src/api/openMeteo.js";
const seconds = (iso) => Date.parse(iso) / 1000;
const records = (start, count = 36) =>
  Array.from({ length: count }, (_, i) => ({
    epochSeconds: seconds(start) + i * 3600,
    temperature: 10 + i,
    weatherCode: 0,
    condition: "Sunny",
    conditionIcon: "sunny",
  }));
test("six absolute three-hour points across city-local midnight, independent of browser timezone", () => {
  const points = selectHourlyForecast(
    records("2026-10-11T18:00:00Z"),
    "Europe/Budapest",
    Date.parse("2026-10-11T18:25:00Z"),
  );
  assert.deepEqual(
    points.map((p) => p.time),
    ["21:00", "00:00", "03:00", "06:00", "09:00", "12:00"],
  );
  assert.equal(points[1].timestamp.slice(0, 10), "2026-10-12");
  points
    .slice(1)
    .forEach((p, i) =>
      assert.equal(p.epochSeconds - points[i].epochSeconds, 10800),
    );
});
test("exact boundary included; fractional offset cities start on local boundaries", () => {
  const points = selectHourlyForecast(
    records("2026-10-11T14:30:00Z"),
    "Asia/Kolkata",
    Date.parse("2026-10-11T15:30:00Z"),
  );
  assert.equal(points[0].time, "21:00");
  assert.equal(
    localTimestamp(seconds("2026-10-11T15:30:00Z"), "Asia/Kolkata"),
    "2026-10-11T21:00:00",
  );
});
test("DST spring and autumn transitions retain exact elapsed spacing and correct local labels", () => {
  for (const [start, expected] of [
    ["2026-03-28T23:00:00Z", ["00:00", "04:00", "07:00"]],
    ["2026-10-24T22:00:00Z", ["00:00", "02:00", "05:00"]],
  ]) {
    const points = selectHourlyForecast(
      records(start),
      "Europe/Budapest",
      Date.parse(start),
    );
    assert.deepEqual(
      points.slice(0, 3).map((p) => p.time),
      expected,
    );
    points
      .slice(1)
      .forEach((p, i) =>
        assert.equal(p.epochSeconds - points[i].epochSeconds, 10800),
      );
  }
});
test("missing, malformed and exhausted data yield only valid scheduled points", () => {
  const input = records("2026-10-11T19:00:00Z", 7);
  input[3].temperature = null;
  input[6].weatherCode = 999;
  input[6].condition = "Unknown Weather";
  input.push({ epochSeconds: null }, { epochSeconds: Infinity });
  assert.equal(
    selectHourlyForecast(
      input,
      "Europe/Budapest",
      Date.parse("2026-10-11T19:00:00Z"),
    ).length,
    1,
  );
  assert.deepEqual(selectHourlyForecast([], "Europe/Budapest"), []);
  assert.deepEqual(selectHourlyForecast(input, "Invalid/Zone"), []);
  assert.deepEqual(
    selectHourlyForecast(input, "Europe/Budapest", Date.parse("2027-01-01")),
    [],
  );
});
test("UNIX mapper preserves compact fields, local dates and existing day/night icons", () => {
  const time = seconds("2026-10-11T19:00:00Z");
  const mapped = mapWeatherData({
    timezone: "Europe/Budapest",
    utc_offset_seconds: 7200,
    current: {
      time,
      temperature_2m: 14,
      weather_code: 0,
      is_day: 0,
      relative_humidity_2m: 69,
      wind_speed_10m: 8.6,
    },
    hourly: {
      time: [time, time + 43200],
      temperature_2m: [14, 20],
      weather_code: [0, 0],
      is_day: [0, 1],
      precipitation_probability: [0, 5],
    },
    daily: {
      time: [seconds("2026-10-10T22:00:00Z")],
      weather_code: [0],
      temperature_2m_max: [20],
      temperature_2m_min: [10],
      sunrise: [seconds("2026-10-11T05:00:00Z")],
      sunset: [seconds("2026-10-11T16:00:00Z")],
    },
  });
  assert.equal(mapped.time, "21:00");
  assert.equal(mapped.day, "Sunday");
  assert.equal(mapped.details[0].label, "Rain");
  assert.equal(mapped.details[0].value, "0%");
  assert.equal(mapped.forecast[0].date, "2026-10-11");
  assert.equal(mapped.forecast[0].day, "Today");
  assert.equal(mapped.forecast[0].sunrise, "2026-10-11T07:00:00");
  assert.equal(mapped.hourly[0].conditionIcon, "cloudy");
  assert.equal(mapped.hourly[1].conditionIcon, "sunny");
  const url = buildForecastUrl(47, 19);
  assert.equal(url.searchParams.get("timeformat"), "unixtime");
  assert(url.searchParams.get("hourly").split(",").includes("is_day"));
});
