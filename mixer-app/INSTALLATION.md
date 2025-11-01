# 🎚️ Audiomixpult Control - Installation

## Windows Installer erstellen

### Voraussetzungen
- Node.js installiert
- Alle Dependencies installiert (`npm install`)

### Installer bauen

```powershell
cd C:\Users\Jonas\Audiomixpult\mixer-app
npm run build:win
```

Das erstellt zwei Installer-Varianten in `dist/`:

1. **NSIS Installer** (`Audiomixpult Control Setup 1.0.0.exe`)
   - Vollständiger Windows-Installer
   - Erstellt Startmenü-Einträge
   - Erstellt Desktop-Verknüpfung
   - Deinstallations-Programm enthalten
   - Installationspfad wählbar

2. **Portable Version** (`Audiomixpult Control 1.0.0.exe`)
   - Keine Installation nötig
   - Direkt ausführbar
   - Ideal für USB-Stick

## Features der App

### ✅ Vollständige Windows-Integration

- **Startmenü**: App erscheint in Windows-Suche als "Audiomixpult Control"
- **Desktop-Icon**: Verknüpfung auf dem Desktop nach Installation
- **Autostart**: Optional mit Windows starten (in Einstellungen aktivierbar)
- **Taskleiste**: App erscheint in der Taskleiste
- **Single Instance**: Verhindert mehrfache App-Starts

### 🎛️ Features

- 5 Arduino-gesteuerte Lautstärkeregler
- Drag & Drop Programm-Zuweisung
- Automatische Programm-Erkennung
- System-Lautstärke-Steuerung (Master-Kanal)
- Profile für verschiedene Nutzungsszenarien
- Moderne Dark-Theme UI
- Echtzeit Arduino-Datenvisualisierung

### 🔧 Einstellungen

- COM-Port-Auswahl für Arduino
- Autostart mit Windows
- Minimierung in Taskleiste
- Profil-Verwaltung (Gaming, Streaming, Office)

## Nach der Installation

### 1. Arduino anschließen
- Arduino Nano V3 per USB verbinden
- Warten bis CH340-Treiber erkannt

### 2. App starten
- Windows-Suche: "Audiomixpult" eingeben
- Oder Desktop-Icon doppelklicken
- Oder im Startmenü unter "Audiomixpult Control"

### 3. Verbinden
- Einstellungen öffnen (⚙️ Symbol)
- COM-Port auswählen (z.B. COM3)
- "Verbinden" klicken

### 4. Programme zuweisen
- Sidebar zeigt alle laufenden Programme
- Programm per Drag & Drop auf Slider ziehen
- Regler bewegen = Lautstärke ändern

## Autostart aktivieren

1. App öffnen
2. Einstellungen (⚙️) öffnen
3. "Allgemeine Einstellungen"
4. ✅ "Mit Windows starten" aktivieren
5. Fertig! App startet ab jetzt automatisch

Die Verknüpfung wird erstellt in:
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
```

## Deinstallation

### Via Windows Einstellungen:
1. Windows-Einstellungen öffnen
2. Apps → Installierte Apps
3. "Audiomixpult Control" suchen
4. Deinstallieren

### Via Systemsteuerung:
1. Systemsteuerung → Programme und Features
2. "Audiomixpult Control" auswählen
3. Deinstallieren

## Troubleshooting

### App erscheint nicht in Windows-Suche
- Nach Installation PC neu starten
- Suchindex aktualisieren (Windows-Einstellungen → Suche)

### Arduino nicht erkannt
- CH340 Treiber installieren
- USB-Kabel abziehen und neu einstecken
- Anderen USB-Port versuchen

### Lautstärke ändert sich nicht
- Nur Master-Slider (Slider 1) steuert aktuell System-Lautstärke
- Weitere Potentiometer müssen physisch angeschlossen sein (A0-A3)

## Systemanforderungen

- **OS**: Windows 10/11 (64-bit)
- **RAM**: Minimum 4GB
- **Festplatte**: 200MB freier Speicher
- **Hardware**: Arduino Nano V3 mit CH340 USB-Chip
- **.NET Framework**: 4.7.2 oder höher (normalerweise vorinstalliert)

## Lizenz

MIT License - siehe LICENSE Datei im Repository
