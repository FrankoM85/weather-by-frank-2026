export const defaultLocation = {
  latitude: 47.4979,
  longitude: 19.0402,
  city: "Budapest",
  country: "Hungary",
};

export const selectedCityStorageKey = "weather-by-frank:selected-city:v1";

function storedCity(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.source === "device" ||
    typeof value.city !== "string" ||
    !value.city.trim() ||
    typeof value.country !== "string" ||
    !value.country.trim() ||
    !Number.isFinite(value.latitude) ||
    Math.abs(value.latitude) > 90 ||
    !Number.isFinite(value.longitude) ||
    Math.abs(value.longitude) > 180 ||
    (value.id != null && (!Number.isSafeInteger(value.id) || value.id <= 0))
  )
    return null;
  for (const field of ["region", "timezone"]) {
    if (
      value[field] != null &&
      (typeof value[field] !== "string" || !value[field].trim())
    )
      return null;
  }
  if (value.timezone != null) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value.timezone });
    } catch {
      return null;
    }
  }
  return {
    ...(value.id != null ? { id: value.id } : {}),
    city: value.city.trim(),
    country: value.country.trim(),
    ...(value.region != null ? { region: value.region.trim() } : {}),
    latitude: value.latitude,
    longitude: value.longitude,
    ...(value.timezone != null ? { timezone: value.timezone } : {}),
  };
}

export function readSelectedCity() {
  try {
    return storedCity(JSON.parse(localStorage.getItem(selectedCityStorageKey)));
  } catch {
    return null;
  }
}

export function saveSelectedCity(location) {
  // Only explicit suggestion selections may be persisted, never device locations.
  if (location.source !== "manual") return;
  const city = storedCity(location);
  if (!city) return;
  try {
    localStorage.setItem(selectedCityStorageKey, JSON.stringify(city));
  } catch {
    /* Weather still works when storage is blocked or full. */
  }
}
