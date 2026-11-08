# Pinbelegung & Hardware-Details

## Arduino Nano V3 Pinbelegung

### Verwendete Pins

| Arduino Pin | Funktion | Verbunden mit | Beschreibung |
|-------------|----------|---------------|--------------|
| A0 | Analog Input | Potentiometer 1 (OTA) | Regler 1 |
| A1 | Analog Input | Potentiometer 2 (OTA) | Regler 2 |
| A2 | Analog Input | Potentiometer 3 (OTA) | Regler 3 |
| A3 | Analog Input | Potentiometer 4 (OTA) | Regler 4 |
| A4 | Analog Input | Potentiometer 5 (OTA) | Regler 5 |
| 5V | Stromversorgung | Alle Poti VCC | +5V Versorgung |
| GND | Masse | Alle Poti GND | Gemeinsame Masse |

### Nicht verwendete Pins

Folgende Pins sind frei und können für Erweiterungen genutzt werden:
- **A5, A6, A7**: Weitere analoge Eingänge (für mehr Regler). A6 und A7 sind reine Analogeingänge.
- **D2-D13**: Digitale Pins (für LEDs, Displays, Buttons)
- **TX/RX (D0/D1)**: Serielle Kommunikation (für Debugging)

## Schiebepotentiometer 10kΩ

### Technische Daten
- **Widerstand**: 10kΩ (10.000 Ohm)
- **Typ**: Linear
- **Bauform**: Schiebepotentiometer 2-fach
- **Verstellweg**: ca. 60mm
- **Anschlüsse**: 3 Pins (VCC, GND, OTA)

### Pin-Reihenfolge (von oben nach unten)
```
[1] VCC  ──── Stromversorgung (+5V)
[2] OTA  ──── Signal (Ausgang zum Arduino)
[3] GND  ──── Masse (Ground)
```

**Wichtig**: Die Pin-Reihenfolge kann je nach Hersteller variieren! 
Falls die Regler "verkehrt herum" funktionieren, tausche VCC und GND.

## Verkabelung

### Variante 1: Alle Potis parallel (empfohlen)

```
Arduino Nano
    │
    ├─── 5V  ───┬───────┬───────┬───────┬───────┐
    │           │       │       │       │       │
    │         [P1]    [P2]    [P3]    [P4]    [P5]
    │           │       │       │       │       │
    ├─── A0 ────┤       │       │       │       │
    ├─── A1 ────────────┤       │       │       │
    ├─── A2 ────────────────────┤       │       │
    ├─── A3 ────────────────────────────┤       │
    ├─── A4 ────────────────────────────────────┤
    │           │       │       │       │       │
    └─── GND ───┴───────┴───────┴───────┴───────┘

P1-P5 = Potentiometer 1-5 (OTA-Pin)
```

### Variante 2: Mit Steckbrett (für Prototyping)

```
Steckbrett-Layout:

5V-Rail  ────────────────────────────────
          │    │    │    │    │
        [P1] [P2] [P3] [P4] [P5]  (VCC)
          │    │    │    │    │
          A0   A1   A2   A3   A4  (OTA)
          │    │    │    │    │
        [P1] [P2] [P3] [P4] [P5]  (GND)
          │    │    │    │    │
GND-Rail ────────────────────────────────
```

## Kabellängen (Empfehlung)

Für ein kompaktes Gehäuse:
- **VCC-Leitung**: 15-20cm pro Potentiometer
- **GND-Leitung**: 15-20cm pro Potentiometer  
- **Signal (OTA)**: 10-15cm pro Potentiometer

**Tipp**: Verwende verschiedene Kabelfarben:
- 🔴 Rot = VCC (+5V)
- ⚫ Schwarz = GND (Masse)
- 🟡 Gelb/Andere Farben = Signal (A0-A4)

## Lötanleitung

### Methode 1: Direkt an Arduino löten

**Vorteile**: Stabile Verbindung, kein Steckbrett nötig  
**Nachteile**: Schwer zu ändern, Arduino fest verbaut

1. Adern mit ~5mm abisolieren
2. Verzinnen (Lötzinn auf blankes Kupfer auftragen)
3. Durch Arduino-Löcher fädeln
4. Von unten anlöten
5. Überstehende Drahtenden abknipsen

### Methode 2: Mit Dupont-Steckern (empfohlen)

**Vorteile**: Flexibel, einfach zu wechseln  
**Nachteile**: Kann sich lösen, mehr Verkabelung

1. Dupont-Kabel verwenden (Buchse-Buchse)
2. Auf Arduino-Header stecken
3. Andere Seite an Potentiometer löten oder crimpen

### Methode 3: Mit Schraubklemmen

**Vorteile**: Kein Löten nötig, super für Anfänger  
**Nachteile**: Größerer Platzbedarf

1. Schraubklemmen-Shield für Arduino verwenden
2. Kabel in Klemmen einführen
3. Festschrauben

## Gehäuse-Montage

### Option 1: 3D-Druck
- STL-Dateien: https://www.thingiverse.com/thing:4196719
- Material: PLA oder PETG
- Druckzeit: ca. 4-6 Stunden
- Schrauben: 5x M3x10mm, 7x M3x20mm

### Option 2: Holzgehäuse (DIY)
- Material: Sperrholz 5-10mm
- Werkzeug: Säge, Bohrmaschine, Leim
- Oberfläche schleifen und lackieren

### Option 3: Karton (Quick & Dirty)
- Kostenlos und schnell
- Stabil genug für erste Tests
- Mit Tape und Heißkleber befestigen

## Erweiterungsmöglichkeiten

### 🎮 Mehr Regler hinzufügen
- Arduino Nano hat A5-A7 frei
- Bis zu 8 Regler möglich (A0-A7)
- Code anpassen: `NUM_SLIDERS` erhöhen, den Pin in `ANALOG_PINS[]` eintragen und `INVERT[]` um einen Eintrag erweitern
- In der deej-Config einen weiteren Eintrag unter `slider_mapping` ergänzen

### 💡 LEDs hinzufügen
- Digital Pins D2-D13 nutzen
- LED-Streifen für visuelles Feedback
- Zeigt aktuelle Lautstärke an

### 🖥️ OLED-Display integrieren
- Zeigt zugeordnete Apps an
- **Achtung:** Beim Nano liegt I2C fest auf **A4 (SDA)** und **A5 (SCL)**. A4 wird aber von Regler 5 belegt, ein I2C-Display kollidiert also mit dem fünften Regler.
- Lösungen: ein **SPI-Display** (an D-Pins) verwenden, oder Regler 5 auf **A6/A7** verlegen (`ANALOG_PINS[]` im Sketch anpassen) und das I2C-Display an A4/A5 betreiben. Ein "Multiplexer" ändert an den festen I2C-Pins nichts.

### 🎛️ Rotary Encoder
- Für Mikrofonverstärkung
- Für Master-Volume
- Digitale Pins nutzen

### 🔘 Taster/Buttons
- Mute-Funktion
- Profil-Wechsel
- LED-Steuerung

## Fehlerbehebung Hardware

### Problem: Regler funktioniert nicht

**Checkliste**:
1. ✅ Ist VCC an 5V angeschlossen?
2. ✅ Ist GND an GND angeschlossen?
3. ✅ Ist OTA am richtigen Analog-Pin?
4. ✅ Sind Lötpunkte sauber (kein Kurzschluss)?
5. ✅ Ist das Potentiometer intakt? (Durchgang messen)

**Test**: Mit Multimeter Widerstand messen
- Zwischen VCC und GND: ~10kΩ
- OTA sollte sich ändern beim Verstellen

**Regler zeigt im Serial Monitor immer `1023` (oder immer `0`)**:
- Immer `1023` heißt: Der Analogeingang sieht ständig 5 V. Typische Ursachen: GND-Leitung dieses Potis unterbrochen (lose Lötstelle, Kabelbruch), Signalleitung am 5V-Pin des Potis statt am Schleifer (OTA), Lötbrücke zu 5V.
- Immer `0` heißt: Eingang liegt auf GND (5V-Leitung unterbrochen oder Schleifer an GND).
- Eingrenzen: Mit einem Jumperkabel den Analogpin am Nano kurz mit GND verbinden, der Wert im Monitor muss auf `0` fallen. Mit dem Multimeter (Gleichspannung, **DC**!) die Spannung am Analogpin gegen GND messen: sie muss sich beim Verschieben zwischen 0 V und 5 V ändern.
- Durchgang (Nano abgezogen): Zwischen benachbarten Analogpins darf es nicht piepen (Lötbrücke).

### Problem: Alle Regler zappeln/springen

**Ursachen**:
- Schlechte Stromversorgung (USB-Hub oder Frontbuchse vermeiden)
- Zu lange Kabel (Störungen einfangen)
- Defekte Potis (selten)

**Lösungen**:
- Direkt an PC-USB anschließen
- Abgeschirmte Kabel verwenden
- Software-Glättung im Sketch (`NUM_READINGS`) erhöhen, in deej `noise_reduction: high` setzen

### Problem: Werte verkehrt herum

**Lösung 1**: VCC und GND am Poti tauschen

**Lösung 2**: Im Sketch invertieren. Dafür gibt es das Array `INVERT[]` in `audiomixer/audiomixer.ino`. Den Eintrag des betroffenen Reglers auf `true` setzen:
```cpp
const bool INVERT[NUM_SLIDERS] = {true, true, true, true, true};
```
(Bei der aktuellen Verdrahtung sind alle fünf Regler umgekehrt.)

**Lösung 3**: Alle Regler auf einmal umkehren geht auch in der deej-Config mit `invert_sliders: true`.

## Wartung & Pflege

- **Staubschutz**: Gehäuse geschlossen halten
- **Reinigung**: Potis alle 6-12 Monate mit Kontaktspray reinigen
- **Kontakte prüfen**: Lockere Verbindungen nachziehen
- **Kabel**: Nicht zu stark biegen (Kabelbruch vermeiden)

## Sicherheitshinweise

⚠️ **WICHTIG**:
- Nur 5V verwenden (kein 12V oder mehr!)
- Arduino nicht kurzschließen
- Beim Löten gut lüften
- USB-Port nicht überlasten

---

**Viel Erfolg beim Aufbau! 🔧**

Bei Fragen: Issue auf GitHub öffnen!