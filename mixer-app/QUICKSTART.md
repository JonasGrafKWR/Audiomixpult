# 🚀 Quick Start - Electron-App

> deej ist weiterhin die Empfehlung für den Alltag, siehe [Haupt-README](../README.md). Details und Einschränkungen der App stehen in [README.md](README.md).

## 1. Installation

PowerShell im Ordner `mixer-app` öffnen (Node.js v18 oder höher, Download: https://nodejs.org/):

```powershell
npm install
```

## 2. App starten

```powershell
npm start
```

## 3. Arduino verbinden

1. Arduino mit dem Audiomixer-Sketch per USB anschließen.
2. **deej beenden** und den Serial Monitor schließen. Der COM-Port kann nur von einem Programm geöffnet werden.
3. In der App **⚙️ Einstellungen** klicken, den **COM-Port** wählen (Gerätemanager: `USB-SERIAL CH340`) und **Verbinden** klicken.

Oben rechts steht "Verbunden (COMx)". Beim nächsten Start verbindet die App automatisch. Ist der Port belegt, zeigt sie "Port belegt" und versucht es alle 3 Sekunden erneut.

## 4. Programme zuordnen

1. Ein Programm aus der **linken Seitenleiste** auf einen **Regler** ziehen. Auch `Master Volume`, `Systemklänge` und `Mikrofon` lassen sich zuordnen.
2. Programme erscheinen in der Liste, sobald sie Ton ausgeben. Die Liste aktualisiert sich alle 5 Sekunden, oder mit "🔄".
3. Das × am Regler entfernt die Zuordnung. Das Namensfeld unten ist frei änderbar.

Die Zuordnung wird automatisch gespeichert. Im Dialog "Einstellungen → Profile" kannst du bis zu vier Zuordnungen (Standard, Gaming, Streaming, Office) ablegen und umschalten.

## Troubleshooting

- **"npm" nicht gefunden:** Node.js installieren.
- **"Port belegt":** Läuft deej, der Serial Monitor oder die Arduino IDE? Sie beenden, die App verbindet dann selbst.
- **Kann nicht verbinden / Gerät erscheint nicht:** CH340-Treiber prüfen, siehe [Haupt-README](../README.md#-troubleshooting).
- **Lautstärke ändert sich nicht:** Das Programm muss schon Ton ausgegeben haben. Kein Eintrag in der Liste heißt: noch keine Audio-Session.
- **Fenster geschlossen:** Die App läuft im Hintergrund weiter (Tray-Symbol). Ein Klick auf das Symbol oder ein zweiter Start zeigt das Fenster wieder.
