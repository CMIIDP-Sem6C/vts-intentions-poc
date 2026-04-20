# VTS MVP - Digitale VTS Overlay

Een digitale weergave van een VTS-overlay (Vessel Traffic Services) voor het Rotterdamse havengebied. De applicatie toont schepen op een interactieve kaart, hun koers, bestemming en verificatiestatus. Gebouwd als technisch prototype (MVP) voor het onderzoeksproject "Slimme Objecten".

## Vereisten

- [Node.js](https://nodejs.org/) v18 of hoger

## Installatie

```bash
npm install
```

## Starten

```bash
node ./node_modules/vite/bin/vite.js
```

Open vervolgens [http://localhost:5173](http://localhost:5173) in je browser.

> **Let op:** `npm run dev` kan problemen geven als het mappad speciale tekens bevat (zoals `&`). Gebruik in dat geval bovenstaand commando.

## Bouwen voor productie

```bash
node ./node_modules/vite/bin/vite.js build
```

De gebouwde bestanden staan dan in de `dist/` map.

## Projectstructuur

```
src/
  components/
    map/
      VTSMap.jsx          Leaflet kaart met sector-overlay
      ShipMarker.jsx      Scheepsicoon (SVG) met koersvector
    panels/
      InboundPanel.jsx    Lijst inkomende schepen + verificatie-toggle
      ShipInfoCard.jsx    Detail-panel bij selectie van een schip
    layout/
      AppLayout.jsx       Fullscreen layout met overlay-panels
  data/
    mockShips.js          6 schepen met waypoints op de Oude Maas (OSM data)
    sectors.js            Sectorgrenzen en kaartcentrum
  hooks/
    useShipSimulation.js  Simuleert scheepsbewegingen langs waypoints
  utils/
    navigation.js         Haversine, heading, ETA berekeningen
  App.jsx                 Hoofdcomponent met state management
  App.css                 Styling (donkere VTS-panels)
```

## Tech Stack

- **React 18** (JavaScript)
- **Vite** (bundler)
- **Leaflet** + **react-leaflet** (kaart)
- Waypoint-coordinaten gebaseerd op **OpenStreetMap** data (Oude Maas middenlijn)

## Functionaliteiten

- Interactieve kaart van het Oude Maas havengebied
- 6 gesimuleerde schepen die langs realistische vaarroutes bewegen
- Scheepsiconen met kleurcodering (geel = inbound, groen = in-sector, paars = overig)
- Koersvector-lijnen die de vaarrichting tonen
- Inbound Vessels panel met naam, ETA, bestemming en verificatiestatus
- Klikbare ster-icoon om de bestemming als geverifieerd te markeren
- Ship Info kaart met gedetailleerde scheepsinformatie en operator-notities
