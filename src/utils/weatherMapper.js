import { getWeatherCondition } from "./weatherCodes.js";
import { localTimestamp } from "./hourlyForecast.js";

const numberOrNull = (value) => (Number.isFinite(value) ? value : null);
const stringOrNull = (value) => (typeof value === "string" ? value : null);
const valuesAt = (section, key, index) =>
  Array.isArray(section?.[key]) ? section[key][index] : null;

function weekday(date, short = false) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    weekday: short ? "short" : "long",
    timeZone: "UTC",
  }).format(parsed);
}

function daylight(time, daily) {
  const index = daily?.time?.indexOf(time.slice(0, 10)) ?? -1;
  const sunrise = valuesAt(daily, "sunrise", index);
  const sunset = valuesAt(daily, "sunset", index);
  if (typeof sunrise !== "string" || typeof sunset !== "string") return null;
  return time >= sunrise && time < sunset;
}

/**
 * Normalize the Celsius/kmh/mm response requested by fetchWeather.
 * Absolute provider timestamps become location-local ISO strings for existing views.
 * Top-level current fields and forecast day/condition/high/low follow the widget model.
 */
export function mapWeatherData(data, { location = "" } = {}) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    data.error === true
  ) {
    throw new TypeError("Expected an Open-Meteo forecast response.");
  }
  const current = data.current ?? {};
  const timestamp = localTimestamp(current.time, data.timezone);
  const isDay =
    current.is_day === 1 ? true : current.is_day === 0 ? false : null;
  const condition = getWeatherCondition(current.weather_code, isDay);
  const rawHourlyTimes = Array.isArray(data.hourly?.time)
    ? data.hourly.time
    : [];
  const hourlyTimes = rawHourlyTimes.map((time) =>
    localTimestamp(time, data.timezone),
  );
  // Provider UNIX timestamps distinguish repeated local hours at DST rollover.
  const hourIndex = Number.isFinite(current.time)
    ? rawHourlyTimes.findIndex(
        (time) =>
          Number.isFinite(time) &&
          current.time >= time &&
          current.time < time + 3600,
      )
    : -1;
  const precipitationProbability = numberOrNull(
    valuesAt(data.hourly, "precipitation_probability", hourIndex),
  );
  const humidity = numberOrNull(current.relative_humidity_2m);
  const windSpeed = numberOrNull(current.wind_speed_10m);
  const dailyTimes = Array.isArray(data.daily?.time)
    ? data.daily.time.map((time) => {
        // Open-Meteo daily UNIX dates use the response's UTC offset, including across DST.
        if (!Number.isFinite(time)) return stringOrNull(time);
        const date = new Date(
          (time + (numberOrNull(data.utc_offset_seconds) ?? 0)) * 1000,
        );
        return Number.isFinite(date.getTime())
          ? date.toISOString().slice(0, 10)
          : null;
      })
    : [];
  const localDaily = {
    ...data.daily,
    time: dailyTimes,
    sunrise: data.daily?.sunrise?.map((time) =>
      localTimestamp(time, data.timezone),
    ),
    sunset: data.daily?.sunset?.map((time) =>
      localTimestamp(time, data.timezone),
    ),
  };

  return {
    temperature: numberOrNull(current.temperature_2m),
    apparentTemperature: numberOrNull(current.apparent_temperature),
    condition: condition.description,
    conditionIcon: condition.icon,
    weatherCode: numberOrNull(current.weather_code),
    timestamp,
    day: weekday(timestamp?.slice(0, 10)),
    time: timestamp?.slice(11, 16) ?? null,
    location,
    humidity,
    windSpeed,
    windDirection: numberOrNull(current.wind_direction_10m),
    precipitation: numberOrNull(current.precipitation),
    rain: numberOrNull(current.rain),
    cloudCover: numberOrNull(current.cloud_cover),
    isDay,
    precipitationProbability,
    details: [
      {
        label: "Rain",
        value:
          precipitationProbability === null
            ? "—"
            : `${precipitationProbability}%`,
        icon: "rainy",
      },
      {
        label: "Humidity",
        value: humidity === null ? "—" : `${humidity}%`,
        icon: "drop",
      },
      {
        label: "Wind",
        value: windSpeed === null ? "—" : `${windSpeed} km/h`,
        icon: "wind",
      },
    ],
    forecast: dailyTimes.map((date, index) => {
      const code = numberOrNull(valuesAt(data.daily, "weather_code", index));
      const weather = getWeatherCondition(code);
      return {
        date: stringOrNull(date),
        day: date === timestamp?.slice(0, 10) ? "Today" : weekday(date, true),
        condition: weather.icon,
        conditionIcon: weather.icon,
        description: weather.description,
        weatherCode: code,
        high: numberOrNull(valuesAt(data.daily, "temperature_2m_max", index)),
        low: numberOrNull(valuesAt(data.daily, "temperature_2m_min", index)),
        windSpeedMax: numberOrNull(
          valuesAt(data.daily, "wind_speed_10m_max", index),
        ),
        precipitationSum: numberOrNull(
          valuesAt(data.daily, "precipitation_sum", index),
        ),
        precipitationProbability: numberOrNull(
          valuesAt(data.daily, "precipitation_probability_max", index),
        ),
        sunrise: stringOrNull(valuesAt(localDaily, "sunrise", index)),
        sunset: stringOrNull(valuesAt(localDaily, "sunset", index)),
        uvIndex: numberOrNull(valuesAt(data.daily, "uv_index_max", index)),
      };
    }),
    hourly: hourlyTimes.map((time, index) => {
      const code = numberOrNull(valuesAt(data.hourly, "weather_code", index));
      const dayFlag = valuesAt(data.hourly, "is_day", index);
      const isDay =
        dayFlag === 1
          ? true
          : dayFlag === 0
            ? false
            : typeof time === "string"
              ? daylight(time, localDaily)
              : null;
      const weather = getWeatherCondition(code, isDay);
      return {
        timestamp: stringOrNull(time),
        epochSeconds: numberOrNull(rawHourlyTimes[index]),
        temperature: numberOrNull(
          valuesAt(data.hourly, "temperature_2m", index),
        ),
        precipitationProbability: numberOrNull(
          valuesAt(data.hourly, "precipitation_probability", index),
        ),
        humidity: numberOrNull(
          valuesAt(data.hourly, "relative_humidity_2m", index),
        ),
        condition: weather.description,
        conditionIcon: weather.icon,
        weatherCode: code,
        isDay,
      };
    }),
    metadata: {
      timezone: stringOrNull(data.timezone),
      timezoneAbbreviation: stringOrNull(data.timezone_abbreviation),
      utcOffsetSeconds: numberOrNull(data.utc_offset_seconds),
      latitude: numberOrNull(data.latitude),
      longitude: numberOrNull(data.longitude),
      elevation: numberOrNull(data.elevation),
      generationTimeMs: numberOrNull(data.generationtime_ms),
      currentIntervalSeconds: numberOrNull(current.interval),
      units: {
        temperature: "°C",
        windSpeed: "km/h",
        precipitation: "mm",
        probability: "%",
        humidity: "%",
        cloudCover: "%",
        windDirection: "°",
        uvIndex: "index",
      },
    },
  };
}
