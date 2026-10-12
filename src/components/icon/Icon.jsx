import "./icon.css";

export default function Icon({ name, className = "" }) {
  return (
    <svg
      className={`interface-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "sun" && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      )}
      {name === "moon" && (
        <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
      )}
      {name === "search" && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4 4" />
        </>
      )}
      {name === "locate" && (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
        </>
      )}
      {name === "pin" && (
        <>
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2.3" />
        </>
      )}
      {name === "drop" && (
        <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" />
      )}
      {name === "wind" && (
        <>
          <path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 0-3-3M4 16h9a3 3 0 1 1-3 3" />
        </>
      )}
    </svg>
  );
}
