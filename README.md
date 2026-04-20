# VTS MVP - Digitale VTS Overlay

Een digitale weergave van een VTS-overlay (Vessel Traffic Services) voor het Rotterdamse havengebied. De applicatie toont schepen op een interactieve kaart, hun koers, bestemming en verificatiestatus. Gebouwd als technisch prototype (MVP) voor het onderzoeksproject "Slimme Objecten".

## Screenshots

![VTS Kaartoverzicht](docs/vts-overview.png)

![Schip Info Panel](docs/vts-ship-info.png)

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
      VTSMap.jsx          Leaflet kaart met sector-overlay, moored ships, radar contacts
      ShipMarker.jsx      Triangle + hull scheepsiconen met koersvector en tracklines
    panels/
      InboundPanel.jsx    Lijst inkomende schepen met status kleuren (rood/geel/groen)
      ShipInfoCard.jsx    Detail-panel met editable bestemming en AIS scan functie
    layout/
      AppLayout.jsx       Fullscreen layout met overlay-panels
  data/
    mockShips.js          Scheepsdata met OSM-coordinaten Nieuwe Maas, moored ships, radar contacts
    sectors.js            Sectorgrenzen Nieuwe Maas (Pernis - Erasmusbrug)
  hooks/
    useShipSimulation.js  Simuleert scheepsbewegingen langs waypoints met route reversal
  utils/
    navigation.js         Haversine, heading, ETA berekeningen
  App.jsx                 Hoofdcomponent met state management
  App.css                 Tidalis-stijl donker VTS-thema
```

## Tech Stack

- **React 18** (JavaScript)
- **Vite** (bundler)
- **Leaflet** + **react-leaflet** (kaart)
- **Puppeteer** (screenshots)
- Waypoint-coordinaten gebaseerd op **OpenStreetMap** data (Nieuwe Maas centreline)

## Functionaliteiten

- Interactieve kaart van het Nieuwe Maas VTS-sector (Rotterdam)
- 6 gesimuleerde schepen met realistische vaarroutes (OSM-coordinaten)
- Twee typen scheepsmarkers: driehoekige pijltjes en langwerpige vrachtschepen
- Afgemeerde schepen in echte havenbassins (Waalhaven, Eemhaven, Merwehaven, etc.)
- Radar contacts langs de oevers
- Tracklines alleen zichtbaar bij hover of selectie, richtingsvector altijd zichtbaar
- Status kleursysteem: rood (onbekend), geel (gedeeltelijk), groen (volledig bekend)
- VTS operator kan bestemming invoeren en AIS status scannen
- Draggable en roteerbare afgemeerde schepen
- Tidalis-gebaseerde visuele stijl met warm kleurfilter

TBA
