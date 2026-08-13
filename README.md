# Loro Parque Navigator

**Disclaimer:** This is an unofficial guide to Loro Parque. It is not affiliated with or endorsed by Loro Parque. Use at your own risk.

An offline-first progressive web app (PWA) for navigating Loro Parque, the renowned bird park and zoo in Tenerife, Spain. View a real-time map, plan your route between animal shows, and check whether you have enough time to reach the next venue—all without an internet connection.

## Live App

Open in your browser: [https://<account>.github.io/loro-parque-navigator/](https://<account>.github.io/loro-parque-navigator/)

On a phone, install as a PWA (tap the "Install" button in your browser) and use offline.

## Features

- **Offline map**: Seamless navigation powered by MapLibre GL and cached map data
- **Routing**: Dijkstra pathfinding between shows and venues
- **Time to next show**: Real-time calculation whether you can reach the next venue in time
- **Multilingual**: English, Spanish, and German UI
- **Progressive Web App**: Install on your phone home screen; works without internet

## Development

### Prerequisites

- Node.js ≥ 20
- npm

### Install

```bash
npm install
```

### Commands

- **`npm run dev`** – Start development server with hot reload  
- **`npm run build`** – Build for production  
- **`npm test`** – Run unit tests  
- **`npm run e2e`** – Run end-to-end tests (requires `npm run build` first)

### Data Pipeline

The app loads park data from GeoJSON and show times from a JSON manifest. The data pipeline runs in two steps:

1. **Fetch OSM data** (once per session or as needed):
   ```bash
   npm run data:fetch
   ```
   Queries Overpass API for Loro Parque boundaries, pathways, and amenities.

2. **Build GeoJSON and routing graph**:
   ```bash
   npm run data:build
   ```
   Converts Overpass data to GeoJSON, builds POI list, applies overrides from `data/overrides.json`, and constructs the Dijkstra graph.

#### Customizing Data: Overrides Workflow

Local adjustments to POI names, coordinates, and tags are stored in `data/overrides.json`. Edit this file to:
- Fix inaccurate OSM coordinates
- Add missing amenities not in OSM
- Adjust labels for clarity

After editing, run `npm run data:build` to regenerate `public/data/pois.json` and `public/data/graph.json`.

## How to Update Show Times

Show times are stored in two places (kept in sync):

1. **`public/data/shows.json`** – The app's runtime data file  
2. **`src/shows/fallback.json`** – The fallback bundle (used offline if the fetch fails)

To update show times:

1. Edit **both** files with the new schedule. Maintain the same JSON structure:
   ```json
   {
     "updated": "YYYY-MM-DD",
     "timezone": "Atlantic/Canary",
     "venues": [...],
     "shows": [{ "venueId": "...", "times": ["HH:MM", ...] }, ...]
   }
   ```

2. Commit and push to the repository:
   ```bash
   git add public/data/shows.json src/shows/fallback.json
   git commit -m "chore: update show times for [date/season]"
   git push
   ```

3. GitHub Pages automatically redeploys the site. Open the live app in your browser to see the updated schedule (refresh if needed).

## Attribution

- **Map data** © [OpenStreetMap](https://www.openstreetmap.org) contributors, licensed under [ODbL](https://opendatacommons.org/licenses/odbl/).
- **Map rendering** [MapLibre GL](https://maplibre.org).

## License

MIT License © 2026 Martin Nimrichter. See `LICENSE` for details.
