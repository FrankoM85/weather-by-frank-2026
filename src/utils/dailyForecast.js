export function validForecastDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

export function selectDailyForecast(forecast, currentDate, count = 12) {
  const seen = new Set();
  return forecast
    .filter((day) => {
      if (
        !validForecastDate(day.date) ||
        (currentDate && day.date < currentDate) ||
        seen.has(day.date)
      )
        return false;
      seen.add(day.date);
      return true;
    })
    .slice(0, count);
}

/** One scale for both extrema; missing values never become zero temperatures. */
export function temperatureScale(days) {
  const values = days
    .flatMap((day) => [day.high, day.low])
    .filter(Number.isFinite);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 0;
  return (value) => {
    if (!Number.isFinite(value)) return null;
    if (minimum === maximum) return 0.5;
    // Divide first to avoid overflow for extreme finite inputs.
    const extent = Math.max(Math.abs(minimum), Math.abs(maximum), 1);
    return Math.max(
      0,
      Math.min(
        1,
        (value / extent - minimum / extent) /
          (maximum / extent - minimum / extent),
      ),
    );
  };
}

export function formatDailyValue(value, unit) {
  return Number.isFinite(value)
    ? `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value)} ${unit}`
    : "—";
}
