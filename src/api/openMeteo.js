const endpoint = "https://api.open-meteo.com/v1/forecast";
const weatherRequestTimeout = 12000;

export function buildForecastUrl(latitude, longitude) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError(
      "Latitude must be a finite number between -90 and 90.",
    );
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError(
      "Longitude must be a finite number between -180 and 180.",
    );
  }
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,is_day",
    hourly:
      "temperature_2m,precipitation_probability,relative_humidity_2m,weather_code,is_day",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max,precipitation_sum",
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "12",
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
    precipitation_unit: "mm",
  }).toString();
  return url;
}

/** Fetch provider data without coupling transport to React or normalization. */
export async function fetchWeather(latitude, longitude, { signal } = {}) {
  if (signal?.aborted) throw signal.reason;
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  let rejectAborted;
  const aborted = new Promise((_, reject) => {
    rejectAborted = reject;
  });
  const onAbort = () => rejectAborted(controller.signal.reason);
  controller.signal.addEventListener("abort", onAbort, { once: true });
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    controller.abort(
      new DOMException("Weather request timed out.", "TimeoutError"),
    );
  }, weatherRequestTimeout);
  try {
    // Bound the complete request, including body decoding, even if transport stalls.
    return await Promise.race([
      requestWeather(latitude, longitude, { signal: controller.signal }),
      aborted,
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
  }
}

async function requestWeather(latitude, longitude, { signal }) {
  const url = buildForecastUrl(latitude, longitude);
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (cause) {
    if (signal?.aborted || cause.name === "AbortError") throw cause;
    throw new Error("Unable to reach Open-Meteo.", { cause });
  }

  let data;
  try {
    data = await response.json();
  } catch (cause) {
    if (signal?.aborted || cause.name === "AbortError") throw cause;
    const error = new Error(
      `Open-Meteo returned invalid JSON (HTTP ${response.status}).`,
      { cause },
    );
    error.status = response.status;
    throw error;
  }
  if (!response.ok || data?.error === true) {
    const reason =
      typeof data?.reason === "string" ? data.reason : response.statusText;
    const error = new Error(
      `Open-Meteo request failed (HTTP ${response.status}): ${reason || "Unknown API error"}`,
    );
    error.status = response.status;
    error.reason = reason;
    throw error;
  }
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Number.isFinite(data.current?.time) ||
    !Array.isArray(data.hourly?.time) ||
    !Array.isArray(data.daily?.time) ||
    !data.daily.time.every(Number.isFinite) ||
    typeof data.timezone !== "string"
  ) {
    throw new TypeError("Open-Meteo returned a malformed forecast response.");
  }
  for (const section of ["hourly", "daily"]) {
    for (const [field, values] of Object.entries(data[section])) {
      if (field === "time") continue;
      // Entirely omitted optional fields are allowed; present columns must align.
      if (
        !Array.isArray(values) ||
        values.length !== data[section].time.length ||
        !values.every((value) => value === null || Number.isFinite(value))
      ) {
        throw new TypeError(
          `Open-Meteo returned a malformed ${section}.${field} column.`,
        );
      }
    }
  }
  return data;
}
