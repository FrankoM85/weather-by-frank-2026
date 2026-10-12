const endpoint = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const textOrNull = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/** Only call with fresh, consented browser coordinates; never forward-search results.
 * https://github.com/bigdatacloudapi/js-reverse-geocode-client#fair-use-policy
 */
export async function reverseGeocode(latitude, longitude, { signal } = {}) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "en",
  });
  const response = await fetch(url, {
    signal: AbortSignal.any([
      ...(signal ? [signal] : []),
      AbortSignal.timeout(8000),
    ]),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("Location name lookup failed.");
  const data = await response.json();
  const city = textOrNull(data?.city) || textOrNull(data?.locality);
  if (!city) throw new Error("No locality name available.");
  return {
    city,
    country: textOrNull(data.countryName),
    countryCode: textOrNull(data.countryCode),
    region: textOrNull(data.principalSubdivision),
  };
}
