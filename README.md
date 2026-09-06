# OFFLINE SOS - SafeRoute

SafeRoute is an offline-first JavaFX prototype for route planning during stressful situations. It calculates routes from a local graph and keeps the core workflow available without a network connection.

> Safety scores are application-defined algorithmic outputs based on available data. They are not official safety ratings and do not guarantee personal safety. In a real emergency, contact the appropriate emergency services.

## Run

Requirements: Java 25+ and Maven 3.9+.

```bash
mvn clean test
mvn javafx:run
```

The web dashboard is in `web/` and uses real OpenStreetMap tiles through Leaflet. It does not require a map key for the base map; live transit directions open through Google Maps.

```bash
cd web
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` in a browser. Browser location requires permission and network access. Firebase, routing-provider, and production authentication credentials are intentionally not committed.

The included demo graph is explicitly **SYNTHETIC TEST DATA - NOT REAL-WORLD DATA**. Replace it only through a documented import pipeline with sourced data before using geographic claims.

## Architecture

JavaFX UI -> service layer -> repositories -> local SQLite. Routing consumes a graph loaded from local records; synchronization is optional and never required for routing.

The current slice includes SQLite schema initialization, coordinate/distance validation, shortest/safest/balanced Dijkstra routing, transparent offline status, and a focused JavaFX emergency workflow. See `docs/` for design notes.
