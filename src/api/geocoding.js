const endpoint = "https://geocoding-api.open-meteo.com/v1/search";
const searchRequestTimeout = 8000;
const textOrNull = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

// Inhabited-place codes from https://www.geonames.org/export/codes.html.
// An explicit allowlist excludes historical/abandoned places and unknown codes.
const settlementCodes = new Set([
  "PPL",
  "PPLA",
  "PPLA2",
  "PPLA3",
  "PPLA4",
  "PPLA5",
  "PPLC",
  "PPLCD",
  "PPLF",
  "PPLG",
  "PPLL",
  "PPLR",
  "PPLS",
  "PPLX",
  "STLMT",
]);

function normalizeLocation(location) {
  if (
    !location ||
    typeof location !== "object" ||
    Array.isArray(location) ||
    !Number.isSafeInteger(location.id) ||
    location.id <= 0 ||
    !textOrNull(location.name) ||
    !Number.isFinite(location.latitude) ||
    Math.abs(location.latitude) > 90 ||
    !Number.isFinite(location.longitude) ||
    Math.abs(location.longitude) > 180
  ) {
    return null;
  }
  return {
    id: location.id,
    city: location.name.trim(),
    region: textOrNull(location.admin1),
    country: textOrNull(location.country),
    countryCode: textOrNull(location.country_code),
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: textOrNull(location.timezone),
    featureCode: textOrNull(location.feature_code),
  };
}

/** Search English locations; optional provider details remain null when unavailable. */
export async function searchCities(query, { signal } = {}) {
  if (typeof query !== "string")
    throw new TypeError("City query must be a string.");
  const name = query.trim().replace(/\s+/gu, " ");
  if (Array.from(name.replace(/\s/gu, "")).length < 2) return [];

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
      new DOMException("City search timed out.", "TimeoutError"),
    );
  }, searchRequestTimeout);
  try {
    // Bound fetch and body decoding even if transport ignores cancellation.
    return await Promise.race([
      requestCities(name, { signal: controller.signal }),
      aborted,
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
  }
}

async function requestCities(name, { signal }) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    name,
    count: "50",
    language: "en",
    format: "json",
  }).toString();
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (cause) {
    if (signal?.aborted || cause?.name === "AbortError") throw cause;
    throw new Error("Unable to reach Open-Meteo geocoding.", { cause });
  }

  let data;
  try {
    data = await response.json();
  } catch (cause) {
    if (signal?.aborted || cause?.name === "AbortError") throw cause;
    const error = new Error(
      `Open-Meteo geocoding returned invalid JSON (HTTP ${response.status}).`,
      { cause },
    );
    error.status = response.status;
    throw error;
  }
  if (!response.ok || data?.error === true) {
    const reason =
      typeof data?.reason === "string" ? data.reason : response.statusText;
    const error = new Error(
      `City search failed (HTTP ${response.status}): ${reason || "Unknown API error"}`,
    );
    error.status = response.status;
    error.reason = reason;
    throw error;
  }
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    (data.results != null && !Array.isArray(data.results))
  ) {
    throw new TypeError("Open-Meteo geocoding returned a malformed response.");
  }
  const locations = (data.results ?? [])
    .map(normalizeLocation)
    .filter(
      (location) =>
        location !== null && settlementCodes.has(location.featureCode),
    );
  const seenIds = new Set();
  return locations
    .filter((location) => {
      // Different IDs may identify separate features even with identical display names.
      if (!Number.isSafeInteger(location.id) || location.id <= 0) return true;
      if (seenIds.has(location.id)) return false;
      seenIds.add(location.id);
      return true;
    })
    .slice(0, 10);
}
