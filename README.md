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

Unterstützt: Szenen, Licht (inkl. RGB/Farbtemperatur/Effekte), Heizung, Schalter, Ventilator, Luftbefeuchter, Rollos, Schlösser, Mediaplayer, Staubsauger, Buttons, Zahlen- und Auswahlfelder (number/select, input_*), Sensoren und Binärsensoren. Geräte ohne Raum stehen unter „Weitere“.
