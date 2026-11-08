# Audiomixpult Control - Electron-App

Eine Desktop-App, die die Werte des Arduino-Mixers über `serialport` liest und die Windows-Lautstärke über einen dauerhaft laufenden PowerShell-Helfer (WASAPI) setzt. Alternative zum Original-**deej** (siehe [Haupt-README](../README.md)).

> **Status:** Läuft, ist aber weniger erprobt als deej. deej bleibt die Empfehlung für den Alltag. Die App kennt weniger Ziele (kein `deej.current`, keine Gerätenamen).

## Was die App kann

- Die fünf Reglerwerte live anzeigen
- Verbindung zum Arduino über einen COM-Port, **verbindet beim Start automatisch neu** und stellt die Verbindung bei Abbruch wieder her
- Programme mit Audio-Session in einer Liste anzeigen und per Drag & Drop einem Regler zuordnen
- Ziele: `Master`, `Mikrofon`, `Systemklänge` oder ein Programm (z. B. `spotify.exe`)
- **Konfiguration wird gespeichert** (COM-Port, Zuordnungen, Namen, Profile)
- Vier Profile (Standard, Gaming, Streaming, Office): "Profil speichern" legt die aktuelle Zuordnung ab, beim Wechsel wird sie geladen
- Tray-Symbol: Schließen des Fensters blendet es aus, die App läuft weiter (abschaltbar unter "In Taskleiste minimieren")
- Autostart über die Einstellungen (nur in der gebauten App)
- Nur eine Instanz gleichzeitig. Ein zweiter Start zeigt das Fenster wieder.

## So setzt die App die Lautstärke

- Ein einziger PowerShell-Prozess (`assets/audio-helper.ps1`) spricht mit der Windows-Audio-Schnittstelle. Er bekommt Befehle als JSON-Zeilen und wird bei einem Absturz neu gestartet. NirCmd wird nicht mehr benötigt.
- Reglerwerte werden gebündelt (alle ca. 30 ms). **Der letzte Wert geht nie verloren.** Schlägt ein Befehl fehl oder läuft das Zielprogramm noch nicht, wird der Wert später erneut gesetzt.
- Werte nahe an den Anschlägen rasten auf 0 % bzw. 100 % ein, kleines Zittern (unter ca. 0,6 %) wird ignoriert.

## Bekannte Einschränkungen

- Ein Programm erscheint erst, wenn es schon Ton ausgegeben hat (wie bei deej).
- Kein `deej.current`, `deej.unmapped` oder Gerätename als Ziel.
- Die Installer (`npm run build:win`) sind nicht code-signiert. Der Autostart und das Entpacken des Audio-Helfers (`asarUnpack`) sind **nur in der Entwicklung getestet, nicht in der gebauten App**.
- Die App und deej können den COM-Port **nicht gleichzeitig** öffnen. Vor dem Start der App deej beenden (und umgekehrt). Ist der Port belegt, zeigt die App "Port belegt" und versucht es alle 3 Sekunden erneut.

## Zusammenspiel mit dem Sketch

Der Sketch (`audiomixer/audiomixer.ino`) sendet Zeilen `w1|w2|w3|w4|w5\r\n` mit Werten von 0 bis 1023 und kehrt Regler selbst um (`INVERT[]`). Die App invertiert nichts.

## Starten (Entwicklung)

Voraussetzung: Node.js (v18 oder höher).

```powershell
cd mixer-app
npm install
npm start
```

`npm run dev` startet zusätzlich die DevTools. Tests: `npm test`.

## Windows-Installer bauen (optional)

```powershell
npm run build:win
```

Das erzeugt Installer und Portable-Version im lokalen Ordner `dist/` (nicht im Repo).

## Konfiguration

Die Konfiguration liegt unter `%APPDATA%\audiomixpult-control\config.json`. Eine beschädigte Datei wird als `config.json.defekt` gesichert und durch Standardwerte ersetzt.

## Projektstruktur

```
mixer-app/
├── main.js          # Electron Main Process: Fenster, Tray, IPC, Zusammenspiel
├── preload.js       # Sichere Brücke zur Oberfläche (contextBridge)
├── renderer.js      # Oberfläche, Drag & Drop (ohne Node-Zugriff, ohne innerHTML)
├── serial.js        # Serielle Verbindung mit Auto-Reconnect, Zeilenparser
├── volume.js        # Reglerwerte -> Lautstärke (Bündeln, Einrasten, Wiederholen)
├── audio.js         # Anbindung an den dauerhaften PowerShell-Helfer
├── config.js        # Konfiguration laden/speichern/prüfen
├── index.html, styles.css
├── test/            # Unit-Tests (npm test)
├── package.json
└── assets/          # Icons, audio-helper.ps1 (nircmd.exe liegt noch im Repo, wird nicht mehr benutzt)
```

## Sicherheit

Die Oberfläche läuft mit `contextIsolation`, `sandbox` und ohne `nodeIntegration`. Sie darf nur die Kanäle aus `preload.js` benutzen. Programmnamen und Reglernamen werden nur als Text eingefügt, externe Links öffnet der Hauptprozess über eine feste Liste.

## IPC-Kanäle

- Main → Renderer: `slider-values`, `connection-status`
- Renderer → Main: `load-config`, `save-config`, `get-status`, `list-ports`, `connect-arduino`, `get-audio-sessions`, `get-autostart`, `set-autostart`, `open-external`

## Lizenz

MIT, siehe [LICENSE](../LICENSE).
