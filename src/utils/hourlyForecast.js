// Keep only the most recently used timezone formatter for forecast batches.
let timestampFormatter;
let formatterTimezone;

/** Format absolute provider timestamps without using the browser's timezone. */
export function localTimestamp(seconds, timezone) {
  if (typeof seconds === "string") return seconds; // Legacy local ISO mapper inputs.
  if (!Number.isFinite(seconds) || !timezone) return null;
  try {
    if (!timestampFormatter || formatterTimezone !== timezone) {
      timestampFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
      formatterTimezone = timezone;
    }
    const parts = timestampFormatter.formatToParts(seconds * 1000);
    const part = (type) => parts.find((value) => value.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
  } catch {
    return null;
  }
}

/** Start on a city-local three-hour boundary, then advance in absolute time. */
export function selectHourlyForecast(hourly, timezone, now = Date.now()) {
  if (!timezone || !Array.isArray(hourly) || !Number.isFinite(now)) return [];
  const records = hourly
    .filter((record) => Number.isFinite(record?.epochSeconds))
    .sort((a, b) => a.epochSeconds - b.epochSeconds);
  const first = records.find((record) => {
    if (record.epochSeconds * 1000 < now) return false;
    const time = localTimestamp(record.epochSeconds, timezone);
    return (
      time &&
      Number(time.slice(11, 13)) % 3 === 0 &&
      time.slice(14, 19) === "00:00"
    );
  });
  if (!first) return [];
  const points = [];
  for (let slot = 0; slot < 6; slot++) {
    const epochSeconds = first.epochSeconds + slot * 3 * 60 * 60;
    const record = records.find(
      (value) =>
        value.epochSeconds === epochSeconds &&
        Number.isFinite(value.temperature) &&
        Number.isInteger(value.weatherCode) &&
        value.condition !== "Unknown Weather",
    );
    const timestamp = localTimestamp(epochSeconds, timezone);
    if (record && timestamp)
      points.push({ ...record, timestamp, time: timestamp.slice(11, 16) });
  }
  return points;
}
