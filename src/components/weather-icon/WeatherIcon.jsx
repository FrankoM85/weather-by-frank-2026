import "./weatherIcon.css";

export default function WeatherIcon({ condition = "cloudy", className = "" }) {
  const sunny = condition === "sunny";
  const sunVisible = sunny || condition === "partly-cloudy";
  return (
    <svg
      className={`weather-icon weather-icon--${condition} ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {sunVisible && (
        <g className="weather-sun">
          <path
            d="M42 5v4m0 32v4M22 25h4m32 0h4M28 11l3 3m22 22 3 3M28 39l3-3m22-22 3-3"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="42" cy="25" r="12" fill="currentColor" />
        </g>
      )}
      {!sunny && (
        <>
          <path
            className="cloud-back"
            d="M19 42a10 10 0 0 1-1-20 13 13 0 0 1 25-1 10.5 10.5 0 0 1 3 21H19Z"
          />
          <path
            className="cloud-front"
            d="M15 47a9 9 0 0 1 0-18 12 12 0 0 1 22 0 9 9 0 1 1 9 18H15Z"
          />
        </>
      )}
      {condition === "rainy" && (
        <path
          d="m20 52-2 5m12-5-2 5m12-5-2 5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="weather-rain"
        />
      )}
      {condition === "stormy" && (
        <path
          d="m33 41-9 13h8l-3 9 13-16h-9l4-6Z"
          fill="currentColor"
          className="weather-sun"
        />
      )}
    </svg>
  );
}
