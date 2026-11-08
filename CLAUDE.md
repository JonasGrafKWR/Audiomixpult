# Audiomixpult

DIY-Hardware-Lautstärkemixer für Windows: Arduino Nano V3 liest 5 Schiebepotis und sendet die Werte seriell an den PC. Die Lautstärke setzt das Original-**deej** (https://github.com/omriharel/deej). Die Electron-App in `mixer-app/` ist ein experimenteller, nicht gepflegter Ersatz.

## Hardware

- Arduino Nano V3, CH340 (Klon), ATmega328P, **Old Bootloader**
- 5x 10 kΩ lineare Schiebepotis an **A0-A4** (Schleifer), 5V/GND gemeinsam
- Aktuell laufen alle fünf Regler "falsch herum" und werden im Sketch per `INVERT[]` umgekehrt
- Hinweis: A4/A5 sind beim Nano die I2C-Pins (relevant für ein Display)

## Dateien

- `audiomixer/audiomixer.ino`: Sketch (Einstellungen oben: `NUM_SLIDERS`, `ANALOG_PINS`, `INVERT`, `NUM_READINGS`, `SNAP_MARGIN`)
- `config-example.yaml`: Beispiel-Config für deej
- `docs/`: Hardware-Doku, Einkaufsliste
- `mixer-app/`: Electron-App (experimentell, bekannte Fehler siehe `mixer-app/README.md`)

## Serielles Protokoll (deej-kompatibel)

- 9600 Baud, 8N1
- Eine Zeile pro Durchlauf: `w1|w2|w3|w4|w5\r\n`, Werte 0-1023, dauerhaft gesendet (ca. alle 10 ms)
- Zeilenende **muss `\r\n` sein** (`Serial.println`). deej verwirft alles, was nicht auf `^\d{1,4}(\|\d{1,4})*\r\n$` passt.
- Nicht nur bei Änderung senden: deej braucht nach Start/Reconnect/Config-Reload sofort alle Werte.
- Die Glättung (gleitender Mittelwert) und das Einrasten an 0/1023 gehören in den Sketch, die Inversion einzelner Regler auch (nicht in die PC-Software).

## Test-Workflow

1. Sketch kompilieren/hochladen (Arduino IDE: Board *Arduino Nano*, Prozessor *ATmega328P (Old Bootloader)*; oder `arduino-cli`, FQBN `arduino:avr:nano:cpu=atmega328old`).
2. Serial Monitor, 9600 Baud: fünf Werte pro Zeile, unten `0`, oben `1023`, alle Regler gleichsinnig. Danach den Monitor **schließen**.
3. deej starten (`deej.exe`, Tray-App ohne Fenster). Für Debug-Ausgabe `deej.exe --verbose`. Log: `logs\deej-latest-run.log` neben `deej.exe`. Erwartet: `Connected`, `Detected sliders amount=5`.
4. Hörtest: Programm mit Ton laufen lassen, Regler bewegen. Nicht laufende Programme haben für deej keine Audio-Session.

## Stolpersteine (Umgebung)

- **Ein Programm pro COM-Port:** Serial Monitor, Arduino IDE (Hilfsprozess `serial-monitor`), deej und die Electron-App blockieren sich gegenseitig. Fehler: `Zugriff verweigert` / `Serial port seems busy`.
- **CH340-Treiber:** Mit WCH-Treiber 3.9.2024.9 scheiterte deej (SetCommState Fehler 31, "Gerät funktioniert nicht"). Mit 3.5.2019.1 funktioniert alles. Nach einem Treiberwechsel kann sich die COM-Nummer ändern, dann `com_port` in der deej-`config.yaml` anpassen.
- **deej-Config:** Prozessnamen mit `.exe` (case-insensitive), `noise_reduction` nur `low`/`default`/`high`, `invert_sliders` kehrt alle Regler um. Es gibt kein `process_refresh_frequency` und kein `log_level`.
- `arduino-cli` ist nicht fest installiert. Bei Bedarf als Portable-ZIP außerhalb des Repos nutzen. Der AVR-Core liegt in `%LOCALAPPDATA%\Arduino15`.
- Der Ordner `audiomixer/.theia/` entsteht durch die Arduino IDE und ist ignoriert.

## Konventionen

- Sprache: Deutsch (Doku, Code-Kommentare, Commit-Messages)
- Arbeit auf Branches, kleine Commits, **nichts auf `main` pushen**
- Keine neuen Binärdateien einchecken (die vorhandenen NirCmd-Dateien in `mixer-app/assets/` bleiben)
- Keine globalen Installationen ohne Rückfrage
