# Audiomixpult Control - Electron-App (experimentell)

> ⚠️ **Experimentell und nicht gepflegt.** Für den Alltag wird das Original-**deej** empfohlen (siehe [Haupt-README](../README.md)). Diese App ist ein Prototyp mit bekannten Fehlern (siehe unten).

Eine Desktop-App, die die Werte des Arduino-Mixers über `serialport` liest und die Windows-Lautstärke mit **NirCmd** setzt.

## Was die App kann

- Die fünf Reglerwerte live anzeigen
- COM-Ports auflisten und mit dem Arduino verbinden
- Laufende Programme (mit Fenster) in einer Liste anzeigen und per Drag & Drop einem Regler zuordnen
- Master-Lautstärke (`nircmd setsysvolume`) und Lautstärke einzelner Programme (`nircmd setappvolume`) setzen
- Autostart per Verknüpfung im Windows-Autostart-Ordner (nur sinnvoll in der gebauten App)
- Nur eine Instanz gleichzeitig

## Was die App (noch) nicht kann

Folgendes wurde früher beschrieben, ist aber **nicht umgesetzt**:

- Profile (Gaming, Office ...) speichern. Die Oberfläche hat eine Überschrift, aber keine Funktion.
- System Tray. Der Code ist auskommentiert. Das Schließen des Fensters versteckt es nur, ohne Tray lässt es sich nicht wieder öffnen.
- Die Konfiguration (COM-Port, Zuordnungen) dauerhaft speichern. Sie liegt nur im Arbeitsspeicher und ist beim nächsten Start weg.
- `mic`, `system`, `deej.unmapped` oder Gerätenamen als Ziel (wie in deej).
- Auto-Connect und Reconnect.

## Bekannte Fehler

- **Verlorene Reglerposition:** `setSystemVolume()` verwirft Werte, solange der Lock gesetzt ist, `applyVolumeChanges()` merkt sich den Wert aber trotzdem. Die letzte Position kann so verloren gehen.
- **Ein Prozess pro Änderung:** Jede Lautstärkeänderung startet einen neuen `nircmd`-Prozess. Mehrere laufen ungeordnet und können einen veralteten Wert hinterlassen.
- **0 % und 100 % nicht sicher erreichbar:** Änderungen unter 10 Punkten werden ignoriert.
- **Sicherheit:** Der Renderer läuft mit `nodeIntegration: true` und `contextIsolation: false`. Fenstertitel laufen per `innerHTML` in die Oberfläche. Ein Browser-Tab mit HTML im Titel könnte so Code mit Node-Rechten ausführen.
- **DevTools** öffnen immer automatisch.
- Das Zuordnen von "System Sounds" setzt eine App namens `system.exe`, das bewirkt nichts.
- Die Abhängigkeit `loudness` in der `package.json` wird nicht benutzt.

## Zusammenspiel mit dem Sketch

Der Sketch (`audiomixer/audiomixer.ino`) sendet Zeilen `w1|w2|w3|w4|w5\r\n` mit Werten von 0 bis 1023 und kehrt Regler selbst um (`INVERT[]`). Die App invertiert nichts mehr.

Die App und deej können den COM-Port **nicht gleichzeitig** öffnen. Vor dem Start der App deej beenden (und umgekehrt).

## Starten (Entwicklung)

Voraussetzung: Node.js (v18 oder höher).

```powershell
cd mixer-app
npm install
npm start
```

## Windows-Installer bauen (optional)

```powershell
npm run build:win
```

Das erzeugt Installer und Portable-Version im lokalen Ordner `dist/` (nicht im Repo).

## Projektstruktur

```
mixer-app/
├── main.js          # Electron Main Process, Serial, NirCmd
├── renderer.js      # Oberfläche, Drag & Drop
├── index.html       # Layout
├── styles.css       # Styling
├── package.json
└── assets/          # Icons, nircmd.exe, nircmdc.exe, NirCmd.chm, autostart.vbs
```

Hinweis zu `assets/nircmd.exe`: NirCmd ist ein Freeware-Programm von NirSoft. Die Dateien liegen bereits im Repo. Die Lizenzbedingungen für die Weitergabe sind nicht geprüft.

## IPC-Kanäle

- Main → Renderer: `slider-values`, `connection-error`
- Renderer → Main: `list-ports`, `connect-arduino`, `save-config`, `load-config`, `get-audio-sessions`, `get-autostart`, `set-autostart`

## Lizenz

MIT, siehe [LICENSE](../LICENSE).
