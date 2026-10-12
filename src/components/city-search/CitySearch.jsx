import { useEffect, useId, useRef, useState } from "react";
import { searchCities } from "../../api/geocoding.js";
import Icon from "../icon/Icon.jsx";
import "./citySearch.css";

const locationContext = (location) =>
  [location.region, location.country].filter(Boolean).join(", ");
const emptyResults = [];

export default function CitySearch({
  onSelect,
  onUseLocation,
  locationBusy,
  detectedLocation,
  initialLocation,
}) {
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState(initialLocation?.city ?? "");
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation ?? null,
  );
  const [search, setSearch] = useState({
    term: "",
    status: "idle",
    results: [],
  });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [composing, setComposing] = useState(false);
  const [lastDetectedLocation, setLastDetectedLocation] =
    useState(detectedLocation);
  const term = query.trim().replace(/\s+/gu, " ");
  const validQuery = Array.from(term.replace(/\s/gu, "")).length >= 2;
  const expanded = open && validQuery && !selectedLocation && !composing;
  const results = search.term === term ? search.results : emptyResults;
  const status = search.term === term ? search.status : "loading";

  // Synchronize an externally completed selection before rendering its input.
  if (detectedLocation !== lastDetectedLocation) {
    setLastDetectedLocation(detectedLocation);
    if (detectedLocation) {
      setSelectedLocation(detectedLocation);
      setQuery(detectedLocation.city);
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  useEffect(() => {
    if (!validQuery || selectedLocation || composing) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchCities(term, { signal: controller.signal });
        if (!controller.signal.aborted)
          setSearch({ term, status: "success", results });
      } catch {
        if (!controller.signal.aborted)
          setSearch({ term, status: "error", results: [] });
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, validQuery, selectedLocation, composing]);

  useEffect(() => {
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => {
    if (expanded && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex, expanded, results]);

  function changeQuery(event) {
    const value = event.target.value;
    const nextTerm = value.trim().replace(/\s+/gu, " ");
    setQuery(value);
    setSelectedLocation(null);
    if (nextTerm !== term || selectedLocation) {
      setSearch({ term: nextTerm, status: "loading", results: [] });
    }
    setActiveIndex(-1);
    setOpen(true);
  }

  function selectLocation(location) {
    setSelectedLocation(location);
    setQuery(location.city);
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(location);
  }

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing || composing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    } else if (
      (event.key === "ArrowDown" || event.key === "ArrowUp") &&
      results.length &&
      !selectedLocation
    ) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => {
        if (!expanded || index < 0)
          return event.key === "ArrowDown" ? 0 : results.length - 1;
        return (
          (index + (event.key === "ArrowDown" ? 1 : -1) + results.length) %
          results.length
        );
      });
    } else if (
      event.key === "Enter" &&
      expanded &&
      activeIndex >= 0 &&
      results[activeIndex]
    ) {
      event.preventDefault();
      selectLocation(results[activeIndex]);
    }
  }

  const message =
    status === "error"
      ? "Unable to search cities. Please try again."
      : status === "loading"
        ? "Searching…"
        : results.length === 0
          ? "No cities found"
          : "";
  const feedback = selectedLocation
    ? `${selectedLocation.city} selected.`
    : expanded
      ? message ||
        `${results.length} city suggestions available. Use the arrow keys to explore.`
      : "";

  return (
    <form
      ref={rootRef}
      className="city-search"
      role="search"
      aria-label="City search"
      onSubmit={(event) => event.preventDefault()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <button
        className="city-search-location"
        type="button"
        title="Use my location"
        aria-label="Use my location"
        aria-busy={locationBusy || undefined}
        aria-disabled={locationBusy || undefined}
        onClick={onUseLocation}
      >
        <Icon name="locate" />
      </button>
      <span className="city-search-decoration" aria-hidden="true">
        <Icon name="search" />
      </span>
      <label className="sr-only" htmlFor={inputId}>
        Search city
      </label>
      <input
        id={inputId}
        name="city"
        type="search"
        placeholder="Search city"
        autoComplete="off"
        value={query}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded && results[activeIndex]
            ? `${listId}-option-${activeIndex}`
            : undefined
        }
        onChange={changeQuery}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
      />
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback}
      </span>
      {expanded && (
        <div className="city-search-dropdown">
          {message && (
            <div className="city-search-message" aria-hidden="true">
              {message}
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            className="city-search-results"
            role="listbox"
            tabIndex={-1}
            aria-label="City suggestions"
            aria-busy={status === "loading"}
          >
            {results.map((location, index) => {
              const context = locationContext(location);
              return (
                <li
                  key={location.id}
                  id={`${listId}-option-${index}`}
                  className={`city-search-option${index === activeIndex ? " city-search-option--active" : ""}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => selectLocation(location)}
                >
                  <span className="city-search-name">{location.city}</span>
                  {context && (
                    <span className="city-search-context">{context}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </form>
  );
}
