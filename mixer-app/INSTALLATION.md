# 🎚️ Audiomixpult Control - Installation

> deej ist weiterhin die Empfehlung für den Alltag, siehe [Haupt-README](../README.md). Details und Einschränkungen der App stehen in [README.md](README.md).

## Windows-Installer erstellen

Voraussetzungen: Node.js und installierte Abhängigkeiten (`npm install`).

```powershell
cd mixer-app
npm run build:win
```

Das erzeugt zwei Varianten im lokalen Ordner `dist/` (der Ordner ist nicht im Repo):

1. **NSIS-Installer** (`Audiomixpult Control Setup 1.0.0.exe`) mit Startmenü-Eintrag, Desktop-Verknüpfung und Deinstallation
2. **Portable Version** (`Audiomixpult Control 1.0.0.exe`) ohne Installation

Der Installer ist **nicht code-signiert**. Windows zeigt beim Start "Windows hat Ihren PC geschützt" bzw. "Unbekannter Herausgeber": auf **Weitere Informationen → Trotzdem ausführen** klicken. Er installiert pro Benutzer, Administratorrechte sind nicht nötig.

Geprüft wurde die gebaute App unter `dist/win-unpacked`: Der Audio-Helfer liegt entpackt im Paket (`asarUnpack`), die serielle Bibliothek lädt, das Fenster öffnet sich.

**Bekanntes Problem beim Bauen unter Windows:** Ohne Entwicklermodus oder Administratorrechte kann `electron-builder` beim Entpacken seines Werkzeugs `winCodeSign` zwei macOS-Dateien (symbolische Links) nicht anlegen und der Bau bricht ab. Abhilfe: In Windows den **Entwicklermodus** einschalten, oder den Ordner `winCodeSign-2.6.0` im Cache (`%LOCALAPPDATA%\electron-builder\Cache\winCodeSign`) aus einem bereits entpackten Stand kopieren. Der Bau braucht beim ersten Mal Internet (Werkzeuge von GitHub).

## Nach der Installation

1. Arduino mit dem Audiomixer-Sketch anschließen (CH340-Treiber nötig, siehe [Haupt-README](../README.md)).
2. deej beenden. Der COM-Port kann nur von einem Programm geöffnet werden.
3. App starten, **⚙️ Einstellungen** öffnen, COM-Port wählen, **Verbinden**.
4. Programme aus der Seitenleiste per Drag & Drop auf Regler ziehen.

COM-Port und Zuordnungen werden gespeichert (`%APPDATA%\audiomixpult-control\config.json`), die App verbindet beim nächsten Start selbst.

## Autostart

In den Einstellungen "Mit Windows starten" aktivieren. Die App trägt sich dazu als Autostart-Programm von Windows ein (Einstellungen → Apps → Autostart) und startet dann ausgeblendet im Tray. Das geht nur in der gebauten App, nicht beim Start mit `npm start`.

## Deinstallation

Windows-Einstellungen → Apps → Installierte Apps → "Audiomixpult Control" → Deinstallieren.

## Troubleshooting

- **Arduino nicht erkannt:** CH340-Treiber prüfen, anderes USB-Kabel oder anderen Port probieren.
- **"Port belegt":** Läuft deej, der Serial Monitor oder die Arduino IDE? Beenden, die App versucht es alle 3 Sekunden erneut.
- **Lautstärke ändert sich nicht:** Das Programm muss schon Ton ausgegeben haben, und der Regler braucht eine Zuordnung.
- **Fenster geschlossen:** Die App läuft im Hintergrund weiter. Tray-Symbol anklicken oder die App ein zweites Mal starten.

## Systemanforderungen

- Windows 10/11 (64-bit)
- Arduino Nano V3 mit CH340-USB-Chip
