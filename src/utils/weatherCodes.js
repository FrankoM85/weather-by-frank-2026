// Source: https://open-meteo.com/en/docs#weathervariables
const conditions = {
  // Clear & Cloudy
  0: ["Sunny", "sunny", "Clear Night"],
  1: ["Mostly Sunny", "partly-cloudy", "Mostly Clear"],
  2: ["Partly Cloudy", "partly-cloudy"],
  3: ["Cloudy", "cloudy"],

  // Fog
  45: ["Foggy", "cloudy"],
  48: ["Freezing Fog", "cloudy"],

  // Drizzle
  51: ["Light Drizzle", "rainy"],
  53: ["Drizzle", "rainy"],
  55: ["Heavy Drizzle", "rainy"],
  56: ["Light Freezing Drizzle", "rainy"],
  57: ["Freezing Drizzle", "rainy"],

  // Rain
  61: ["Light Rain", "rainy"],
  63: ["Rainy", "rainy"],
  65: ["Heavy Rain", "rainy"],
  66: ["Light Freezing Rain", "rainy"],
  67: ["Heavy Freezing Rain", "rainy"],

  // Snow
  71: ["Light Snow", "cloudy"],
  73: ["Snowy", "cloudy"],
  75: ["Heavy Snow", "cloudy"],
  77: ["Snow Grains", "cloudy"],

  // Showers
  80: ["Light Showers", "rainy"],
  81: ["Rain Showers", "rainy"],
  82: ["Heavy Showers", "rainy"],
  85: ["Light Snow Showers", "cloudy"],
  86: ["Heavy Snow Showers", "cloudy"],

  // Thunderstorms
  95: ["Thunderstorm", "stormy"],
  96: ["Thunderstorm with Hail", "stormy"],
  97: ["Heavy Thunderstorm", "stormy"],
  99: ["Severe Thunderstorm with Hail", "stormy"],
};

/** Return a fresh description/icon pair; unknown codes always have a safe fallback. */
export function getWeatherCondition(code, isDay = true) {
  const entry = Number.isInteger(code) ? conditions[code] : undefined;
  if (!entry) return { description: "Unknown Weather", icon: "cloudy" };
  const [description, icon, nightDescription] = entry;
  const night = isDay === false || isDay === 0;
  // WeatherIcon has no moon, fog or snow assets. Cloud icons also avoid sun at night.
  return {
    description: night && nightDescription ? nightDescription : description,
    icon:
      night && (icon === "sunny" || icon === "partly-cloudy") ? "cloudy" : icon,
  };
}
