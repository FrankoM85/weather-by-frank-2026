import test from "node:test";
import assert from "node:assert/strict";
import { mapWeatherData } from "../src/utils/weatherMapper.js";

const seconds = (iso) => Date.parse(iso) / 1000;

function weatherAt(instant, start) {
  const time = seconds(start);
  return mapWeatherData({
    timezone: "Europe/Budapest",
    current: { time: seconds(instant) },
    hourly: {
      time: [time, time + 3600, time + 7200],
      precipitation_probability: [10, 80, 30],
    },
  });
}

test("Rain distinguishes both Budapest 02:30 occurrences on October 25, 2026", () => {
  const first = weatherAt("2026-10-25T00:30:00Z", "2026-10-25T00:00:00Z");
  const second = weatherAt("2026-10-25T01:30:00Z", "2026-10-25T00:00:00Z");
  assert.equal(first.time, "02:30");
  assert.equal(second.time, "02:30");
  assert.equal(first.details[0].value, "10%");
  assert.deepEqual(second.details[0], {
    label: "Rain",
    value: "80%",
    icon: "rainy",
  });
});

test("Rain selects ordinary intervals, exact boundaries and local midnight", () => {
  for (const instant of ["2026-10-11T22:00:00Z", "2026-10-11T22:30:00Z"]) {
    const mapped = weatherAt(instant, "2026-10-11T21:00:00Z");
    assert.equal(mapped.precipitationProbability, 80);
    assert.equal(mapped.timestamp.slice(0, 10), "2026-10-12");
  }
});

test("Rain does not substitute an hour outside the available intervals", () => {
  assert.equal(
    weatherAt("2026-10-12T01:00:00Z", "2026-10-11T21:00:00Z")
      .precipitationProbability,
    null,
  );
});
