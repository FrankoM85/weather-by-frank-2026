import { useEffect, useRef, useState } from "react";
import Header from "./components/header/Header.jsx";
import Footer from "./components/footer/Footer.jsx";
import WeatherWidget from "./components/weather-widget/WeatherWidget.jsx";
import {
  defaultLocation,
  readSelectedCity,
  saveSelectedCity,
} from "./data/location.js";
import { fetchWeather } from "./api/openMeteo.js";
import { reverseGeocode } from "./api/reverseGeocoding.js";
import { mapWeatherData } from "./utils/weatherMapper.js";
import "./app.css";

const locationLabel = (location) =>
  [location.city, location.country].filter(Boolean).join(", ");
const freshnessInterval = 30 * 60 * 1000;

function sameLocation(first, second) {
  return (
    first.latitude === second.latitude &&
    first.longitude === second.longitude &&
    (first.id == null || second.id == null || first.id === second.id)
  );
}

const emptyWeather = {
  ...mapWeatherData({}, { location: locationLabel(defaultLocation) }),
  forecast: Array.from({ length: 7 }, () => ({
    day: null,
    condition: "cloudy",
    description: "Weather unavailable",
    high: null,
    low: null,
  })),
};

function initialTheme() {
  try {
    const saved = localStorage.getItem("weather-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [initialLocation] = useState(() => {
    const saved = readSelectedCity();
    return saved ? { ...saved, source: "restored" } : defaultLocation;
  });
  const [activeLocation, setActiveLocation] = useState(initialLocation);
  const [weatherState, setWeatherState] = useState({
    status: "loading",
    weather: null,
    displayedLocation: null,
  });
  const [request, setRequest] = useState(0);
  const controllerRef = useRef(null);
  const locationRequestRef = useRef(null);
  const refreshControllerRef = useRef(null);
  const lastFetchedRef = useRef(null);
  const lastRefreshAttemptRef = useRef(null);
  const [locationStatus, setLocationStatus] = useState(null);

  useEffect(() => () => locationRequestRef.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    async function loadWeather() {
      try {
        const response = await fetchWeather(
          activeLocation.latitude,
          activeLocation.longitude,
          {
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) return;
        const weather = mapWeatherData(response, {
          location: locationLabel(activeLocation),
        });
        saveSelectedCity(activeLocation);
        lastFetchedRef.current = Date.now();
        setWeatherState({
          status: "success",
          weather,
          displayedLocation: activeLocation,
        });
      } catch {
        if (!controller.signal.aborted)
          setWeatherState((previous) => ({ ...previous, status: "error" }));
      }
    }

    // StrictMode cleans up its first effect before this microtask starts a fetch.
    queueMicrotask(() => {
      if (!controller.signal.aborted) loadWeather();
    });
    return () => controller.abort();
  }, [activeLocation, request]);

  useEffect(() => {
    const location = weatherState.displayedLocation;
    // A failed or pending intentional switch must retain its existing Retry flow.
    if (
      !location ||
      activeLocation !== location ||
      weatherState.status !== "success" ||
      locationStatus?.status === "loading"
    )
      return;
    let timer;
    let disposed = false;
    let pending = false;

    function schedule() {
      window.clearTimeout(timer);
      if (disposed || pending || document.visibilityState !== "visible") return;
      const nextCheck =
        Math.max(lastFetchedRef.current, lastRefreshAttemptRef.current) +
        freshnessInterval;
      timer = window.setTimeout(
        checkFreshness,
        Math.max(1, nextCheck - Date.now()),
      );
    }

    async function checkFreshness() {
      window.clearTimeout(timer);
      if (disposed || pending || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (
        now - lastFetchedRef.current < freshnessInterval ||
        (lastRefreshAttemptRef.current !== null &&
          now - lastRefreshAttemptRef.current < freshnessInterval)
      ) {
        schedule();
        return;
      }
      const controller = new AbortController();
      refreshControllerRef.current = controller;
      pending = true;
      lastRefreshAttemptRef.current = now;
      try {
        const response = await fetchWeather(
          location.latitude,
          location.longitude,
          { signal: controller.signal },
        );
        if (disposed || controller.signal.aborted) return;
        const weather = mapWeatherData(response, {
          location: locationLabel(location),
        });
        lastFetchedRef.current = Date.now();
        setWeatherState((previous) => ({ ...previous, weather }));
      } catch {
        // Give a failed/timed-out refresh a full interval before trying again.
        if (!disposed && !controller.signal.aborted)
          lastRefreshAttemptRef.current = Date.now();
      } finally {
        pending = false;
        if (refreshControllerRef.current === controller)
          refreshControllerRef.current = null;
        schedule();
      }
    }

    function visibilityChanged() {
      if (document.visibilityState === "visible") checkFreshness();
      else window.clearTimeout(timer);
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    schedule();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
      refreshControllerRef.current?.abort();
      refreshControllerRef.current = null;
    };
  }, [
    activeLocation,
    weatherState.displayedLocation,
    weatherState.status,
    locationStatus,
  ]);

  function selectLocation(location) {
    refreshControllerRef.current?.abort();
    locationRequestRef.current?.abort();
    locationRequestRef.current = null;
    setLocationStatus(null);
    location = {
      ...location,
      source: location.source === "device" ? "device" : "manual",
    };
    if (
      location.source === activeLocation.source &&
      location.source !== "device" &&
      weatherState.status === "success" &&
      !controllerRef.current?.signal.aborted &&
      sameLocation(activeLocation, location) &&
      locationLabel(activeLocation) === locationLabel(location)
    )
      return;
    // Abort immediately, before the next effect runs, to close the response race.
    controllerRef.current?.abort();
    setActiveLocation(location);
    setWeatherState((previous) => ({ ...previous, status: "loading" }));
  }

  function useMyLocation() {
    // Geolocation cannot be cancelled; this token invalidates its callbacks.
    if (locationRequestRef.current) return;
    refreshControllerRef.current?.abort();
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocationStatus({
        status: "error",
        message: "Location is unavailable. Use HTTPS or search for a city.",
      });
      return;
    }
    const controller = new AbortController();
    locationRequestRef.current = controller;
    // Keep the current weather target alive until GPS supplies a replacement.
    // selectLocation cancels it only after coordinates/name are ready.
    setLocationStatus({ status: "loading", message: "Finding your location…" });
    const fail = (error) => {
      if (controller.signal.aborted) return;
      locationRequestRef.current = null;
      const message =
        error?.code === 1
          ? "Location permission denied. Search for a city instead."
          : error?.code === 3
            ? "Location timed out. Try again or search for a city."
            : "Unable to find your location. Search for a city instead.";
      setLocationStatus({ status: "error", message });
    };
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (controller.signal.aborted) return;
          const { latitude, longitude } = position.coords;
          if (
            !Number.isFinite(latitude) ||
            Math.abs(latitude) > 90 ||
            !Number.isFinite(longitude) ||
            Math.abs(longitude) > 180
          ) {
            fail();
            return;
          }
          let name = { city: "Current location", country: null };
          try {
            name = await reverseGeocode(latitude, longitude, {
              signal: controller.signal,
            });
          } catch {
            /* A name is optional; weather still uses the original coordinates. */
          }
          if (controller.signal.aborted) return;
          selectLocation({ ...name, latitude, longitude, source: "device" });
        },
        fail,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
      );
    } catch {
      fail();
    }
  }

  function retryWeather() {
    refreshControllerRef.current?.abort();
    locationRequestRef.current?.abort();
    locationRequestRef.current = null;
    setLocationStatus(null);
    controllerRef.current?.abort();
    setWeatherState((previous) => ({ ...previous, status: "loading" }));
    setRequest((value) => value + 1);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("weather-theme", next);
    } catch {
      /* The switch still works when storage is unavailable. */
    }
  }

  const weatherPending = weatherState.status !== "success";
  const widgetStatus = weatherPending
    ? weatherState.status
    : (locationStatus?.status ?? weatherState.status);
  const widgetMessage = weatherPending
    ? locationStatus?.status === "error"
      ? `${locationStatus.message} ${weatherState.status === "loading" ? "Loading" : "Unable to load"} ${locationLabel(activeLocation)}${weatherState.status === "loading" ? "…" : "."}`
      : undefined
    : locationStatus?.message;

  return (
    <div className="app-shell">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelect={selectLocation}
        initialLocation={
          initialLocation.source === "restored" ? initialLocation : null
        }
        onUseLocation={useMyLocation}
        locationBusy={locationStatus?.status === "loading"}
        detectedLocation={
          weatherState.displayedLocation?.source === "device"
            ? weatherState.displayedLocation
            : null
        }
      />
      <main className="main-content">
        <div className="weather-stage">
          <WeatherWidget
            weather={
              weatherState.weather ?? {
                ...emptyWeather,
                location: locationLabel(initialLocation),
              }
            }
            status={widgetStatus}
            statusMessage={widgetMessage}
            hasWeather={weatherState.weather !== null}
            requestedLocation={locationLabel(activeLocation)}
            onRetry={
              weatherState.status === "error" || !locationStatus
                ? retryWeather
                : undefined
            }
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
