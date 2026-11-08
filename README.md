# 🎚️ Audiomixpult - DIY Arduino Lautstärkemixer

Ein Hardware-Lautstärkemixer für Windows auf Basis eines Arduino Nano V3 und des [deej](https://github.com/omriharel/deej)-Projekts. Mit fünf Schiebereglern steuerst du die Lautstärke einzelner Anwendungen (Discord, Spotify, Browser, Spiele ...) oder die Master-Lautstärke.

![Arduino Nano](https://img.shields.io/badge/Arduino-Nano%20V3-00979D?logo=arduino)
![License](https://img.shields.io/badge/License-MIT-green)

## 📋 Was ist das?

Der Arduino liest fünf Potentiometer aus und schickt die Werte über USB (seriell) an den PC. Das Original-Programm **deej** setzt daraus die Lautstärke der zugeordneten Programme. Dieses Repo enthält:

- den **Arduino-Sketch** (`audiomixer/audiomixer.ino`), kompatibel zum deej-Protokoll,
- eine **Beispiel-Konfiguration** für deej (`config-example.yaml`),
- Hardware-Doku und Einkaufsliste (`docs/`),
- eine eigene **Desktop-App** (`mixer-app/`) als Alternative, siehe unten. Empfohlen wird weiterhin deej.

**Was der Sketch gegenüber dem deej-Original macht:**
- Glättung der Analogwerte (gleitender Mittelwert über 4 Messungen), das reduziert Zittern.
- Werte nahe an den Anschlägen rasten auf 0 bzw. 1023 ein, damit 0 % und 100 % wirklich erreicht werden.
- Einzelne Regler lassen sich per `INVERT[]` im Sketch umkehren, falls ein Poti andersherum verdrahtet ist.
- Gesendet wird dauerhaft (wie im Original), damit deej nach Start, Reconnect oder Config-Reload sofort alle Reglerstellungen kennt.

## 🛠️ Benötigte Hardware

| Komponente | Anzahl | Beschreibung |
|------------|--------|--------------|
| Arduino Nano V3 | 1x | Mit CH340-USB-Chip (Klon) |
| Schiebepotentiometer 10kΩ | 5x | Linear |
| Dupont Jumperkabel oder Litze | 1x Set | zum Verbinden |
| USB-Kabel | 1x | Mini-USB, mit Datenleitungen |
| Gehäuse | 1x | Optional: 3D-gedruckt oder selbstgebaut |

Mehr dazu in [docs/HARDWARE.md](docs/HARDWARE.md) und [docs/EINKAUFSLISTE.md](docs/EINKAUFSLISTE.md).

## 🔌 Anschlussplan

```
Regler 1 (Schleifer / OTA) -> Arduino A0
Regler 2 (Schleifer / OTA) -> Arduino A1
Regler 3 (Schleifer / OTA) -> Arduino A2
Regler 4 (Schleifer / OTA) -> Arduino A3
Regler 5 (Schleifer / OTA) -> Arduino A4

Alle Potis: Außenanschluss 1 -> 5V, Außenanschluss 2 -> GND
```

Die Reihenfolge der Pins am Poti ist herstellerabhängig. Läuft ein Regler "falsch herum", tausche 5V und GND an diesem Poti oder setze den Eintrag in `INVERT[]` im Sketch (siehe unten).

## 📥 Installation & Setup

### 1. CH340-Treiber

Ein Nano-Klon braucht den CH340/CH341-Treiber von WCH: [wch-ic.com/downloads/CH341SER_EXE.html](https://www.wch-ic.com/downloads/CH341SER_EXE.html). Danach erscheint der Nano im Gerätemanager unter "Anschlüsse (COM & LPT)" als `USB-SERIAL CH340 (COMx)`.

> **Hinweis:** Bei einem Testaufbau mit dem WCH-Treiber **3.9.2024.9** verband deej nicht (der Treiber meldete bei der Port-Einstellung Fehler 31, "Gerät funktioniert nicht"). Mit dem älteren Treiber **3.5.2019.1** lief alles. Siehe Troubleshooting.

### 2. Sketch auf den Arduino laden

**Mit der Arduino IDE:**

1. Arduino Nano per USB anschließen.
2. `audiomixer/audiomixer.ino` öffnen.
3. **Werkzeuge → Board**: *Arduino Nano*
4. **Werkzeuge → Prozessor**: *ATmega328P (Old Bootloader)*
5. **Werkzeuge → Port**: den COM-Port des Nano wählen.
6. **Hochladen** (→). Schlägt der Upload mit `stk500_getsync` fehl, probiere *ATmega328P* ohne "Old Bootloader".

**Mit arduino-cli** (alternativ):

```powershell
arduino-cli compile --fqbn arduino:avr:nano:cpu=atmega328old audiomixer
arduino-cli upload -p COM6 --fqbn arduino:avr:nano:cpu=atmega328old audiomixer
```

Der Upload funktioniert nur, wenn der COM-Port frei ist (deej beenden, Serial Monitor schließen).

### 3. Sketch testen (Serial Monitor)

1. Serial Monitor öffnen, **9600 Baud**.
2. Es laufen fortlaufend Zeilen wie `0|240|1023|0|483`, jeweils 5 Werte von 0 bis 1023.
3. Regler ganz in die eine Richtung: `0`, ganz in die andere: `1023`. Alle fünf sollen gleichsinnig laufen.
4. Serial Monitor wieder schließen, sonst kann deej den Port nicht öffnen.

### 4. deej installieren

1. Aktuelle Version von [github.com/omriharel/deej/releases](https://github.com/omriharel/deej/releases) laden und in einen festen Ordner entpacken (z. B. `C:\Users\<Name>\deej`).
2. [config-example.yaml](config-example.yaml) als `config.yaml` neben `deej.exe` legen und anpassen (COM-Port, Programmnamen).
3. `deej.exe` starten. deej hat **kein Fenster**, es läuft als Symbol im Infobereich der Taskleiste (hinter dem Pfeil `^`).
4. Optional: Verknüpfung zu `deej.exe` in den Autostart legen (`Win + R`, `shell:startup`).

## ⚙️ Konfigurationsbeispiel

```yaml
slider_mapping:
  0: master                    # Regler 1: Systemlautstärke
  1: discord.exe               # Regler 2: Discord
  2: spotify.exe               # Regler 3: Spotify
  3: chrome.exe                # Regler 4: Browser
  4: deej.unmapped             # Regler 5: alles, was nicht zugeordnet ist

# COM-Port des Arduino (im Gerätemanager prüfen)
com_port: COM3

# Muss zum Sketch passen (BAUD_RATE = 9600)
baud_rate: 9600

# low, default oder high
noise_reduction: default
```

Wichtig:
- Prozessnamen mit **`.exe`** schreiben, Groß-/Kleinschreibung ist egal.
- Ein Programm erscheint für deej erst, wenn es **schon Ton ausgegeben hat**.
- `master`, `mic`, `system` und `deej.unmapped` brauchen kein `.exe`.
- Mehr Beispiele stehen in [config-example.yaml](config-example.yaml).

## 🎮 Verwendung

### Option 1: deej (empfohlen)

deej starten, Regler bewegen, fertig. Die Konfiguration steht in `config.yaml`. Bei Problemen die Datei `logs/deej-latest-run.log` neben `deej.exe` ansehen, oder deej im Terminal mit `deej.exe --verbose` starten.

### Option 2: Eigene Desktop-App

Im Ordner [mixer-app/](mixer-app/) liegt eine eigene Electron-App mit grafischer Oberfläche (Drag & Drop, Live-Anzeige der Regler, Profile, Tray). Sie speichert ihre Konfiguration, verbindet automatisch neu und setzt die Lautstärke über einen dauerhaft laufenden Helfer (Windows Core Audio). Sie ist weniger erprobt als deej und kennt weniger Ziele (kein `deej.current`, keine Gerätenamen). Details und Einschränkungen in [mixer-app/README.md](mixer-app/README.md). App und deej können den COM-Port nicht gleichzeitig nutzen.

## 📡 Serielles Protokoll

- 9600 Baud, 8N1
- Eine Zeile pro Durchlauf: `w1|w2|w3|w4|w5\r\n` mit Werten von 0 bis 1023
- Das Zeilenende muss **`\r\n`** sein (`Serial.println`), sonst verwirft deej die Zeile. deej akzeptiert nur Zeilen, die auf `^\d{1,4}(\|\d{1,4})*\r\n$` passen.
- Die Anzahl der Regler ergibt sich aus der Anzahl der Werte pro Zeile.

## 📁 Projektstruktur

```
Audiomixpult/
├── audiomixer/
│   └── audiomixer.ino      # Arduino Sketch (deej-kompatibel)
├── config-example.yaml     # Beispielkonfiguration für deej
├── docs/
│   ├── HARDWARE.md         # Pinbelegung, Verkabelung, Fehlersuche
│   └── EINKAUFSLISTE.md    # Einkaufsliste
├── mixer-app/              # Electron-App (Alternative zu deej)
│   ├── main.js, preload.js, renderer.js, serial.js, volume.js, audio.js, config.js
│   ├── index.html, styles.css, test/
│   ├── package.json
│   ├── assets/             # Icons, Audio-Helfer (PowerShell)
│   ├── README.md, QUICKSTART.md, INSTALLATION.md
├── CLAUDE.md               # Notizen für die Arbeit mit Claude Code
├── LICENSE
└── README.md               # Diese Datei
```

## 🐛 Troubleshooting

### Arduino wird nicht erkannt
- CH340-Treiber installieren (siehe oben).
- Anderes USB-Kabel versuchen (manche laden nur), anderen USB-Port versuchen.

### Upload schlägt fehl
- `Zugriff verweigert`: Der Port ist belegt. Serial Monitor, deej, die Electron-App und ggf. die IDE-Hilfsprozesse beenden.
- `stk500_getsync`: Prozessor ohne "Old Bootloader" probieren.
- Falscher Port: Der Nano erscheint als `USB-SERIAL CH340`. Alte, nicht mehr angeschlossene Einträge (Geister-Ports) im Gerätemanager unter "Ausgeblendete Geräte anzeigen" ignorieren oder deinstallieren.

### deej startet nicht oder verbindet nicht
- deej hat kein Fenster. Es läuft als Symbol im Infobereich der Taskleiste. Prüfe `logs/deej-latest-run.log` neben `deej.exe`.
- `Can't connect to COMx! This serial port is busy`: Ein anderes Programm hält den Port (Serial Monitor, Arduino IDE, zweite deej-Instanz).
- `A device attached to the system is not functioning` im Log: Das ist ein Treiberproblem. Erscheint der Port zwar, lässt sich aber von deej nicht öffnen, ist der CH340-Treiber (z. B. 3.9.2024.9) die wahrscheinliche Ursache. Den Treiber auf eine ältere Version wechseln, z. B. 3.5.2019.1: im Gerätemanager die CH340-Geräte inkl. Treibersoftware deinstallieren, danach den älteren Treiber installieren (`pnputil /add-driver CH341SER.INF /install` in einer Administrator-PowerShell).
- Die COM-Nummer kann sich beim Treiberwechsel oder an einem anderen USB-Port ändern. Dann `com_port` in der `config.yaml` anpassen.

### Regler reagieren nicht
- COM-Port in `config.yaml` prüfen.
- Im Serial Monitor prüfen, ob alle fünf Werte kommen (siehe Schritt 3). Zeigen Regler dort immer `1023` oder `0`, liegt es an der Verkabelung (fehlende Masse, falscher Pin).

### Regler laufen falsch herum
- Einzelner Regler: `INVERT[]` im Sketch anpassen oder am Poti 5V und GND tauschen.
- Alle Regler: `invert_sliders: true` in der `config.yaml`.

### Regler sind zittrig/springen
- `noise_reduction: high` in der `config.yaml` setzen.
- `NUM_READINGS` oder `SNAP_MARGIN` im Sketch erhöhen.

### deej findet keine Anwendung
- Programm muss schon Ton ausgegeben haben.
- Prozessnamen mit `.exe` schreiben (Task-Manager → Details).

## 🔧 Code-Anpassungen

Alle Einstellungen stehen oben im Sketch `audiomixer/audiomixer.ino`:

```cpp
const int NUM_SLIDERS = 5;                                  // Anzahl der Regler
const int ANALOG_PINS[NUM_SLIDERS] = {A0, A1, A2, A3, A4};  // Pins
const bool INVERT[NUM_SLIDERS] = {true, true, true, true, true};  // Regler umkehren
const int NUM_READINGS = 4;    // Glättung (1 = aus)
const int SNAP_MARGIN = 3;     // Einrasten an den Anschlägen
```

## 🤝 Beitragen

Beiträge sind willkommen:
1. Repository forken
2. Branch anlegen (`git checkout -b feature/MeineIdee`)
3. Änderungen committen
4. Pushen und Pull Request öffnen

## 📚 Ressourcen

- [deej Original-Projekt](https://github.com/omriharel/deej)
- [Arduino Nano Dokumentation](https://docs.arduino.cc/hardware/nano)
- [3D-Gehäuse STL-Files](https://www.thingiverse.com/thing:4196719)

## 📄 Lizenz

MIT Lizenz, siehe [LICENSE](LICENSE).

## 👨‍💻 Autor

**JonasGrafKWR**
- GitHub: [@JonasGrafKWR](https://github.com/JonasGrafKWR)

## 🙏 Danksagungen

- [omriharel](https://github.com/omriharel) für das originale deej-Projekt
- Die Arduino Community
