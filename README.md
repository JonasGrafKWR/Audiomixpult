# 🎚️ Audiomixpult - DIY Arduino Lautstärkemixer

Ein verbesserter Hardware-Lautstärkemixer basierend auf Arduino Nano V3 und dem DEEJ-Projekt. Steuere die Lautstärke einzelner Anwendungen auf deinem PC mit physischen Schiebereglern!

![Arduino Nano](https://img.shields.io/badge/Arduino-Nano%20V3-00979D?logo=arduino)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Active-success)

## 📋 Was ist das?

Dieses Projekt ermöglicht es dir, die Lautstärke verschiedener Anwendungen (Discord, Spotify, Browser, Games, etc.) auf deinem Windows- oder Linux-PC mit physischen Reglern zu steuern - wie ein DJ-Mischpult! Kein lästiges Alt-Tabbing mehr, um die Lautstärke anzupassen.

**Verbesserungen gegenüber dem Original:**
- ✅ Optimierte Analogwert-Glättung gegen Rauschen
- ✅ Intelligente Änderungserkennung (spart CPU)
- ✅ Sauberer, gut dokumentierter Code
- ✅ Einfache Konfiguration
- ✅ Niedrigere Latenz

## 🛠️ Benötigte Hardware

| Komponente | Anzahl | Beschreibung |
|------------|--------|--------------|
| Arduino Nano V3 | 1x | Mit CH340G USB-Chip |
| Schiebepotentiometer 10kΩ | 5x | Linear, 2-fach |
| Dupont Jumperkabel | 1x Set | Buchse-Buchse, 20cm |
| USB-Kabel | 1x | Mini-USB für Arduino Nano |
| Gehäuse | 1x | Optional: 3D-gedruckt oder selbstgebaut |

**Geschätzte Kosten:** ~20-30€

## 🔌 Anschlussplan

```
Potentiometer 1 (OTA) -> Arduino A0
Potentiometer 2 (OTA) -> Arduino A1  
Potentiometer 3 (OTA) -> Arduino A2
Potentiometer 4 (OTA) -> Arduino A3
Potentiometer 5 (OTA) -> Arduino A4

Alle VCC zusammen   -> Arduino 5V
Alle GND zusammen   -> Arduino GND
```

**Pinbelegung Schiebepotentiometer:**
- **VCC**: Versorgungsspannung (5V)
- **GND**: Masse
- **OTA**: Ausgang (Signal zum Arduino)

### Schaltplan

```
         5V                    GND
          │                     │
          ├──────┬──────┬───────┼──────┬───────┐
          │      │      │       │      │       │
        [Poti1][Poti2][Poti3][Poti4][Poti5]
          │      │      │       │      │       
          A0     A1     A2      A3     A4
          └──────┴──────┴───────┴──────┴────> Arduino Nano
```

## 📥 Installation & Setup

### 1. Arduino IDE installieren

Download: [https://www.arduino.cc/en/software](https://www.arduino.cc/en/software)

### 2. Code auf Arduino laden

1. Arduino Nano via USB an PC anschließen
2. Arduino IDE öffnen
3. Datei `audiomixer.ino` öffnen
4. **Tools** → **Board** → **Arduino Nano** auswählen
5. **Tools** → **Processor** → **ATmega328P (Old Bootloader)** auswählen
6. **Tools** → **Port** → COM-Port auswählen (z.B. COM3)
7. Auf den **Upload-Button** (→) klicken

> **Hinweis:** Falls Upload fehlschlägt, versuche "ATmega328P" statt "Old Bootloader"

### 3. DEEJ Software installieren

1. Download der neuesten Version: [https://github.com/omriharel/deej/releases](https://github.com/omriharel/deej/releases)
2. ZIP-Datei entpacken
3. `deej.exe` starten
4. Icon erscheint im System Tray

### 4. Konfiguration

1. Rechtsklick auf DEEJ Icon im System Tray → **"Edit config"**
2. `config.yaml` anpassen (siehe [config-example.yaml](config-example.yaml))
3. COM-Port eintragen (siehe Gerätemanager)
4. Anwendungen den Slidern zuordnen
5. DEEJ neustarten

## ⚙️ Konfigurationsbeispiel

```yaml
slider_mapping:
  0: master                    # Regler 1: Systemlautstärke
  1: discord                   # Regler 2: Discord
  2: spotify                   # Regler 3: Spotify
  3: chrome                    # Regler 4: Browser
  4: deej.unmapped            # Regler 5: Nicht zugeordnet

# COM-Port des Arduino (im Gerätemanager prüfen)
com_port: COM3

# Keine Änderung nötig
process_refresh_frequency: 5
```

**Tipp:** Du kannst auch Geräte wie Mikrofon oder Lautsprecher zuordnen!

## 🎮 Verwendung

### Option 1: Mit DEEJ Software (Original)

1. DEEJ Software starten
2. Arduino an USB anschließen
3. Regler bewegen - fertig! 🎉

Die Software läuft im Hintergrund und passt die Lautstärke automatisch an.

### Option 2: Mit Electron App (Neu! 🆕)

**Moderne Desktop-App mit grafischer Oberfläche!**

Features:
- 🎨 Schöne, moderne UI
- 🖱️ Drag & Drop von Programmen
- 📊 Live-Visualisierung der Regler
- 💾 Profile speichern (Gaming, Office, etc.)
- 🌙 Dark Mode

**Installation:**

```powershell
cd mixer-app
npm install
npm start
```

Mehr Infos: [mixer-app/README.md](mixer-app/README.md)

## 📁 Projektstruktur

```
Audiomixpult/
├── audiomixer.ino          # Arduino Sketch (Hauptcode)
├── config-example.yaml     # Beispielkonfiguration für DEEJ
├── README.md               # Diese Datei
├── mixer-app/              # 🆕 Electron Desktop App
│   ├── main.js            # Backend-Logik
│   ├── index.html         # UI
│   ├── styles.css         # Styling
│   ├── renderer.js        # Frontend-Logik
│   └── README.md          # App-Dokumentation
└── docs/                   # Zusätzliche Dokumentation
    ├── HARDWARE.md         # Hardware-Details
    └── EINKAUFSLISTE.md    # Shopping-Liste
```

## 🐛 Troubleshooting

### Arduino wird nicht erkannt
- CH340G Treiber installieren: [Download](http://www.wch.cn/downloads/CH341SER_ZIP.html)
- Anderes USB-Kabel versuchen
- Anderen USB-Port versuchen

### Regler reagieren nicht
- COM-Port in `config.yaml` prüfen
- Arduino Code neu hochladen
- Verkabelung prüfen (VCC, GND, OTA-Pins)

### Regler sind zittrig/springen
- Normale Softwareversion nutzt bereits Glättung
- Falls Probleme: `NOISE_THRESHOLD` in `.ino` erhöhen

### DEEJ findet keine Anwendungen
- Anwendung muss Audio abspielen
- Prozessnamen überprüfen (Klein-/Großschreibung beachten)
- `process_refresh_frequency` in config erhöhen

## 🔧 Code-Anpassungen

### Anzahl der Regler ändern

In `audiomixer.ino`:
```cpp
const int NUM_SLIDERS = 5;  // Auf gewünschte Anzahl ändern
const int ANALOG_PINS[NUM_SLIDERS] = {A0, A1, A2, A3, A4};  // Pins anpassen
```

### Einfache Version ohne Glättung

Für minimale Latenz (aber mit mehr Rauschen):
1. `loop()` Funktion auskommentieren
2. `loop_simple()` in `loop()` umbenennen

## 🤝 Beitragen

Beiträge sind willkommen! 
1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📚 Ressourcen

- [DEEJ Original Projekt](https://github.com/omriharel/deej)
- [Arduino Nano Dokumentation](https://docs.arduino.cc/hardware/nano)
- [3D-Gehäuse STL-Files](https://www.thingiverse.com/thing:4196719)

## 📄 Lizenz

Dieses Projekt steht unter der MIT Lizenz - siehe [LICENSE](LICENSE) für Details.

## 👨‍💻 Autor

**JonasGrafKWR**
- GitHub: [@JonasGrafKWR](https://github.com/JonasGrafKWR)

## 🙏 Danksagungen

- [omriharel](https://github.com/omriharel) für das originale DEEJ-Projekt
- Die Arduino Community

---

**Viel Spaß beim Basteln! 🎚️🎵**