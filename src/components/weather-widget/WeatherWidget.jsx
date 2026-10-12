import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../icon/Icon.jsx";
import WeatherIcon from "../weather-icon/WeatherIcon.jsx";
import HourlyForecast from "./HourlyForecast.jsx";
import DetailedForecast from "./DetailedForecast.jsx";
import { selectDailyForecast } from "../../utils/dailyForecast.js";
import "./weatherWidget.css";

function formatTemperature(value, unit = "°") {
  return Number.isFinite(value) ? `${Math.round(value)}${unit}` : "—";
}

function LocationClock({ timezone, onDateChange }) {
  const [now, setNow] = useState(() => Date.now());
  const formatter = useMemo(() => {
    if (!timezone) return null;
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return null;
    }
  }, [timezone]);

  useEffect(() => {
    if (!formatter) return;
    let timer;
    function tick() {
      const now = Date.now();
      setNow(now);
      const parts = formatter.formatToParts(now);
      const part = (type) => parts.find((value) => value.type === type).value;
      onDateChange(`${part("year")}-${part("month")}-${part("day")}`, timezone);
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000));
    }
    tick();
    // Catch up immediately when a suspended/background tab becomes visible.
    function resume() {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        tick();
      }
    }
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [formatter, onDateChange, timezone]);

  const parts = formatter?.formatToParts(now);
  const part = (type) => parts?.find((value) => value.type === type)?.value;
  return (
    <div className="day-time">
      <span>{part("weekday") ?? "—"}</span>
      <time dateTime={formatter ? new Date(now).toISOString() : undefined}>
        {formatter ? (
          <>
            {part("hour")}
            <span className="clock-colon">:</span>
            {part("minute")}
          </>
        ) : (
          "—"
        )}
      </time>
    </div>
  );
}

function WeatherDetails({ details }) {
  return (
    <dl className="weather-details" aria-label="Current weather details">
      {details.map(({ label, value, icon }) => (
        <div className="detail" key={label}>
          {icon === "rainy" ? (
            <WeatherIcon condition="rainy" />
          ) : (
            <Icon name={icon} />
          )}
          <div>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function Forecast({ forecast, currentDate, expanded }) {
  // ISO dates are location-local; reuse future entries as the clock rolls over.
  // Keep the original seven empty loading entries until any real dates arrive.
  const rollingForecast = forecast.some((day) => day.date)
    ? selectDailyForecast(forecast, currentDate, 7)
    : forecast.slice(0, 7);
  function dayLabel(date, day) {
    if (!date || !currentDate) return day ?? "—";
    if (date === currentDate) return "Today";
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
  }
  return (
    <section aria-label="Forecast" className="forecast-section">
      <ol className="forecast" aria-hidden={expanded}>
        {rollingForecast.map(
          ({ date, day, condition, description, high, low }, index) => {
            const label = dayLabel(date, day);
            return (
              <li
                className={`forecast-card ${label === "Today" ? "forecast-card--today" : ""}`}
                key={date ?? index}
                aria-current={label === "Today" ? "date" : undefined}
              >
                <span className="forecast-day">{label}</span>
                <WeatherIcon condition={condition} />
                <span className="sr-only">
                  {description ?? condition.replace("-", " ")}. High{" "}
                </span>
                <span className="forecast-high">{formatTemperature(high)}</span>
                <span className="sr-only"> Celsius. Low </span>
                <span className="forecast-low">{formatTemperature(low)}</span>
                <span className="sr-only"> Celsius.</span>
              </li>
            );
          },
        )}
      </ol>
      <DetailedForecast
        forecast={forecast}
        currentDate={currentDate}
        expanded={expanded}
      />
    </section>
  );
}

export default function WeatherWidget({
  weather,
  status = "success",
  hasWeather = status === "success",
  requestedLocation = weather.location,
  statusMessage,
  onRetry,
}) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(
    () =>
      window.matchMedia("(min-width: 641px) and (min-height: 741px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 641px) and (min-height: 741px)",
    );
    function update() {
      setCanExpand(media.matches);
      if (!media.matches) setExpanded(false);
    }
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [currentDate, setCurrentDate] = useState(null);
  const updateDate = useCallback((date, timezone) => {
    setCurrentDate((previous) =>
      previous?.date === date && previous.timezone === timezone
        ? previous
        : { date, timezone },
    );
  }, []);
  const pending = status !== "success" && !hasWeather;
  const updating = status !== "success" && hasWeather;
  const updateMessage =
    statusMessage ??
    (status === "error"
      ? `Unable to load ${requestedLocation}.`
      : `Loading ${requestedLocation}…`);

  function toggleFromClick(event) {
    if (
      !canExpand ||
      event.defaultPrevented ||
      window.getSelection()?.isCollapsed === false
    )
      return;
    // Leave nested controls (including Retry) to their own handlers.
    const control = event.target.closest(
      'button, a, input, select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="slider"], [role="textbox"], [tabindex], [contenteditable]:not([contenteditable="false"])',
    );
    if (control && control !== event.currentTarget) return;
    setExpanded((value) => !value);
  }

  return (
    <article
      className={`weather-widget${pending ? " weather-widget--pending" : ""}${expanded && canExpand ? " weather-widget--expanded" : ""}`}
      aria-label={`Weather in ${weather.location}`}
      aria-busy={status === "loading"}
      onClick={toggleFromClick}
    >
      {canExpand && (
        <button
          type="button"
          className="sr-only weather-toggle"
          aria-label={`${expanded ? "Collapse" : "Expand"} weather dashboard for ${weather.location}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        />
      )}
      <section className="current-weather" aria-label="Current weather">
        <div className="current-conditions">
          <div className="temperature-row">
            <WeatherIcon condition={weather.conditionIcon} />
            <span className="temperature">
              {formatTemperature(weather.temperature, "°C")}
            </span>
          </div>
          <span className="condition" title={weather.condition}>
            {weather.condition}
          </span>
        </div>
        <div className="current-place">
          <LocationClock
            timezone={weather.metadata?.timezone}
            onDateChange={updateDate}
          />
          <h1 className="location">
            <Icon name="pin" />
            <span title={weather.location}>{weather.location}</span>
          </h1>
        </div>
        {pending && (
          <div className="weather-status">
            <span role={status === "error" ? "alert" : "status"}>
              {statusMessage ??
                (status === "error"
                  ? "Unable to load weather."
                  : "Loading weather…")}
            </span>
            {status === "error" && onRetry && (
              <button type="button" className="weather-retry" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        )}
        {updating && (
          <div className="weather-update-status">
            <span
              role={status === "error" ? "alert" : "status"}
              title={updateMessage}
            >
              {updateMessage}
            </span>
            {status === "error" && onRetry && (
              <button
                type="button"
                className="weather-retry"
                aria-label={`Retry weather for ${requestedLocation}`}
                onClick={onRetry}
              >
                Retry
              </button>
            )}
          </div>
        )}
      </section>
      <WeatherDetails details={weather.details} />
      <HourlyForecast
        hourly={weather.hourly}
        timezone={weather.metadata?.timezone}
        expanded={expanded && canExpand}
      />
      <Forecast
        forecast={weather.forecast}
        currentDate={
          currentDate?.timezone === weather.metadata?.timezone
            ? currentDate?.date
            : null
        }
        expanded={expanded && canExpand}
      />
    </article>
  );
}
