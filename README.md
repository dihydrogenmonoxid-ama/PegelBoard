
<p align="center">
  <img src=".github/assets/logo.png" width="160" alt="PegelBoard Logo" />
</p>

<h1 align="center">🌊 PegelBoard</h1>

<p align="center">
  Einsatzmonitor für alle Einheiten der Wasserrettung.
</p>

<p align="center">
  Relevante Wasserinformationen – auf einen Blick, in Echtzeit.
</p>

<p align="center">
  <img src=".github/assets/header.png" alt="PegelBoard Dashboard" />
</p>

![License](https://img.shields.io/github/license/dihydrogenmonoxid-ama/PegelBoard)
![Stars](https://img.shields.io/github/stars/dihydrogenmonoxid-ama/PegelBoard)
![Issues](https://img.shields.io/github/issues/dihydrogenmonoxid-ama/PegelBoard)
![Node](https://img.shields.io/badge/node-%3E%3D26-339933)
![Platform](https://img.shields.io/badge/platform-Raspberry%20Pi-C51A4A)

# PegelBoard

**Informationsmonitor für Wasserrettungseinheiten**



> Entwickelt für Wasserrettungseinheiten der Feuerwehren, DLRG, Wasserwacht, etc.

---

## Was ist PegelBoard?

PegelBoard ist ein Informationssystem, das z.B. auf einem **Raspberry Pi** läuft und beim Einschalten sofort einsatzbereit ist. Kein Login-Bildschirm, kein Laden – nur die Informationen, die im Einsatz zählen.

Das Dashboard ist für **große Monitore und Lageräume** konzipiert: lesbar aus 3–5 Metern Entfernung, optimiert für dunkle Einsatzzentralen, automatisch hell bei Tageslicht.

```
┌─────────────────────────────────────────────────────────────────┐
│  🟢 PegelBoard   08:42:17   🌅 05:14  🌇 20:51          Admin  │
├──────────────┬────────────────────────────┬─────────────────────┤
│              │                            │  15.3 °C ☀️         │
│  Elbe        │                            │  Wind: 12 km/h NW   │
│  ████ 423 cm │     [  Karte  ]            │  Böen: 22 km/h      │
│  ↑ +2.1 cm/h │                            │                     │
│  🌡 14.2 °C  │   Pegelmarker ●  ●  ●      │  ⏱ 09h ⏱ 10h ...  │
│              │   Regenradar 🌧️ (toggle)   │                     │
│  Saale       │   Heli-Layer 🚁            │                     │
│  ███ 187 cm  │                            │                     │
│  → 0.0 cm/h  │                            │                     │
├──────────────┴────────────────────────────┴─────────────────────┤
│  ⚠ NINA: Hochwasserwarnung       │ z.B. Tagesschau-Meldungen  │ 📋 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### 🌊 Pegelstände in Echtzeit
- Live-Messwerte von **PEGELONLINE** (alle Pegel Deutschlands)
- Trendpfeil: steigend ↑, fallend ↓, stabil →
- **Δ cm/h** – Anstiegsrate der letzten Stunde
- Wassertemperatur, wenn vom Pegel verfügbar
- Verlaufsgrafik (Zeitraum pro Station im Admin konfigurierbar)
- **Pegelprognose** als gestrichelte Linie, wenn von PEGELONLINE verfügbar
- **HQ100-Referenzlinie** direkt im Diagramm
- Rote Pulsanimation bei Überschreitung des Alarmwertes

### 🗺️ Interaktive Karte
- **Pegelmarker** farbig nach Warnstufe (grün → gelb → orange → rot)
- **Regenradar** per Knopfdruck (RainViewer, kein API-Key nötig)
- Optionales **Hubschrauber-Tracking** via OpenSky Network 🚁

### ⚠️ Warnungen
- **NINA / MoWaS** – offizielle Bevölkerungsschutzwarnungen
- **DWD-Wetterwarnungen** – Sturm, Gewitter, Hochwasser, Starkregen
- Sortiert nach Schweregrad, farbcodiert, immer sichtbar in der Fußzeile

### 🌤️ Wetter & Wind
- Aktuelle Bedingungen via **Bright Sky** (DWD-Daten, kein API-Key nötig)
- 6-Stunden-Vorhersage als horizontaler Streifen
- Windstärke in **Beaufort** mit animierter Kompassrose

### 🕐 Intelligente Tageszeitsteuerung
- **Automatischer Hell-/Dunkel-Wechsel** bei Sonnenauf- und -untergang
- Sonnenzeiten immer sichtbar in der Kopfzeile – kein API-Key, berechnet aus dem Standort
- Manuell überschreibbar im Admin

### 📡 Offline-Resilient
- Letzter bekannter Stand bleibt sichtbar
- Freshness-Indikator: warnt, wenn Daten älter als 2 Stunden sind
- Automatische Wiederverbindung des WebSockets

### 🔴 GPIO / Signalturm
- Signalturm (3-stufig: grün / gelb / rot) direkt z.B. am Raspberry Pi anschließen
- Schaltet automatisch bei Pegelalarmen
- Konfigurierbare GPIO-Pins im Admin

### 📋 Einsatzbetrieb
- **Tagesnachricht** – Freitextnachricht für alle Schichtdienstler im Blick
- **Einsatzanmerkungen** – timestamptes Log für Lagefeststellungen
- **Einsatzmittel** – Ressourcenliste mit Verfügbarkeitsstatus
- **AAO-Matrix** – wer fährt bei welchem Pegelstand (mit eigenen Fahrzeug-Icons)

---

## Schnellstart

**Voraussetzungen:** Node.js ≥ 26, npm ≥ 10

```bash
git clone https://github.com/dihydrogenmonoxid-ama/PegelBoard.git
cd pegelboard
npm install
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:4000](http://localhost:4000)
- Admin: [http://localhost:5173/admin](http://localhost:5173/admin) → `admin` / `wasser`

Nach dem ersten Start im Admin unter **Konfiguration** den Standort (lat/lon) eintragen – dann funktionieren Sonnenzeiten, automatischer Tag/Nacht-Modus und Wetter.

---

## Auf dem Raspberry Pi installieren

```bash
# Auf dem Pi:
git clone https://github.com/dihydrogenmonoxid-ama/PegelBoard.git
cd pegelboard
npm install
npm run build          # Backend + Frontend bauen

# Als Systemdienst starten
sudo cp deploy/pegelboard.service /etc/systemd/system/
sudo systemctl enable --now pegelboard
```

Das Dashboard ist danach unter **http://pegelboard.local** erreichbar.

Für den Kiosk-Modus (Chromium fullscreen beim Booten):

```bash
# In /etc/xdg/openbox/autostart oder ~/.config/lxsession/LXDE-pi/autostart:
chromium-browser --kiosk --noerrdialogs --disable-infobars http://pegelboard.local
```

---

## Konfiguration

Alles läuft über das **Webinterface** – kein Editieren von Config-Dateien:

| Bereich | Was lässt sich einstellen |
|---|---|
| **Pegelstationen** | Stationen suchen & hinzufügen, Warnschwellen (Erhöht / Kritisch / Alarm / HQ100) |
| **Karte** | Standort, Regenradar-Layer, Hubschrauber-Tracking |
| **Warnungen** | NINA-Gemeindeschlüssel (AGS), DWD-Regionsfilter |
| **Darstellung** | Hell-/Dunkel-Modus, Warnfarben, Logo, Tagesnachricht |
| **Einsatzbetrieb** | Einsatzmittel, AAO-Matrix, Fahrzeug-Icons hochladen |
| **GPIO** | Signalturm-Pins, Schwellwerte |
| **API-Keys** | OpenSky (Heli-Tracking), RSS-Feed-URL |

---

## Datenquellen

Alle Kerndaten funktionieren **ohne API-Key**:

| Quelle | Daten | API-Key? |
|---|---|---|
| [PEGELONLINE](https://www.pegelonline.wsv.de) | Pegelstände, Wassertemperatur, Verlauf | ❌ |
| [Bright Sky](https://brightsky.dev) | Aktuelles Wetter, 24h-Vorhersage (DWD) | ❌ |
| [DWD OpenData](https://opendata.dwd.de) | Wetterwarnungen | ❌ |
| [NINA / MoWaS](https://warnung.bund.de) | Bevölkerungsschutzwarnungen | ❌ |
| [RainViewer](https://www.rainviewer.com/api.html) | Regenradar-Overlay | ❌ |
| [OpenSky Network](https://opensky-network.org) | Hubschrauber-Tracking | optional |

---

## Technischer Stack

| | |
|---|---|
| **Frontend** | React 19 · Vite · TailwindCSS v4 · Framer Motion · Recharts · Leaflet |
| **Backend** | Node.js 26 · Fastify 5 · WebSocket · SQLite (built-in `node:sqlite`) |
| **Zielsystem** | Raspberry Pi 2b/ 3 / 4 / 5 · Kiosk-Modus |
| **Auth** | JWT-Cookies · scrypt-Hashing · vollständig lokal |

Keine Cloud-Abhängigkeiten. Keine externen Dienste außer den Datenquellen. Läuft im Netzwerk ohne Internet (soweit die Datenquellen lokal gecacht sind).

---

## Warnstufen

| Stufe | Farbe | Bedeutung |
|---|---|---|
| Normal | 🟢 Grün | Alles im Normbereich |
| Erhöht | 🟡 Gelb `#FFD200` | Aufmerksamkeit empfohlen |
| Kritisch | 🟠 Orange | Handlungsbedarf |
| Einsatz | 🔴 Rot `#E30613` | Sofortmaßnahmen, Alarmierung |

---

## Für wen ist PegelBoard?

- **DLRG-Ortsgruppen und Bezirke** mit Wasserrettungsdienst an Flüssen, Seen oder Talsperren
- **Wasserwacht-Einheiten** mit Wachbetrieb
- **Feuerwehren** mit Wasserrettungskomponente
- **Bootshäuser und Wachen** die einen dauerhaft laufenden Lagebild-Monitor brauchen

---

## Lizenz

GPL v3

---


