# 🚀 Quick Start - Electron-App (experimentell)

> ⚠️ Die App ist ein nicht gepflegter Prototyp. Für den Alltag deej verwenden, siehe [Haupt-README](../README.md). Bekannte Einschränkungen stehen in [README.md](README.md).

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

## 4. Programme zuordnen

1. Ein Programm aus der **linken Seitenleiste** auf einen **Regler** ziehen.
2. Programme erscheinen in der Liste, wenn sie ein Fenster haben. Mit "🔄" aktualisieren.

Die Zuordnung wird **nicht gespeichert** und ist nach dem Schließen der App weg.

## Troubleshooting

- **"npm" nicht gefunden:** Node.js installieren.
- **Kann nicht verbinden:** Läuft deej oder der Serial Monitor? CH340-Treiber prüfen, siehe [Haupt-README](../README.md#-troubleshooting).
- **Lautstärke ändert sich nicht:** Programme müssen Ton ausgeben, und `assets/nircmd.exe` muss vorhanden sein.
