# Changelog

Alle wichtigen Änderungen an PegelBoard werden hier dokumentiert.  
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [0.3.0] – 2026-05-21

### Neu
- **Regenradar (DWD WMS)** – Vollständige Überarbeitung: Datenquelle jetzt DWD GeoServer (`dwd:Niederschlagsradar`) per WMS statt RainViewer; BBOX-basiert, kein Zoom-Level-Problem; kein API-Key nötig
- **Radar-Animation** – Optionaler 2-Stunden-Loop (25 Frames à 5 min); zwei WMS-Layer wechseln sich mit Opacity-Crossfade ab; läuft vollautomatisch ohne Benutzereingriff (kiosktauglich); Zeitbalken zeigt aktuellen Frame
- **Radar-Deckkraft** – Slider im Admin (10–100 %), default 65 %; live wirksam ohne Neustart
- **Slippstellen (OSM)** – Bootsrampen und Slipwege aus OpenStreetMap via Overpass API als Kartenoverlay; 6-Stunden-Cache im Backend; Toggle im Admin
- **Erweiterte Kartenstile** – Zusätzlich: Topo (OpenTopoMap), Satellit (ESRI World Imagery), Humanitär (OSM HOT)
- **Kartenlegende** – Dauerhaft eingeblendetes Overlay (unten links) mit allen Warnstufen sowie optionalen Einträgen für Slippstellen und Regenradar
- **AAO-Position wählbar** – Konfigurierbar ob die AAO-Sektion links (unter Pegelstände) oder rechts (unter Wetter/Vorhersage) erscheint
- **Einsatzmittel-Bezeichnung** – Auswahl zwischen Kurzname/Klarname und vollständigem Funkrufname je Fahrzeug

### Geändert
- Alle Radar- und Slippstellen-Toggles ins Backend verlegt (kein Frontend-Button mehr)
- AAO-Fahrzeugicons größer skaliert; Alpha-Kanal wird korrekt gegen den Glass-Card-Hintergrund freigestellt
- Nachrichten-Sektion in der BottomBar nur noch sichtbar wenn im Admin explizit aktiviert (`show_news = true`)

### Behoben
- Regenradar zeigte bei engem Zoom „Zoom Level not supported" (behoben durch WMS-Wechsel)
- `show_news`-Logik zeigte Nachrichten auch ohne aktiven Toggle

---

## [0.2.0] – 2026-05-20

### Neu
- **Tagesnachricht** – Freitextnachricht im Dashboard-Header, sichtbar für alle Schichtdienstler; konfigurierbar im Admin
- **Regenradar** – RainViewer-Overlay auf der Karte, per Knopfdruck ein-/ausblendbar (kein API-Key nötig)
- **Kartenstile** – Vier wählbare Stile: Carto Dark, Carto Light, OSM Standard, Hochkontrast; Auswahl wird gespeichert
- **Klarname-Mapping für Hubschrauber** – OpenSky-Callsigns lassen sich im Admin einem lesbaren Klarnamen zuordnen
- **AAO-Rechtspalte** – Alarm- und Ausrückordnung jetzt als zweispaltige Ansicht mit eigenem Rechts-Bereich; eigene Icons je Fahrzeug hochladbar

### Geändert
- Admin-Bereich grundlegend überarbeitet (Routing, Layout, Navigation) für klarere Struktur
- Versionsanzeige im Admin-Sidebar eingeführt
- Kartenmittelpunkt für Testbetrieb auf Magdeburg voreingestellt

### Behoben
- Diverse kleinere Fehler in der Pegelstations-Verwaltung und der Konfigurationsseite

---

## [0.1.0] – 2026-04

### Erstveröffentlichung
- Dashboard mit Pegelständen (PEGELONLINE), Trendpfeil, Δ cm/h, Wassertemperatur, Verlaufsgrafik
- Wetter & Wind via Bright Sky (DWD), 6-Stunden-Vorhersage, Beaufort-Skala, animierte Kompassrose
- Warnungen: NINA/MoWaS, DWD-Wetterwarnungen, LHP-Hochwasserwarnung
- Interaktive Leaflet-Karte mit Pegelmarkern (farbig nach Warnstufe)
- Optionales Hubschrauber-Tracking via OpenSky Network
- GPIO-Signalturm (3-stufig: grün / gelb / rot) für Raspberry Pi
- Einsatzanmerkungen (timestamptes Log) und Einsatzmittel-Ressourcenliste
- Automatischer Hell-/Dunkel-Wechsel bei Sonnenauf- und -untergang
- Freshness-Indikator für veraltete Datenquellen, automatische WebSocket-Wiederverbindung
- Admin-Bereich: Stationsverwaltung, Konfiguration, Benutzerverwaltung, Einsatzmittel & AAO
- JWT-Cookie-Authentifizierung mit scrypt-Passwort-Hashing
- Produktions-Deployment: Backend serviert Frontend statisch, systemd-Service für Raspberry Pi
