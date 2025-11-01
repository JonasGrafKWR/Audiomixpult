/**
 * AudioMixpult - Verbesserter Arduino Code für DEEJ Lautstärkemixer
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
 * Author: JonasGrafKWR
 * Version: 1.0
 * Datum: November 2025
 */

// Konfiguration
const int NUM_SLIDERS = 5;
const int ANALOG_PINS[NUM_SLIDERS] = {A0, A1, A2, A3, A4};

// Baudrate für serielle Kommunikation (muss mit deej-Software übereinstimmen)
const int BAUD_RATE = 9600;

// Schwellenwert für Änderungserkennung (verhindert Rauschen)
const int NOISE_THRESHOLD = 3;

// Glättungsparameter für stabilere Werte
const int NUM_READINGS = 5;
int readings[NUM_SLIDERS][NUM_READINGS];
int readIndex[NUM_SLIDERS];
int total[NUM_SLIDERS];
int average[NUM_SLIDERS];

// Letzter gesendeter Wert (zur Änderungserkennung)
int lastSentValue[NUM_SLIDERS];

void setup() {
  // Serielle Verbindung starten
  Serial.begin(BAUD_RATE);
  
  // Analoge Eingänge als INPUT konfigurieren (optional, da bereits Standard)
  for (int i = 0; i < NUM_SLIDERS; i++) {
    pinMode(ANALOG_PINS[i], INPUT);
  }
  
  // Arrays initialisieren
  for (int i = 0; i < NUM_SLIDERS; i++) {
    readIndex[i] = 0;
    total[i] = 0;
    average[i] = 0;
    lastSentValue[i] = 0;
    
    // Alle Readings mit 0 initialisieren
    for (int j = 0; j < NUM_READINGS; j++) {
      readings[i][j] = 0;
    }
  }
  
  // Kurze Pause für Stabilisierung
  delay(100);
}

void loop() {
  boolean needsUpdate = false;
  
  // Alle Potentiometer auslesen und glätten
  for (int i = 0; i < NUM_SLIDERS; i++) {
    // Alten Wert aus dem Glättungspuffer entfernen
    total[i] = total[i] - readings[i][readIndex[i]];
    
    // Neuen Wert einlesen
    readings[i][readIndex[i]] = analogRead(ANALOG_PINS[i]);
    
    // Neuen Wert zum Total addieren
    total[i] = total[i] + readings[i][readIndex[i]];
    
    // Index für nächsten Durchlauf erhöhen
    readIndex[i] = (readIndex[i] + 1) % NUM_READINGS;
    
    // Durchschnitt berechnen
    average[i] = total[i] / NUM_READINGS;
    
    // Prüfen ob sich der Wert signifikant geändert hat
    if (abs(average[i] - lastSentValue[i]) > NOISE_THRESHOLD) {
      needsUpdate = true;
      lastSentValue[i] = average[i];
    }
  }
  
  // Nur senden wenn sich Werte geändert haben
  if (needsUpdate) {
    sendSliderValues();
  }
  
  // Kleine Verzögerung um CPU-Last zu reduzieren
  delay(10);
}

/**
 * Sendet die aktuellen Potentiometerwerte über die serielle Schnittstelle
 * Format: "value1|value2|value3|value4|value5\n"
 */
void sendSliderValues() {
  String output = "";
  
  for (int i = 0; i < NUM_SLIDERS; i++) {
    output += String(lastSentValue[i]);
    
    // Trennzeichen hinzufügen (außer beim letzten Wert)
    if (i < NUM_SLIDERS - 1) {
      output += "|";
    }
  }
  
  // Newline hinzufügen und senden
  output += "\n";
  Serial.print(output);
}

/**
 * Alternative Methode: Direkt ohne Glättung (schneller, aber anfälliger für Rauschen)
 * Kommentiere die loop() Funktion oben aus und benenne diese in loop() um
 */
void loop_simple() {
  String output = "";
  
  for (int i = 0; i < NUM_SLIDERS; i++) {
    int value = analogRead(ANALOG_PINS[i]);
    output += String(value);
    
    if (i < NUM_SLIDERS - 1) {
      output += "|";
    }
  }
  
  output += "\n";
  Serial.print(output);
  
  delay(50);
}
