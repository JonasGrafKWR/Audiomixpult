# 🎚️ Audiomixpult Control - Installation (experimentell)

> ⚠️ Die App ist ein nicht gepflegter Prototyp. Für den Alltag deej verwenden, siehe [Haupt-README](../README.md). Bekannte Einschränkungen stehen in [README.md](README.md).

## Windows-Installer erstellen

Voraussetzungen: Node.js und installierte Abhängigkeiten (`npm install`).

```powershell
cd mixer-app
npm run build:win
```

Das erzeugt zwei Varianten im lokalen Ordner `dist/` (der Ordner ist nicht im Repo):

1. **NSIS-Installer** (`Audiomixpult Control Setup 1.0.0.exe`) mit Startmenü-Eintrag, Desktop-Verknüpfung und Deinstallation
2. **Portable Version** (`Audiomixpult Control 1.0.0.exe`) ohne Installation

Die Installer sind **nicht code-signiert**. Windows kann beim Start eine Warnung zeigen.

## Nach der Installation

1. Arduino mit dem Audiomixer-Sketch anschließen (CH340-Treiber nötig, siehe [Haupt-README](../README.md)).
2. deej beenden. Der COM-Port kann nur von einem Programm geöffnet werden.
3. App starten, **⚙️ Einstellungen** öffnen, COM-Port wählen, **Verbinden**.
4. Programme aus der Seitenleiste per Drag & Drop auf Regler ziehen.

COM-Port und Zuordnungen werden **nicht gespeichert** und müssen bei jedem Start neu eingestellt werden.

## Autostart

In den Einstellungen "Mit Windows starten" aktivieren. Die App legt dazu eine Verknüpfung an:

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Audiomixpult Control.lnk
```

Das ist nur in der gebauten App sinnvoll. Im Entwicklungsmodus zeigt die Verknüpfung auf `electron.exe`.

## Deinstallation

Windows-Einstellungen → Apps → Installierte Apps → "Audiomixpult Control" → Deinstallieren. Die Autostart-Verknüpfung (siehe oben) gegebenenfalls von Hand löschen.

## Troubleshooting

- **Arduino nicht erkannt:** CH340-Treiber prüfen, anderes USB-Kabel oder anderen Port probieren.
- **Lautstärke ändert sich nicht:** Ein Regler ohne Zuordnung bewirkt nichts. Programme müssen Ton ausgeben.
- **Fenster geschlossen, App nicht mehr erreichbar:** Das Schließen versteckt das Fenster nur (der Tray ist deaktiviert). Die App im Task-Manager beenden und neu starten.

## Systemanforderungen

- Windows 10/11 (64-bit)
- Arduino Nano V3 mit CH340-USB-Chip
