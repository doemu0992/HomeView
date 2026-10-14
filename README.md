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

## Kiosk-Modus

Der Knopf „Kiosk“ oben rechts startet den Vollbildmodus und blendet Bearbeiten-Elemente aus. Beenden: Uhrzeit 2 Sekunden gedrückt halten (oder Esc). Mit `&kiosk=1` am Ende der Adresse startet die Anzeige direkt im Kiosk-Modus (ohne Vollbild, das braucht einen Tipp).

## Räume und Geräte bearbeiten

Im Anordnen-Modus: „+ Raum“ legt einen Raum an, „Raum bearbeiten“ benennt, verschiebt, blendet aus oder löscht ihn, „Geräte“ wählt frei aus, welche Geräte in einem Raum erscheinen (ein Gerät kann in mehreren Räumen sein).

## Anordnen

Unten rechts auf „Anordnen“ tippen (oder lange auf freie Fläche / die Uhr drücken): Die Kacheln wackeln, lassen sich per Ziehen umsortieren, über das Größen-Symbol (1×1, 2×1, 2×2, 1×2) vergrößern und verkleinern und über „−“ ausblenden. Das Layout wird pro Raum im Browser des Displays gespeichert; „Zurücksetzen“ stellt den Standard wieder her.

Unterstützt: Alarmanlagen (Code-Tastatur, Zuhause/Abwesend/Nacht/Urlaub), Kameras (Vorschau, Live-Bild per MJPEG, Ein/Aus), Szenen, Licht (inkl. RGB/Farbtemperatur/Effekte), Heizung, Schalter, Ventilator, Luftbefeuchter, Rollos, Schlösser, Mediaplayer, Staubsauger, Buttons, Zahlen- und Auswahlfelder (number/select, input_*), Sensoren und Binärsensoren. Geräte ohne Raum stehen unter „Weitere“.
