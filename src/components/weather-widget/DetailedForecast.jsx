import Icon from "../icon/Icon.jsx";
import WeatherIcon from "../weather-icon/WeatherIcon.jsx";
import {
  formatDailyValue,
  selectDailyForecast,
  temperatureScale,
} from "../../utils/dailyForecast.js";

export default function DetailedForecast({ forecast, currentDate, expanded }) {
  const days = selectDailyForecast(forecast, currentDate);
  const scale = temperatureScale(days);
  const weekday = new Intl.DateTimeFormat("en", {
    weekday: "short",
    timeZone: "UTC",
  });
  return (
    <div className="detailed-forecast" aria-hidden={!expanded}>
      {days.length ? (
        <ol className="detailed-days">
          {days.map((day) => (
            <li
              className={`detailed-day${day.date === currentDate ? " detailed-day--today" : ""}`}
              key={day.date}
              aria-current={day.date === currentDate ? "date" : undefined}
            >
              <time className="detailed-date" dateTime={day.date}>
                <span className="sr-only">{day.date.slice(0, 8)}</span>
                {Number(day.date.slice(8))}
              </time>
              <span className="detailed-weekday">
                {weekday.format(new Date(`${day.date}T00:00:00Z`))}
              </span>
              <WeatherIcon condition={day.conditionIcon} />
              <span className="sr-only">{day.description}. </span>
              <div className="daily-temperatures">
                {[
                  ["high", "Maximum"],
                  ["low", "Minimum"],
                ].map(([field, label]) => (
                  <div className="daily-temperature-track" key={field}>
                    <div
                      className={`daily-temperature-bar daily-temperature-bar--${field}${scale(day[field]) === null ? " daily-temperature-bar--missing" : ""}`}
                      style={{
                        "--temperature-fraction": scale(day[field]) ?? 0,
                      }}
                    >
                      <span className="sr-only">{label} temperature </span>
                      <span>
                        {Number.isFinite(day[field])
                          ? `${Math.round(day[field])}°`
                          : "—"}
                      </span>
                      <span className="sr-only"> Celsius.</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="daily-wind">
                <Icon name="wind" />
                <span className="sr-only">Maximum wind </span>
                <span>{formatDailyValue(day.windSpeedMax, "km/h")}</span>
              </div>
              <div className="daily-precipitation">
                <Icon name="drop" />
                <span className="sr-only">Precipitation </span>
                <span>{formatDailyValue(day.precipitationSum, "mm")}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="daily-unavailable">Daily forecast unavailable.</p>
      )}
    </div>
  );
}
