/**
 * AudioMixpult - Arduino-Sketch für den deej Lautstärkemixer
 * Hardware: Arduino Nano V3 mit 5 Schiebepotentiometern
 *
 * Anschlüsse:
 * - Poti 1 (OTA1) -> A0
 * - Poti 2 (OTA2) -> A1
 * - Poti 3 (OTA3) -> A2
 * - Poti 4 (OTA4) -> A3
 * - Poti 5 (OTA5) -> A4
 * - Alle GND zusammen -> GND
 * - Alle VCC zusammen -> 5V
 *
 * Serielles Protokoll (kompatibel zu deej):
 * - 9600 Baud, 8N1
 * - Eine Zeile pro Durchlauf: "w1|w2|w3|w4|w5\r\n" (Werte 0-1023)
 * - Zeilenende MUSS \r\n sein (Serial.println), sonst verwirft deej die Zeile
 * - Es wird dauerhaft gesendet (nicht nur bei Änderung), damit deej nach
 *   Start, Reconnect oder Config-Reload sofort alle Reglerpositionen kennt
 *
 * Author: JonasGrafKWR
 * Version: 1.1
 */

// Konfiguration
const int NUM_SLIDERS = 5;
const int ANALOG_PINS[NUM_SLIDERS] = {A0, A1, A2, A3, A4};

// Regler umkehren (true = Wert wird als 1023 - Wert gesendet).
// Regler 5 ist "falsch herum" verdrahtet. Alternative zum Umkehren hier:
// am Poti 5 die Leitungen 5V und GND tauschen und den Eintrag auf false setzen.
const bool INVERT[NUM_SLIDERS] = {false, false, false, false, true};

// Baudrate (muss mit baud_rate in der deej-config.yaml übereinstimmen)
const long BAUD_RATE = 9600;

// Glättung: gleitender Mittelwert über die letzten NUM_READINGS Messungen
const int NUM_READINGS = 4;

// Werte nahe an den Anschlägen werden auf 0 bzw. 1023 gesetzt, damit
// deej wirklich 0 % und 100 % erreicht (Poti-Rauschen am Anschlag)
const int SNAP_MARGIN = 3;

// Pause zwischen zwei Durchläufen in Millisekunden (wie im deej-Original)
const int LOOP_DELAY_MS = 10;

int readings[NUM_SLIDERS][NUM_READINGS];
int readIndex = 0;
int total[NUM_SLIDERS];

/**
 * Liest einen Regler (0-1023) und kehrt den Wert bei Bedarf um.
 * Die erste Messung wird verworfen, damit sich der ADC nach dem
 * Kanalwechsel einschwingen kann (hochohmige Quellen, Übersprechen).
 */
int readSlider(int i) {
  analogRead(ANALOG_PINS[i]);
  int value = analogRead(ANALOG_PINS[i]);
  return INVERT[i] ? 1023 - value : value;
}

void setup() {
  Serial.begin(BAUD_RATE);

  for (int i = 0; i < NUM_SLIDERS; i++) {
    pinMode(ANALOG_PINS[i], INPUT);
  }

  // Glättungspuffer mit echten Messwerten füllen, damit die Werte
  // direkt nach dem Start stimmen (kein Hochlaufen von 0)
  for (int i = 0; i < NUM_SLIDERS; i++) {
    total[i] = 0;
    for (int j = 0; j < NUM_READINGS; j++) {
      readings[i][j] = readSlider(i);
      total[i] += readings[i][j];
    }
  }
}

void loop() {
  // Alle Regler messen und den Puffer aktualisieren
  for (int i = 0; i < NUM_SLIDERS; i++) {
    total[i] -= readings[i][readIndex];
    readings[i][readIndex] = readSlider(i);
    total[i] += readings[i][readIndex];
  }
  readIndex = (readIndex + 1) % NUM_READINGS;

  sendSliderValues();
  delay(LOOP_DELAY_MS);
}

/**
 * Sendet die geglätteten Werte: "w1|w2|w3|w4|w5\r\n"
 */
void sendSliderValues() {
  for (int i = 0; i < NUM_SLIDERS; i++) {
    int value = total[i] / NUM_READINGS;

    // An den Anschlägen einrasten
    if (value <= SNAP_MARGIN) {
      value = 0;
    } else if (value >= 1023 - SNAP_MARGIN) {
      value = 1023;
    }

    Serial.print(value);
    if (i < NUM_SLIDERS - 1) {
      Serial.print('|');
    }
  }

  // println sendet \r\n - zwingend nötig für deej
  Serial.println();
}
