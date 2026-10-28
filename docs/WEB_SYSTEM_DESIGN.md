# SafeRoute Web Dashboard — System Design

This document describes the **React web dashboard** in `web/` and its optional Node API in `server/`. It does not describe the separate JavaFX prototype.

## 1. Scope and implementation status

The web client is a Vite + React + TypeScript single-page application. It presents route planning, a map, emergency contacts, profile/authentication controls, lighting and predictive-risk overlays, companion matching, acoustic panic monitoring, and Guardian Mesh demonstrations.

The dashboard combines implemented browser-side behavior with seeded demonstration data. Features that look like live safety services must not be treated as authoritative: route profiles, many directory coordinates, outage examples, companion candidates, mesh relay peers, and several temporal events are static or simulated. Browser capabilities and optional server credentials can also be unavailable. Emergency dispatch, production authentication, authoritative routing, live transit, and real Bluetooth mesh relaying are not established by this prototype.

## 2. System architecture

```mermaid
flowchart LR
  U[User] --> B[Browser]
  B --> UI[React SPA\nSafeRouteDashboard]
  UI --> MAP[React Leaflet map]
  MAP --> OSM[OpenStreetMap tile service\nnetwork required]
  UI --> GEO[Browser geolocation API\npermission required]
  UI --> LS[Browser localStorage]
  UI --> MEDIA[Browser media, speech, motion APIs\npermission/capability dependent]
  UI --> BC[BroadcastChannel\nsame-origin tabs]
  UI --> AUTH[Firebase Auth\nonly when configured]
  UI -->|/api requests via Vite proxy| VITE[Vite development server]
  VITE --> API[Optional Node HTTP API :8787]
  API --> GEM[Google Gemini API\noptional API key]
  API --> TRANSIT[Configured transit endpoint\noptional BMTC_API_URL]
  API --> LOG[Server console log\nmesh demo endpoint]
```

### Runtime components

| Component | Responsibility | Data / dependencies |
|---|---|---|
| `web/src/SafeRouteDashboard.tsx` | Main dashboard state and user workflows: route selection, SOS, emergency directory, auth UI, geolocation, transit, contacts, map display, feature panels | Seeded route profiles and reference points; browser APIs; imports feature services |
| `web/src/features/illumination/` | Computes a light estimate per point from solar/lunar values, segment type and outage reports; stores reports locally | `localStorage` key `saferoute-streetlight-outages`; astronomy calculations; sample outage if no saved value |
| `web/src/features/predictiveRisk/` | Computes time-of-day risk multiplier and event deltas; optionally requests an analysis summary | Local time/events; `POST /api/risk/predictive-horizon` is best-effort |
| `web/src/features/acousticPanic/` | Starts/stops audio analysis, speech keyword and motion monitoring when available; emits trigger events and optional audio clip | Microphone permission, Web Audio, speech recognition, device motion; simulated metrics fallback |
| `web/src/features/guardianMesh/` | Creates SOS packet, logs hops, shares packet across same-origin tabs, attempts a browser Bluetooth capability path | `BroadcastChannel`; peer/hop simulation; browser Bluetooth availability; API dispatch endpoint may be used by UI |
| `web/src/features/companionMatching/` | Generates a short token, displays sample companion candidates and shares panic notification between tabs | Static candidate list; Web Crypto when available; `BroadcastChannel` |
| `web/src/features/arCorridor/` | Displays the AR corridor HUD experience | UI demonstration; not a native AR navigation runtime |
| `web/src/firebase.ts` | Initializes Firebase only when configuration is present | `web/.env.local` values, based on `.env.example` |
| `server/index.mjs` | Optional JSON HTTP endpoints for route brief, predictive summary, mesh demo dispatch, and transit status | Node.js; optional Gemini key and transit endpoint |
| `web/vite.config.ts` | Proxies `/api` requests to `http://127.0.0.1:8787` while developing | Vite development server and Node API running locally |

### Data boundaries

- Route selection and most dashboard calculations run in the browser. The web dashboard's route profiles are seeded fallback objects; the Node `/api/gemini/route-summary` endpoint is a text brief and does not calculate a navigable route.
- The browser persists some user-created preferences and reports in `localStorage`; this storage is per browser profile and is not a synchronized account database.
- Firebase email/password authentication is conditional on valid client configuration. A local profile path is available when Firebase is not configured.
- Leaflet obtains map tiles from OpenStreetMap over the network. Offline routing data and offline map tiles are not equivalent; the web map requires network access for its tile layer.
- The Node API is optional. The client catches unavailable predictive API calls and computes a local baseline. Transit may remain `unknown` when no endpoint is configured.
- Gemini calls are made by the server so the API key is not embedded in the browser bundle. Never commit `.env` files or production secrets.

## 3. Use case diagram

```mermaid
flowchart LR
  Person((User))
  BrowserAPI((Browser permissions / capabilities))
  Firebase((Firebase Auth))
  OSM((OpenStreetMap tiles))
  Gemini((Gemini API))
  Transit((Configured transit provider))

  subgraph SafeRoute[SafeRoute Web Dashboard]
    UC1([Open dashboard / local profile])
    UC2([Sign in or create account])
    UC3([View map and reference places])
    UC4([Select route mode and view route])
    UC5([Request device location])
    UC6([View emergency directory / call link])
    UC7([Manage local contacts and profile image])
    UC8([View lighting estimate and report outage])
    UC9([View predictive risk horizon])
    UC10([Find walking companion])
    UC11([Enable acoustic / motion panic monitor])
    UC12([Trigger SOS / inspect mesh demo])
    UC13([Check transit status / open transit handoff])
  end

  Person --> UC1
  Person --> UC2
  Person --> UC3
  Person --> UC4
  Person --> UC5
  Person --> UC6
  Person --> UC7
  Person --> UC8
  Person --> UC9
  Person --> UC10
  Person --> UC11
  Person --> UC12
  Person --> UC13
  BrowserAPI --> UC5
  BrowserAPI --> UC8
  BrowserAPI --> UC11
  OSM --> UC3
  Firebase --> UC2
  Gemini --> UC9
  Transit --> UC13
```

## 4. Dashboard state chart

The chart captures the main dashboard's broad state. Feature modals and services have their own local state; they are summarized as substates here.

```mermaid
stateDiagram-v2
  [*] --> Initializing
  Initializing --> LocalDashboard: Firebase absent / auth initialized
  Initializing --> AuthLoading: Firebase configured
  AuthLoading --> SignedOut: auth callback has no user
  AuthLoading --> SignedIn: auth callback has user
  AuthLoading --> LocalDashboard: auth initialization unavailable
  SignedOut --> SignedIn: sign in / account creation succeeds
  SignedOut --> SignedOut: auth error
  SignedOut --> LocalDashboard: continue with local profile
  SignedIn --> SignedOut: sign out
  LocalDashboard --> LocationReady: allow location or use reference coordinate
  SignedIn --> LocationReady: allow location or use reference coordinate
  LocationReady --> RouteLoading: choose route mode / request route
  RouteLoading --> RouteDisplayed: route result available
  RouteLoading --> LocationReady: invalid or unsupported place
  RouteDisplayed --> RouteLoading: change route mode / endpoints
  RouteDisplayed --> LocationReady: clear route
  LocationReady --> SOSActive: trigger SOS
  RouteDisplayed --> SOSActive: trigger SOS
  SOSActive --> AlertPrepared: build local emergency alert
  AlertPrepared --> LocationReady: dismiss / reset
  SOSActive --> LocationReady: stop or dismiss
  LocationReady --> LocationReady: toggle features, directory, settings
  RouteDisplayed --> RouteDisplayed: toggle features, directory, settings
```

### Main state variables

The dashboard tracks route mode (`safest`, `shortest`, `transit`), current/reference coordinate, destination text, route visibility/loading, online/network indicators, SOS and alert flags, auth readiness/user/local-profile mode, map style, transit state, contact list, active directory filters, and per-feature modal/panel state. The acoustic service separately tracks monitoring and browser resource handles; mesh and companion services maintain their own packet/match state.

## 5. Deployment diagram

```mermaid
flowchart TB
  subgraph Device[User device]
    Browser[Modern browser\nReact application]
    Storage[(localStorage)]
    BrowserAPIs[Geolocation / microphone / speech / motion\noptional permissions]
    Tabs[Same-origin browser tabs\nBroadcastChannel]
  end
  subgraph DevHost[Development host]
    Vite[Vite dev server\n0.0.0.0:5173]
    Node[Optional Node API\n127.0.0.1:8787]
    Env[Local environment variables\nweb/.env.local, server/.env]
  end
  subgraph External[External network services]
    Tiles[OpenStreetMap tile service]
    Firebase[Firebase Authentication\noptional]
    Gemini[Google Gemini API\noptional]
    Transit[Transit endpoint\noptional]
    Maps[Google Maps / transit handoff]
  end
  Browser --> Vite
  Vite -->|serves compiled client modules| Browser
  Browser <--> Storage
  Browser <--> BrowserAPIs
  Browser <--> Tabs
  Browser --> Tiles
  Browser --> Firebase
  Browser -->|/api proxy| Vite
  Vite --> Node
  Node --> Env
  Node --> Gemini
  Node --> Transit
  Browser --> Maps
```

### Local development deployment

1. Install dependencies in `web/` with `npm install`.
2. Run `npm run dev -- --host 0.0.0.0` from `web/`; Vite serves the UI on port `5173`.
3. For API-backed features, configure `server/.env` from `server/.env.example`, then run `node server/index.mjs` from `server/` (default port `8787`). Vite proxies `/api` requests to it.
4. Configure Firebase client values in `web/.env.local` only when authentication is needed.
5. Browser access to microphone, location, and motion features depends on browser policy, permission, and usually a secure context such as localhost or HTTPS.

## 6. Flowcharts

### Flow 1 — Open dashboard and initialize authentication

```mermaid
flowchart TD
  A([Open app]) --> B[Load React app and initialize Firebase module]
  B --> C{Firebase configured?}
  C -- No --> D[Mark auth ready; offer local profile]
  C -- Yes --> E[Subscribe to Firebase auth state]
  E --> F{Existing user?}
  F -- Yes --> G[Set signed-in user]
  F -- No --> H[Show sign-in / create-account controls]
  H --> I{Credentials submitted?}
  I -- No --> H
  I -- Yes --> J[Call Firebase email/password operation]
  J --> K{Success?}
  K -- Yes --> G
  K -- No --> L[Display auth error]
  L --> H
  D --> M[Render dashboard]
  G --> M
```

### Flow 2 — Select and display a route

```mermaid
flowchart TD
  A([User enters origin and destination]) --> B[Choose route mode]
  B --> C{Mode}
  C -- Safest --> D[Use safest route profile]
  C -- Shortest --> E[Use shortest route profile]
  C -- Transit --> F[Open transit candidates / status workflow]
  D --> G[Set route summary and waypoints]
  E --> G
  G --> H[Show route polyline, risk, ETA, distance, nearby support]
  H --> I{Destination recognized / route available?}
  I -- Yes --> J([Route visible])
  I -- No --> K[Show unavailable or fallback notice]
  F --> L{Live transit endpoint available?}
  L -- No --> M[Keep status unknown; offer external transit handoff]
  L -- Yes --> N[Request transit status]
  N --> O[Render returned status]
  M --> J
  O --> J
```

### Flow 3 — Request current location

```mermaid
flowchart TD
  A([User selects locate]) --> B{Online mode / browser geolocation available?}
  B -- No --> C[Keep seeded reference location and explain fallback]
  B -- Yes --> D[Request browser geolocation permission]
  D --> E{Permission and fix obtained?}
  E -- No --> F[Show location unavailable; retain reference coordinate]
  E -- Yes --> G[Update coordinate, accuracy and location label]
  C --> H([Continue planning])
  F --> H
  G --> H
```

### Flow 4 — SOS and Guardian Mesh demonstration

```mermaid
flowchart TD
  A([Manual SOS or panic trigger]) --> B[Construct alert payload and local packet]
  B --> C[Set packet id, origin node, hop limit and coordinates]
  C --> D[Record packet and event in UI service state]
  D --> E{BroadcastChannel supported?}
  E -- Yes --> F[Broadcast packet to same-origin tabs]
  E -- No --> G[Continue local-only demonstration]
  F --> H[Attempt Web Bluetooth capability path when present]
  G --> H
  H --> I[Simulate relay hops through seeded peers]
  I --> J{Gateway/API dispatch path invoked?}
  J -- Yes --> K[POST demo packet to /api/emergency/mesh-dispatch]
  J -- No --> L[Keep packet and hop log local]
  K --> M[Server logs request and returns demo dispatch response]
  L --> N([Show SOS/mesh status])
  M --> N
```

### Flow 5 — Acoustic panic monitoring

```mermaid
flowchart TD
  A([User enables guard]) --> B[Request audio context and microphone where supported]
  B --> C{Mic/audio available and granted?}
  C -- Yes --> D[Analyze frequency data; calculate dB and high-frequency ratio]
  C -- No --> E[Start simulated audio metrics fallback]
  D --> F[Initialize voice keyword and motion listeners when supported]
  E --> F
  F --> G{Manual, keyword, motion, or acoustic threshold trigger?}
  G -- No --> H{Monitoring still enabled?}
  H -- Yes --> D
  H -- No --> I[Stop animation loop, media tracks, audio context and listeners]
  G -- Yes --> J[Emit panic trigger event]
  J --> K[Dashboard handles event and prepares SOS/alert workflow]
  K --> H
  I --> L([Monitoring stopped])
```

## 7. Feature workflows and persistence details

### Route and map

The dashboard stores route mode and active route summary in React component state. Its route options include distance, ETA, risk value, nearby support names, waypoints, alternatives and a source label. Leaflet renders the map and external tiles; route and place markers are overlaid by the client. Browser location requires user permission. Transit candidate values are seeded as unknown until an optional API response is available; a transit handoff may open an external maps service.

### Authentication and profile

When Firebase configuration exists, the dashboard subscribes to Firebase Auth state and offers email/password sign-in and account creation, plus sign-out. Without Firebase configuration it does not require an account and uses a local profile flow. Profile image and custom emergency contacts are stored in browser `localStorage`; they are not shared between devices.

### Emergency directory

The UI uses hard-coded emergency and nearby directory entries with names, phone numbers, categories, source labels and external source links. These are quick reference links. The prototype does not guarantee that the values are current, dispatch calls automatically, or verify which service covers a location.

### Lighting and outage reports

The lighting engine estimates light from solar/lunar calculations, road segment class, and stored outage reports. A sample outage is seeded if there is no saved entry. User outage reports and clears update `saferoute-streetlight-outages` in local storage. These are estimates and community reports, not a live municipal lighting feed.

### Predictive risk

The client applies a time-of-day multiplier and local event deltas, clamps calculated risk, and creates a recommendation. It best-effort posts origin, destination and time offset to `/api/risk/predictive-horizon`. The Node handler returns a baseline summary if no Gemini key is configured, or requests a Gemini summary if configured. A returned summary is advisory text and does not replace route computation or authoritative event data.

### Companion matching

The service can generate a corridor/time token with Web Crypto SHA-256 where available, but the displayed candidate list is seeded sample data. Companion panic uses `BroadcastChannel` to alert other compatible same-origin tabs; it does not contact a remote matching service or dispatch emergency responders.

### Acoustic guard

The acoustic service requests microphone access when possible, analyzes audio-frequency energy, and can use speech recognition and device motion where supported. It has a simulated metrics fallback when microphone access fails. Trigger heuristics and browser sensor signals are prototypes and may misclassify conditions. Stopping the guard releases microphone tracks, audio context and registered listeners.

### Guardian Mesh

The service constructs a packet, logs it, broadcasts to same-origin tabs, attempts a browser Bluetooth path when the API exists, and advances through seeded relay nodes as a simulation. `BroadcastChannel` only communicates between relevant same-origin contexts on the same device/browser profile; the code does not implement a real interoperable peer-to-peer mesh radio. The Node dispatch endpoint logs the request and returns a fabricated demo ticket/unit response; it is not connected to an emergency service.

## 8. Node API reference

The optional server listens on `PORT` or `8787`.

| Method and path | Purpose | Configuration / behavior |
|---|---|---|
| `POST /api/gemini/route-summary` | Generate a concise route safety brief | Returns `503` if `GEMINI_API_KEY` is absent; otherwise calls configured `GEMINI_MODEL` (default `gemini-2.0-flash`). This is narrative text, not routing. |
| `POST /api/risk/predictive-horizon` | Return predictive horizon summary | Without a key returns a local baseline; with key requests Gemini analysis and falls back to baseline on request failure. |
| `POST /api/emergency/mesh-dispatch` | Demonstration dispatch response | Logs packet/gateway details and returns a generated ticket and sample unit; no real dispatch occurs. |
| `GET /api/transit/bmtc?routes=...` | Query configured transit adapter | Without `BMTC_API_URL`, returns unknown statuses and an official app URL. With endpoint, forwards route list as JSON POST. |

All handlers return JSON and support basic CORS/OPTIONS. The API is a prototype service; add authentication, input validation, rate limits, controlled CORS, observability and operational safeguards before exposing it publicly.

## 9. Configuration and commands

```bash
cd web
npm install
npm run dev -- --host 0.0.0.0
```

Optional server:

```bash
cd server
# Configure server/.env using server/.env.example
node index.mjs
```

Vite proxies `/api` to `http://127.0.0.1:8787`. For non-development deployment, serve the built web assets from an HTTPS-capable static host and deploy the Node API separately with server-side secrets. Configure the API base/proxy for that deployment; do not expose Gemini secrets as client environment variables.

## 10. Operational constraints

- The map tile layer needs network access; the React dashboard is not a full offline map client.
- Browser geolocation, microphone, speech recognition, device motion and Bluetooth are optional browser capabilities and may require HTTPS and explicit permission.
- Local storage can be cleared, is device/browser-specific, and is not a backup or secure server-side store.
- Seeded locations, routes, events, support listings, companion records and mesh peers are demonstration content. Validate every real-world directory entry and geographic claim before operational use.
- The web dashboard and JavaFX app are separate implementations. This document covers only `web/` and `server/`.
