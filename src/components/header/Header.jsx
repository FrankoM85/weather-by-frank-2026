import darkLogo from "../../assets/weather-logo-dark.svg";
import lightLogo from "../../assets/weather-logo-light.svg";
import ThemeSwitch from "../theme-switch/ThemeSwitch.jsx";
import CitySearch from "../city-search/CitySearch.jsx";
import "./header.css";

export default function Header({
  theme,
  onToggleTheme,
  onSelect,
  onUseLocation,
  locationBusy,
  detectedLocation,
  initialLocation,
}) {
  return (
    <header className="app-header">
      <img
        className="header-logo"
        src={theme === "dark" ? darkLogo : lightLogo}
        alt="WEATHER by Frank"
        width="790"
        height="128"
      />
      <CitySearch
        onSelect={onSelect}
        onUseLocation={onUseLocation}
        locationBusy={locationBusy}
        detectedLocation={detectedLocation}
        initialLocation={initialLocation}
      />
      <div className="header-theme">
        <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
