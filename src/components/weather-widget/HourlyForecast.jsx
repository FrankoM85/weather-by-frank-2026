import { useEffect, useState } from "react";
import WeatherIcon from "../weather-icon/WeatherIcon.jsx";
import { selectHourlyForecast } from "../../utils/hourlyForecast.js";

export default function HourlyForecast({ hourly, timezone, expanded }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!expanded) return;
    let timer;
    function tick() {
      window.clearTimeout(timer);
      setNow(Date.now());
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000));
    }
    function resume() {
      if (document.visibilityState === "visible") tick();
    }
    tick();
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [expanded, timezone]);
  const points = selectHourlyForecast(hourly, timezone, now);
  return (
    <section
      className="hourly-section"
      aria-label="Hourly forecast"
      aria-hidden={!expanded}
    >
      <h2>Hourly Forecast</h2>
      {points.length ? (
        <ol
          className="hourly-strip"
          style={{ "--hourly-count": points.length }}
        >
          {points.map((point) => (
            <li className="hourly-slot" key={point.epochSeconds}>
              <time
                dateTime={new Date(point.epochSeconds * 1000).toISOString()}
                title={point.timestamp.replace("T", " ")}
              >
                {point.time}
              </time>
              <WeatherIcon condition={point.conditionIcon} />
              <span className="sr-only">{point.condition}. </span>
              <span className="hourly-temperature">
                {Math.round(point.temperature)}°C
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="hourly-unavailable">Hourly forecast unavailable.</p>
      )}
    </section>
  );
}
