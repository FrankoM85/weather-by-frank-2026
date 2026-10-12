import Icon from "../icon/Icon.jsx";
import "./themeSwitch.css";

export default function ThemeSwitch({ theme, onToggle }) {
  return (
    <button
      className="theme-switch"
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Dark theme"
      onClick={onToggle}
    >
      <Icon name="sun" className="theme-sun" />
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
      <Icon name="moon" className="theme-moon" />
    </button>
  );
}
