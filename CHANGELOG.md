# Changelog

Alle wichtigen Änderungen an PegelBoard werden hier dokumentiert.  
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

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
