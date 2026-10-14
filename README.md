# WEATHER by Frank

*A personal React project exploring weather data through a clean, interactive interface.*

WEATHER by Frank is a responsive weather application built with React, JavaScript, Vite, and the [Open-Meteo API](https://open-meteo.com/).

The project originally started as a rebuild of one of my earlier React applications. What began as a simple weather widget gradually evolved into a more complete experience, combining a compact forecast view with an expandable desktop dashboard.

My goal was to create an application that feels simple and intuitive while exploring responsive design, live weather data, and interactive UI elements.

## Live Demo

[**Check the Weather**](https://frankom85.github.io/weather-by-frank-2026/)

## Preview

*Screenshots coming soon.*

## Features

### Current Weather

- View current weather conditions, temperature, humidity, wind, and precipitation probability.
- Search for cities with autocomplete suggestions.
- Use optional device geolocation to retrieve local weather.
- Display local date and time for the selected city.

### Weather Forecast

- Browse a compact seven-day forecast.
- Expand the desktop widget into a detailed weather dashboard.
- Explore six hourly forecast points at three-hour intervals.
- View a twelve-day forecast with temperature visualizations, wind, and precipitation.

### User Experience

- Responsive layouts for desktop, tablet, and mobile.
- Light and dark themes with custom photographic backgrounds.
- Smooth transitions and subtle UI animations.
- Automatic weather updates and locally saved preferences.
- Loading and error states with retry functionality.
- Keyboard accessibility, visible focus indicators, and reduced-motion support.

## Tech Stack

- **React** — Component-based UI and state management
- **JavaScript** — Application logic and interactions
- **Vite** — Development environment and build tooling
- **CSS** — Responsive layouts, animations, and custom styling
- **Open-Meteo API** — Weather forecasts and city search
- **BigDataCloud API** — Reverse geocoding for device location
- **Oxlint** — Code quality checks
- **Node.js Test Runner** — Automated functionality tests
- **GitHub Actions & GitHub Pages** — Automated build and deployment

## What I Focused On

This project was an opportunity to revisit one of my earlier weather applications and explore a more thoughtful approach to frontend development.

I wanted to build something that could remain compact and useful while offering a more detailed experience when needed.

Some of the areas I focused on were:

- Organizing the application into reusable React components.
- Working with external APIs and asynchronous data.
- Handling city search, geolocation, loading states, and errors.
- Managing timezone-aware weather data and forecasts.
- Creating responsive layouts for different screen sizes.
- Designing smooth transitions between compact and expanded views.
- Refining visual details, including typography, spacing, colors, and animations.
- Improving accessibility and checking application behavior through automated tests.

One of the more interesting challenges was transforming a small weather widget into a larger interactive dashboard without losing the simplicity of the original design.

The result is a project that reflects my interest in combining frontend functionality with thoughtful user interface design.

## Getting Started

To run the project locally, you'll need a compatible version of Node.js and npm.

**1. Clone the repository**

```bash
git clone https://github.com/FrankoM85/weather-by-frank-2026.git
cd weather-by-frank-2026
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the development server**

```bash
npm run dev
```

Open the local URL shown in your terminal.

To create a production build:

```bash
npm run build
```

To run the code quality check:

```bash
npm run lint
```

To run automated tests:

```bash
npm test
```

## Project Structure

```text
public/
├── dark-background.jpg
├── light-background.jpg
└── favicon.svg

src/
├── api/                    # Weather and geocoding API requests
│   ├── geocoding.js
│   ├── openMeteo.js
│   └── reverseGeocoding.js
├── assets/                 # Application logos
├── components/
│   ├── city-search/        # City search and autocomplete
│   ├── footer/             # Footer and data attribution
│   ├── header/             # Application header
│   ├── icon/               # Reusable icon component
│   ├── theme-switch/       # Light/dark theme toggle
│   ├── weather-icon/       # Weather condition icons
│   └── weather-widget/     # Compact widget and expanded dashboard
│       ├── DetailedForecast.jsx
│       ├── HourlyForecast.jsx
│       ├── weatherWidget.css
│       └── WeatherWidget.jsx
├── data/
│   └── location.js
├── utils/                  # Forecast and weather data utilities
│   ├── dailyForecast.js
│   ├── hourlyForecast.js
│   ├── weatherCodes.js
│   └── weatherMapper.js
├── app.css
├── App.jsx
├── index.css
└── main.jsx

tests/                      # Automated tests
├── dailyForecast.test.js
├── geocoding.test.js
├── hourlyForecast.test.js
└── weatherMapper.test.js
```

## API & Credits

Weather forecasts and city search data are provided by [Open-Meteo](https://open-meteo.com/).

Reverse geocoding for optional device location is provided by [BigDataCloud](https://www.bigdatacloud.com/).

This is an independent, non-commercial project created for learning and portfolio purposes.

---

*Built with curiosity, patience, and attention to the little details.*
