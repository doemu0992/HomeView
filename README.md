# HomeView

Eine Home-Assistant-Oberfläche im Stil eines Apple-Home-Displays. Läuft ohne Build-Schritt im Browser und passt sich jeder Bildschirmgröße an (Quadrat, Quer- und Hochformat).

- `mockup/` – statisches Design-Mockup
- `homeview/` – das eigentliche Frontend (`index.html`, `style.css`, `app.js`)

## Ausprobieren

`homeview/index.html?demo` im Browser öffnen (zeigt Beispieldaten).

## Mit Home Assistant verwenden

1. Ordner `homeview/` nach `/config/www/homeview/` in Home Assistant kopieren.
2. Im Browser (Kiosk) `http://<home-assistant>:8123/local/homeview/index.html` öffnen.
3. Beim ersten Start ein langlebiges Zugriffstoken eintragen (Profil → Sicherheit). Es wird nur lokal im Browser gespeichert.

Räume, Geräte, Wetter und Energie-Messwerte werden automatisch aus Home Assistant gelesen. Tippen schaltet. Langes Drücken (oder „···“ auf der Kachel) öffnet alle Funktionen des Geräts: bei Lampen Helligkeit, Farbtemperatur, RGB-Farbe und Effekte, bei Heizung Betriebsart, Zieltemperatur, Programme und Lüfter, bei Rollos Position und Neigung, bei Mediaplayern Lautstärke, Quelle und Titelwechsel u. v. m. Angezeigt wird nur, was das Gerät laut Home Assistant unterstützt.

## Nur YAML (ohne Datei)

`dist/homeview-dashboard.yaml` komplett in den Raw-Konfigurationseditor eines neuen Dashboards einfügen und am Ende der `url` die HA-Adresse und das Token eintragen. Das Layout wird dann im Home-Assistant-Benutzerprofil gespeichert.

## Einfachste Installation

Nur die Datei `dist/homeview.html` (alles in einer) nach `/config/www/homeview.html` kopieren und im Dashboard per iframe einbinden, siehe unten.

```yaml
views:
  - title: HomeView
    path: homeview
    panel: true
    cards:
      - type: iframe
        url: /local/homeview.html
        aspect_ratio: 100%
```

## Zwischenspeicher

Home Assistant liefert Dateien aus `/www` mit langer Cache-Zeit aus. Nach jedem Austausch von `homeview.html` die Zahl in `url: /local/homeview.html?v=3` erhöhen (und im Browser neu laden), sonst erscheint die alte Datei.

## Anmeldung

Liegt `homeview.html` unter `/config/www/` und wird per iframe-Karte (`/local/homeview.html`) eingebunden, nutzt HomeView automatisch die Anmeldung des Dashboards: kein Token, keine Adresse. Beispiel: `dist/homeview-dashboard-lokal.yaml`.

## Saugroboter

Das Detailfenster zeigt Status und Akku, Start/Pause/Stopp/Zur Station/Suchen (je nach Funktion), Saugstärke und alle weiteren Einstellungen desselben Geräts: Auswahlfelder (z. B. Reinigungsmodus, Wassermenge), Regler, Schalter, Tasten (z. B. Station leeren) und Messwerte (gereinigte Fläche, Reinigungszeit, Filter). Bei der Dreame-Integration (HACS, Tasshack) kannst du außerdem einzelne Räume wählen und gezielt reinigen.

## Chips (standardmäßig an)

Der Name entscheidet: Geräte mit „Lüfter“ oder „Ventilator“ im Namen zählen als Lüfter (eigener Chip „Lüfter an/aus“ mit drehendem Symbol), nicht als Licht, auch wenn Home Assistant sie als Licht führt.

Jeder Raum zeigt oben eine Chip-Leiste (Temperatur, Luftfeuchte, Lichter, offene Fenster/Türen, Schlösser, Medien, Alarm, Energie). Ausschalten unter „Anordnen → Chips“ oder mit `#chips=0` an der Adresse.

## Bildschirmgröße

HomeView passt Schrift und Abstände der Bildschirmhöhe an, sodass immer mindestens zwei volle Kachelreihen ohne Scrollen sichtbar sind (Chips und Raumleiste eingerechnet). Weitere Reihen erreichst du durch Wischen. Die Prüfseite `diagnose.html` zeigt die Größe deines Displays.

## Kiosk-Modus

Der Knopf „Kiosk“ oben rechts startet den Vollbildmodus und blendet Bearbeiten-Elemente aus. Beenden: Uhrzeit 2 Sekunden gedrückt halten (oder Esc). Mit `&kiosk=1` am Ende der Adresse startet die Anzeige direkt im Kiosk-Modus (ohne Vollbild, das braucht einen Tipp).

## Animierte Symbole

Symbole bewegen sich passend zum Zustand: Ventilator/Staubsauger drehen sich, Lampen leuchten, Heizung und Flamme flackern, Türen und Fenster schwingen auf, offene Schlösser wackeln, Rollos gleiten, die Alarmanlage rüttelt bei Auslösung, ein roter Live-Punkt blinkt bei Kameras, der Heizungsring glüht beim Heizen (orange) oder Kühlen (blau). Pro Gerät abschaltbar (Anordnen → ✎ → Animation).

## Wetter

Oben rechts zeigt HomeView das Wetter mit animiertem Symbol (Sonne, Wolken, Regen, Schnee, Gewitter, Nebel, Wind, Nacht). Antippen öffnet Details (Luftfeuchte, Wind, Luftdruck …), die Wahl der Wetterquelle (wenn mehrere Wetter-Integrationen vorhanden sind) und den Ortsnamen, z. B. „Bellach 4512“.

## Räume verwalten

Anordnen → „Räume“: alle Räume an einer Stelle. Neue Räume anlegen, jeden Raum ein- oder ausblenden (auch leere Räume aus Home Assistant), umbenennen, per Pfeil sortieren, eigene Räume löschen. Die Geräte pro Raum wählst du mit „Geräte“.

## Symbole nach Gruppen

Die Symbolauswahl ist nach Gruppen sortiert (Licht, Schalter und Strom, Klima, Wohnen, Sicherheit und Haus, Sonstiges). Bei Licht gibt es viele Lampenformen: Glühbirne, Tischlampe, Stehlampe, Hängelampe, Deckenleuchte, Spot, Wandlampe, LED-Streifen, Lichterkette, Kerze, Laterne, Kronleuchter, Flutlicht. Das automatische Symbol richtet sich nach dem Namen („Stehlampe“ → Stehlampe, „Strip“ → LED-Streifen, „Decke“ → Deckenleuchte …).

## Name, Symbol, Animation

Im Anordnen-Modus auf das Stift-Symbol einer Kachel tippen (oder im Detailfenster „Name und Symbol ändern“): Gerät umbenennen, aus rund 40 Symbolen wählen, Animation ein- oder ausschalten. Animierte Symbole bewegen sich, solange das Gerät an ist (Ventilator dreht sich, Lampe leuchtet, Flamme flackert, Glocke schwingt …).

## Räume und Geräte bearbeiten

Im Anordnen-Modus: „+ Raum“ legt einen Raum an, „Raum bearbeiten“ benennt, verschiebt, blendet aus oder löscht ihn, „Geräte“ wählt frei aus, welche Geräte in einem Raum erscheinen (ein Gerät kann in mehreren Räumen sein).

## Anordnen

Unten rechts auf „Anordnen“ tippen (oder lange auf freie Fläche / die Uhr drücken): Die Kacheln wackeln, lassen sich per Ziehen umsortieren, über das Größen-Symbol (1×1, 2×1, 2×2, 1×2) vergrößern und verkleinern und über „−“ ausblenden. Das Layout wird pro Raum im Browser des Displays gespeichert; „Zurücksetzen“ stellt den Standard wieder her.

Unterstützt: Alarmanlagen (Code-Tastatur, Zuhause/Abwesend/Nacht/Urlaub), Kameras (Vorschau, Live-Bild per MJPEG, Ein/Aus), Szenen, Licht (inkl. RGB/Farbtemperatur/Effekte), Heizung, Schalter, Ventilator, Luftbefeuchter, Rollos, Schlösser, Mediaplayer, Staubsauger, Buttons, Zahlen- und Auswahlfelder (number/select, input_*), Sensoren und Binärsensoren. Geräte ohne Raum stehen unter „Weitere“.

## Saugroboter

Das Fenster eines Saugroboters zeigt oben Status, Akku und die Knöpfe Starten/Pause, Station und Finden. Darunter liegen Kurzbefehle (Räume, Modus, Saugkraft und Wassermenge in einem Tipp, lange drücken zum Bearbeiten), die Auswahl für Reinigungsmodus, Saugkraft und Wassermenge sowie die Räume als Kacheln. Alle weiteren Einstellungen des Geräts liegen in den Reitern Einstellungen, Wartung, Station und Info. Kurzbefehle werden mit dem Layout in Home Assistant gespeichert.

## Verbrauch

Sensoren mit der Geräteklasse „Leistung“ erscheinen als Chip und als Kachel. Der Chip zeigt die Summe der Leistungssensoren des gewählten Raums, in „Zuhause“ die Summe aller. Die Farbe richtet sich nach der Last (grün unter 150 W, gelb bis 500 W, rot darüber). Die Kachel gibt es in drei Größen mit Verlauf. Ein Tipp öffnet den Verlauf für 1 Std, 24 Std und 7 Tage. Der Verlauf kommt aus dem Verlauf (Recorder) von Home Assistant.

## Gemeinsame Ansicht

Räume, Reihenfolge, Größen, Namen, Symbole und Chips werden im gemeinsamen Speicher von Home Assistant abgelegt und gelten für alle Benutzer. Ändern dürfen sie nur Administratoren. Ein Benutzer ohne Administratorrechte sieht die gemeinsame Ansicht, seine Änderungen gelten nur für ihn. Beim ersten Start als Administrator wird das bisherige persönliche Layout für alle übernommen. Andere Geräte übernehmen Änderungen innerhalb einer Minute.

## Szenen aus Apple Home übernehmen

Im Anordnen-Modus: „Szene erfassen“. Zuerst merkt sich HomeView den Zustand der Geräte im gewählten Raum (oder im ganzen Haus). Dann stellst du in Apple Home die Szene ein. HomeView sucht die Unterschiede, wählt die geänderten Geräte vor (Lichter, Steckdosen, Schlösser, Rollos, Ventilatoren, Thermostate) und legt nach dem Speichern eine echte Home-Assistant-Szene an. Sie erscheint als Kachel im Raum. Lang drücken auf die Kachel zeigt den Inhalt und erlaubt Überschreiben, Umbenennen und Löschen. Dauerhaft speichern können nur Administratoren. Ohne diese Rechte gilt die Szene bis zum nächsten Neustart von Home Assistant. HomeView fragt beim Start einer Szene nie nach, auch nicht, wenn sie ein Schloss entriegelt.

Eine Szenen-Kachel bleibt weiß („Aktiv“), solange alle Geräte der Szene so stehen, wie die Szene sie speichert. Kleine Rundungsunterschiede bei Helligkeit, Farbe oder Position zählen nicht. Ändert sich ein Gerät, wird die Kachel wieder dunkel. Dafür liest HomeView den Inhalt der Szene aus Home Assistant (Administratorrechte nötig, sonst nur für Szenen, die HomeView in dieser Sitzung angelegt hat).

Nach dem Starten einer Szene prüft HomeView nach fünf Sekunden, ob alle Geräte angekommen sind, und sendet fehlende einmal nach. Im Szenen-Fenster steht unter „Abweichungen jetzt“, welche Geräte von der Szene abweichen. Beim Erfassen kann HomeView vorher Lichter und Steckdosen ausschalten, damit alle Geräte der Apple-Szene erfasst werden.
