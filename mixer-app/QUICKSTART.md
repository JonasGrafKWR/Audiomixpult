# 🚀 Quick Start - Electron App

## 1. Installation

Öffne PowerShell im `mixer-app` Ordner und führe aus:

```powershell
# Node.js installieren (falls noch nicht vorhanden)
# Download von: https://nodejs.org/

# Abhängigkeiten installieren
npm install

# Das kann einige Minuten dauern...
```

## 2. App starten

```powershell
# Entwicklungsmodus (mit DevTools)
npm run dev

# Oder normal starten
npm start
```

## 3. Arduino verbinden

1. **Arduino anschließen** (USB)
2. In der App: **⚙️ Einstellungen** klicken
3. **COM-Port auswählen** (z.B. COM3)
4. Auf **Verbinden** klicken

✅ Status sollte "Verbunden" anzeigen!

## 4. Programme zuordnen

### Drag & Drop:
1. Programm aus **linker Sidebar** auswählen
2. Auf einen **Regler** ziehen
3. Loslassen - fertig! 🎉

### Beispiel:
- **Regler 1**: Master Volume
- **Regler 2**: Discord
- **Regler 3**: Spotify
- **Regler 4**: Chrome
- **Regler 5**: Games

## 5. Windows Installer bauen (Optional)

```powershell
npm run build:win
```

Findet sich dann in: `dist/Audiomixpult Control Setup.exe`

---

## ⚡ Troubleshooting

### "npm" nicht gefunden?
→ Node.js installieren: https://nodejs.org/

### Kann nicht verbinden?
→ CH340 Treiber installieren
→ Arduino-Code muss auf dem Nano sein!

### Keine Programme in der Liste?
→ Programme müssen Audio abspielen
→ Auf "🔄" klicken zum Aktualisieren

---

## 🎨 Features

✅ Modernes Dark Theme  
✅ Drag & Drop Interface  
✅ Live Arduino-Feedback  
✅ Auto COM-Port Detection  
✅ Profile speichern  
✅ System Tray Integration  

---

**Viel Spaß! 🎚️🎵**
