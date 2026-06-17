
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

<p align="center">
  <img src="design/2026-05-31 PegelBoard.png" alt="PegelBoard Dashboard" width="100%" />
</p>

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
- **Pegelmarker** farbig nach Warnstufe (grün → gelb → orange → rot), inkl. Wassertemperatur
- **Regenradar** per Knopfdruck (DWD GeoServer WMS, kein API-Key nötig); optionaler 2-Stunden-Animationsloop; Deckkraft im Admin einstellbar
- **Slippstellen** als Kartenoverlay (OSM via Overpass API, 6h-Cache)
- Optionales **Hubschrauber-Tracking** via OpenSky Network 🚁 mit Klarname-Mapping
- Wählbare **Kartenstile**: Carto Dark, Carto Light, OSM Standard, Hochkontrast, Topo, Satellit, Humanitär
- **Kartenlegende** dauerhaft eingeblendet (unten links) mit allen Warnstufen

### ⚠️ Warnungen
- **NINA / MoWaS** – offizielle Bevölkerungsschutzwarnungen
- **DWD-Wetterwarnungen** – Sturm, Gewitter, Hochwasser, Starkregen
- **LHP-Hochwasserwarnungen** direkt am Pegel angezeigt
- Sortiert nach Schweregrad, farbcodiert, immer sichtbar in der Fußzeile

### 🌤️ Wetter & Wind
- Aktuelle Bedingungen via **Bright Sky** (DWD-Daten, kein API-Key nötig)
- 6-Stunden-Vorhersage im gemeinsamen Wetter-Container
- Windstärke in **Beaufort** mit animierter Kompassrose
- Sonnenauf- und -untergang in der Rechtspalte

### 🕐 Intelligente Tageszeitsteuerung
- **Automatischer Hell-/Dunkel-Wechsel** bei Sonnenauf- und -untergang
- Sonnenzeiten immer sichtbar – kein API-Key, berechnet aus dem Standort
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
- **Tagesnachricht** – Freitextnachricht im Dashboard-Header für alle Schichtdienstler sichtbar
- **Einsatzmittel** – Ressourcenliste mit Status, Klarname (Funkrufzeichen), ISSI und Icon; Namensanzeige (Kurzname oder Funkrufname) wählbar; nicht verfügbare Einheiten automatisch hervorgehoben
- **AAO-Matrix** – Alarm- und Ausrückordnung mit eigenen Fahrzeug-Icons; Position (links/rechts) und Sichtbarkeit im Admin konfigurierbar
- **Backup & Restore** – vollständiges ZIP-Backup aller Einstellungen inkl. Icons und Logo; Import per Drag-and-Drop

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
- Admin: [http://localhost:5173/admin](http://localhost:5173/admin)

Nach dem ersten Start im Admin unter **Konfiguration** den Standort (lat/lon) eintragen – dann funktionieren Sonnenzeiten, automatischer Tag/Nacht-Modus und Wetter.

---

## Standardzugangsdaten

> **Wichtig:** Das Passwort beim ersten Start sofort unter **Admin → Passwort** ändern!

| Benutzer | Passwort |
|---|---|
| `admin` | `wasser` |

Das System erkennt beim ersten Login das Standardpasswort und ersetzt den internen Platzhalter automatisch durch einen sicheren scrypt-Hash. Bis zur Änderung bleibt das Passwort `wasser` aktiv.

---

## Auf dem Raspberry Pi installieren

> **Gemessen:** Bootzeit bis Dashboard sichtbar auf einem **Raspberry Pi 3 (1 GB RAM)** ca. **1:45 min**.

```bash
# Systemabhängigkeiten (Raspberry Pi OS)
sudo apt install -y fonts-noto-color-emoji   # Emoji-Schrift für Warnmeldungen

# Projekt klonen und bauen
git clone https://github.com/dihydrogenmonoxid-ama/PegelBoard.git
cd PegelBoard
npm install
npm run build          # Backend + Frontend bauen
```

### Systemdienst einrichten

Das Repo enthält keine fertige Service-Datei. Anlegen mit:

```bash
sudo nano /etc/systemd/system/pegelboard.service
```

Inhalt (Pfade an den eigenen Nutzer und Node-Pfad anpassen – `which node` liefert den absoluten Pfad; systemd lädt kein nvm-Environment):

```ini
[Unit]
Description=PegelBoard Einsatzmonitor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=<nutzer>
WorkingDirectory=/home/<nutzer>/PegelBoard
ExecStart=/usr/bin/node /home/<nutzer>/PegelBoard/backend/dist/index.js
Environment=NODE_ENV=production
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pegelboard
journalctl -u pegelboard -f   # Logs prüfen; Port (Standard: 4000) erscheint hier
```

Das Backend läuft standardmäßig auf **Port 4000**. Im Netzwerk ist das Dashboard unter `http://<pi-ip>:4000` erreichbar. Falls Port 80 gewünscht ist, muss in der `[Service]`-Sektion `AmbientCapabilities=CAP_NET_BIND_SERVICE` und `PORT=80` ergänzt werden.

### Kiosk-Modus (Chromium fullscreen beim Booten)

```bash
# In /etc/xdg/openbox/autostart oder ~/.config/lxsession/LXDE-pi/autostart:
chromium-browser --kiosk --noerrdialogs --disable-infobars http://localhost:4000
```

---

## Konfiguration

Alles läuft über das **Webinterface** – kein Editieren von Config-Dateien:

| Bereich | Was lässt sich einstellen |
|---|---|
| **Pegelstationen** | Stationen suchen & hinzufügen, Warnschwellen (Erhöht / Kritisch / Alarm / HQ100) |
| **Karte** | Standort, Kartenstil (Dark / Light / OSM / Hochkontrast), Regenradar, Hubschrauber-Tracking |
| **Warnungen** | NINA-Gemeindeschlüssel (AGS), DWD-Regionsfilter |
| **Darstellung** | Hell-/Dunkel-Modus, Warnfarben, Logo, Tagesnachricht |
| **Einsatzbetrieb** | Einsatzmittel (inkl. Klarname), AAO-Matrix, Fahrzeug-Icons hochladen |
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
| [DWD GeoServer](https://maps.dwd.de/geoserver/web/) | Regenradar-Overlay (WMS) | ❌ |
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

## Geplante Features

- [ ] **Mehrsprachigkeit** – Übersetzungen (DE/EN)
- [ ] **Multi-Location** – mehrere Standorte / Wachbereiche umschalten
- [ ] **Push-Benachrichtigungen** – Alarmierung über NINA oder Pegelgrenzwert per Webhook
- [ ] **Tidekalender** – Gezeitenanzeige für Küstenwachen
- [ ] **Kamerabild-Integration** – Livebild einer Webcam im Dashboard
- [ ] **Exportfunktion** – Einsatzlog als PDF exportieren
- [ ] **Dark-Mode-Farbprofile** – mehrere vordefinierte Farbschemata wählbar

---

## Changelog

Die vollständige Versionshistorie befindet sich in [CHANGELOG.md](CHANGELOG.md).

### v0.4.1 – Juni 2026
- **Freshness-Badge** zeigt „Aktuell" jetzt korrekt anhand des konfigurierten Poll-Intervalls (Standard: 2 Min) statt einer hardcodierten 2-Stunden-Schwelle
- **README Raspberry Pi** – `fonts-noto-color-emoji` als Pflichtpaket ergänzt, fehlerhafter `deploy/`-Verweis durch vollständige systemd-Anleitung ersetzt, Kiosk-URL auf Port 4000 korrigiert, Bootzeit dokumentiert (ca. 1:45 min auf Pi 3 / 1 GB RAM)

### v0.4.0 – Mai 2026
- **Backup als ZIP** – Icons und Logo als echte Dateien im Archiv, nicht als Base64 eingebettet
- **AAO deaktivierbar** – Toggle im Admin blendet das AAO-Widget auf dem Dashboard aus
- **Warnungsquellen-Badge** – NINA / DWD / LHP wird als Pill-Badge je Warnung angezeigt
- **Nachrichten als Stichpunkte** – Bullet-Point-Format mit fett hervorgehobener Uhrzeit
- **Einsatzmittel außer Dienst** – Widget blendet sich automatisch aus, wenn alle verfügbar sind
- Admin-UI kompakter, Dashboard-Widgets verfeinert (Sparklines, Abstände, Typografie)

### v0.3.0 – Mai 2026
- **Regenradar (DWD WMS)** – Vollständige Überarbeitung, BBOX-basiert, kein Zoom-Problem
- **Radar-Animation** – 2-Stunden-Loop mit Opacity-Crossfade
- **Slippstellen (OSM)** – Bootsrampen via Overpass API als Kartenoverlay
- **Erweiterte Kartenstile** – Topo, Satellit, Humanitär
- **Kartenlegende**, **AAO-Position wählbar**, **Einsatzmittel-Bezeichnung**

### v0.2.0 – Mai 2026
- Tagesnachricht, Regenradar, Kartenstile, Klarname-Mapping, AAO-Rechtspalte

### v0.1.0 – April 2026
- Erstveröffentlichung: Pegelstände, Wetter, Warnungen, Karte, GPIO, Einsatzbetrieb

---

## Lizenz

GPL v3

---
