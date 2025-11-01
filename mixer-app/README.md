# Audiomixpult Control - Electron App

Moderne Desktop-Anwendung zur Steuerung deines Arduino Audio-Mixers.

## ✨ Features

- 🎚️ **Visuelle Regler-Darstellung** - Sieh die Lautstärke in Echtzeit
- 🖱️ **Drag & Drop** - Ziehe Programme einfach auf die Regler
- 📊 **Live-Feedback** - Arduino-Werte werden live angezeigt
- 🔌 **Auto-Detection** - Automatische COM-Port-Erkennung
- 💾 **Profile** - Speichere verschiedene Setups (Gaming, Office, etc.)
- 🌙 **Dark Mode** - Modernes, dunkles Design
- 📱 **System Tray** - Läuft im Hintergrund

## 🚀 Installation

### Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn
- Arduino Nano mit Audiomixer-Code

### Setup

1. **Abhängigkeiten installieren:**

```powershell
cd mixer-app
npm install
```

2. **App starten:**

```powershell
npm start
```

### Development Mode

```powershell
npm run dev
```

## 📦 App bauen

### Windows Installer erstellen:

```powershell
npm run build:win
```

Dies erstellt:
- `dist/Audiomixpult Control Setup.exe` - Installer
- `dist/Audiomixpult Control.exe` - Portable Version

## 🎮 Benutzung

### 1. Arduino verbinden

1. Starte die App
2. Klicke auf **⚙️ Einstellungen**
3. Wähle deinen COM-Port aus
4. Klicke auf **Verbinden**

### 2. Programme zuordnen

1. **Drag & Drop:**
   - Ziehe ein Programm aus der linken Sidebar
   - Lasse es auf einem Regler fallen

2. **System-Controls:**
   - Master Volume: Gesamt-Lautstärke
   - Mikrofon: Mikrofon-Pegel

### 3. Profile speichern

1. Konfiguriere deine Regler
2. Gehe zu Einstellungen → Profile
3. Wähle ein Profil oder erstelle ein neues
4. Klicke auf **Profil speichern**

## 🛠️ Entwicklung

### Projekt-Struktur

```
mixer-app/
├── main.js              # Electron Main Process
├── index.html           # UI Layout
├── styles.css           # Styling
├── renderer.js          # Frontend Logic
├── package.json         # Dependencies
└── assets/              # Icons, Images
```

### Wichtige Dateien

- **main.js**: Backend-Logik, IPC-Handler, Serial Communication
- **renderer.js**: Frontend-Logik, Drag & Drop, UI Updates
- **styles.css**: Modernes Dark Theme Design

## 🔧 Konfiguration

Die App speichert die Konfiguration automatisch:
- Windows: `%APPDATA%/audiomixpult-control/config.json`
- Beinhaltet: COM-Port, Slider-Zuordnungen, Profile

## 📚 API

### IPC Channels

#### Main → Renderer
- `slider-values`: Arduino-Werte (Array)
- `connection-error`: Verbindungsfehler
- `show-settings`: Einstellungen öffnen

#### Renderer → Main
- `list-ports`: COM-Ports abrufen
- `connect-arduino`: Verbindung herstellen
- `save-config`: Konfiguration speichern
- `load-config`: Konfiguration laden
- `get-audio-sessions`: Laufende Programme abrufen

## 🐛 Troubleshooting

### App startet nicht
```powershell
# Cache löschen und neu installieren
rm -r node_modules
rm package-lock.json
npm install
```

### COM-Port nicht gefunden
- Arduino anschließen
- Gerätemanager öffnen
- CH340 Treiber installieren

### Kein Audio-Control
- Windows Audio-Session-API wird verwendet
- Programme müssen Audio abspielen

## 🤝 Contributing

Verbesserungen sind willkommen!

1. Fork das Repository
2. Erstelle einen Feature Branch
3. Committe deine Änderungen
4. Push zum Branch
5. Öffne einen Pull Request

## 📄 Lizenz

MIT License - siehe [LICENSE](../LICENSE)

## 👨‍💻 Autor

**JonasGrafKWR**
- GitHub: [@JonasGrafKWR](https://github.com/JonasGrafKWR)

---

**Viel Spaß mit deinem Audio-Mixer! 🎚️🎵**
