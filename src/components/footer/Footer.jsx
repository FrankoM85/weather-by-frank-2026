import "./footer.css";

export default function Footer() {
  return (
    <footer className="app-footer">
      Weather data by{" "}
      <a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open-Meteo
      </a>
    </footer>
  );
}
