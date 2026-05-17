# VTS MVP - Digitale VTS Overlay

Een digitale weergave van een VTS-overlay (Vessel Traffic Services) voor het Rotterdamse havengebied. De applicatie toont schepen op een interactieve kaart, hun koers, bestemming en verificatiestatus. Gebouwd als technisch prototype (MVP) voor het onderzoeksproject "Slimme Objecten".

## Screenshots

![VTS Kaartoverzicht](docs/vts-overview.png)

![Schip Info Panel](docs/vts-ship-info.png)

![Scenario uitwijken op DB-route](docs/vts-scenario-uitwijken.png)

## Vereisten

- [Node.js](https://nodejs.org/) v18 of hoger
- [Python](https://www.python.org/) 3.11 of hoger (voor de verificatie-API)

## Installatie

```bash
npm install
pip install -r requirements-api.txt
```

## Starten

```bash
node ./node_modules/vite/bin/vite.js
```

Open vervolgens [http://localhost:5173](http://localhost:5173) in je browser.

> **Let op:** `npm run dev` kan problemen geven als het mappad speciale tekens bevat (zoals `&`). Gebruik in dat geval bovenstaand commando.

### Database API (Neon Postgres)

De app kan verificatie- en bestemmingsdata uit Postgres ophalen via een lokale **FastAPI**-service (`api/main.py`, **asyncpg**).

1. Maak een `.env` bestand met minimaal:
   - `DATABASE_URL`
   - `PORT` (optioneel, standaard `3001`)
2. Installeer Python-dependencies (eenmalig): `pip install -r requirements-api.txt`
3. Start de API vanaf de projectroot (zodat `python -m api.main` het package `api` vindt):

```bash
npm run api
```

4. Start de frontend in een tweede terminal:

```bash
node ./node_modules/vite/bin/vite.js
```

De frontend pollt elke seconde `Verification` records via `/api/verifications`. Scenario-data komt van `GET /api/scenarios/{id}` (standaard `?scenario=1` in de URL).

### Scenario's (database + events)

Voer `sql/scenario_schema.sql` uit op Postgres (of gebruik je eigen tabellen; zet dan o.a. `VTS_TBL_EVENT` als je event-tabel bv. `Event` heet).

- **`GET /api/scenarios`** — metadata van alle scenario's
- **`GET /api/scenarios/{id}`** — volledige payload: `scenario` (incl. `start_coordinate`, `duration_seconds`), `ships` (met `waypoints` uit `route`), `intentions_by_ship_id`, `events` (gesorteerd op `trigger_time`)

Ondersteunde event-typen in de frontend: `SpawnShip`, `HideIntention`, `ShowIntention` (subject `ship` + `subject_id` = database `ship.id`).

### Verifications automatisch vullen

Om automatisch records voor alle schepen uit `mockShips` toe te voegen (alleen als ze nog niet bestaan):

```bash
npm run bootstrap:verifications
```

Er is ook een endpoint beschikbaar:

```bash
POST /api/verifications/bootstrap
```

> Voor UPSERT in de API is een unieke constraint op `ship_id` nodig in tabel `Verification`.

## Bouwen voor productie

```bash
node ./node_modules/vite/bin/vite.js build
```

De gebouwde bestanden staan dan in de `dist/` map.

## Projectstructuur

```
api/
  main.py               FastAPI-app: verificaties + scenario-endpoints
  service.py            Verification-tabel (asyncpg)
  scenario_service.py   Scenario / ship / intention / events
  scenario_parse.py     JSON / route parsing voor Postgres-kolommen
  mock_ships.py         Alleen nog voor bootstrap verifications (legacy)
  bootstrap_cli.py      npm run bootstrap:verifications
sql/
  scenario_schema.sql   Referentiescript tabellen + voorbeelddata
tests/
  test_scenario_parse.py
src/
  components/
    ScenarioSelect.jsx    Startup overlay: kies een scenario uit de DB
    SectorSelect.jsx      Vervolg overlay: kies VTS-sector (Eemhaven / Waalhaven)
    map/
      VTSMap.jsx          Leaflet kaart met sector-overlay, ships en intention-lines
      ShipMarker.jsx      Triangle + hull scheepsiconen met richtingsvector op hover
    panels/
      InboundPanel.jsx    Lijst inkomende schepen met status kleuren (rood/geel/groen) + minimize
      ShipInfoCard.jsx    Detail-panel met editable bestemming en AIS scan functie
      Flag.jsx            Vlaggen voor scheepsnationaliteit
    inputs/
      TextAutocompleteInput.jsx
    layout/
      AppLayout.jsx       Fullscreen layout met overlay-panels
  data/
    sectors.js            Sectorgrenzen Nieuwe Maas (Eemhaven / Waalhaven), centerline, km-markers
  hooks/
    useScenarioData.js          Haalt scenario bundle (ships, intentions, events) op
    useScenarioSimulation.js    Driver: spawnt schepen op trigger_time, beweegt ze langs DB-route, regelt intentie zichtbaarheid (HideIntention/ShowIntention)
    useVerificationSync.js      Polling sync voor verificaties met de API
  utils/
    navigation.js         Haversine, heading, ETA berekeningen
  App.jsx                 Hoofdcomponent met scenario- en sector-selectie state
  App.css                 Tidalis-stijl donker VTS-thema
```

## Tech Stack

- **React 18** (JavaScript)
- **FastAPI** + **asyncpg** (verificatie-API)
- **Vite** (bundler)
- **Leaflet** + **react-leaflet** (kaart)
- **Puppeteer** (screenshots)
- Waypoint-coordinaten gebaseerd op **OpenStreetMap** data (Nieuwe Maas centreline)

## Functionaliteiten

- Scenario-selector als startscherm: scenario's komen uit de database (`/api/scenarios`)
- Sector-selector na scenario-keuze: kies VTS-sector Eemhaven of Waalhaven (Rotterdam, Nieuwe Maas)
- Database-gedreven scheepssimulatie: ships spawnen op `trigger_time` events, volgen `route` waypoints uit de DB
- Intentie-lijnen (declared route) per ship, dynamisch in/uit te schakelen via `HideIntention` / `ShowIntention` events
- Reeds-gevaren deel van de intentie-lijn wordt automatisch afgesneden voorbij de huidige scheepspositie
- Twee typen scheepsmarkers: driehoekige pijltjes (klein/snel) en langwerpige vrachtschepen
- Korte rode richtingsvector op hover voor elk schip
- Inbound vessel panel met ETA naar sector-grens, filtert op actieve sector, minimaliseerbaar voor screenshots
- Status kleursysteem: rood (onbekend), geel (gedeeltelijk), groen (volledig bekend)
- VTS operator kan bestemming invoeren en AIS status scannen via het detail-panel
- Tidalis-gebaseerde visuele stijl met warm kleurfilter
