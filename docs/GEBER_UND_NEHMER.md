# Wachtbruch: Geber und Nehmer

Stand: 2026-08-21

Ein System, das aus vier Kampfraeumen eine Welt macht, die Fragen stellen
kann. Der Entwurf ist umgesetzt; dieses Dokument haelt fest, warum er so
aussieht.

## Der Befund

Wachtbruch hat ein richtiges Weltmodell. Jedes Asset traegt Datenflaggen -
`walkable`, `solid`, `grapple` - und der Editor kann alles davon setzen. Das
ist die teure Haelfte, und sie stand bereits.

Was fehlte, war die andere Haelfte: ein Raum konnte genau eine Frage stellen.
Der einzige Systemmarker mit Bedingung war der Ausgang, und seine einzige
Bedingung hiess `clear` - sind alle tot. Groessere Raeume haetten dieselbe
Frage nur laenger gestellt.

Der Ausgang war dabei bereits ein Nehmer. `condition: 'clear'` ist ein Signal,
das auf ein Schloss trifft. Es gab einen Fall dieses Systems im Code.
Verallgemeinern war billiger, als etwas Neues zu erfinden.

## Das System

Zwei Markerrollen, die ueber eine frei benannte Zeichenkette miteinander
reden. Kein Objektverweis, keine Verdrahtung im Editor - nur ein Name, den
beide Seiten kennen.

| Geber (setzt ein Signal) | Nehmer (horcht darauf) |
| --- | --- |
| `druckplatte` - Gewicht liegt darauf | `tor` - oeffnet, schliesst |
| `hebel` - umgelegt | `bruecke` - faehrt aus |
| `fackel` - brennt | `plattform` - hebt, senkt |
| `anker` - eingehakt | `anker` - wird einhakbar |
| `truhe` - geoeffnet | `exit` - gibt frei |
| `welle` - geraeumt | `spawner` - ruft eine Welle |

Der `anker` steht mit Absicht auf beiden Seiten: Er kann melden, dass jemand
an ihm haengt, und er kann selbst erst dann greifbar werden, wenn ein anderes
Signal an ist. Damit wird der Enterhaken vom Sonderfall in Raum vier zum
Schluessel.

Umgesetzt sind bisher `druckplatte` als Geber und `schloss` als Nehmer, sowie
der Ausgang mit der neuen Bedingung `signal`.

## Die Datenfelder

Alles bleibt im vorhandenen Muster: ein Marker mit `type` und einem einfachen
`settings`-Objekt. Serialisierbar, kein Three.js im Raumstand.

```js
// Geber
{ type: 'druckplatte', settings: {
    signal:  'tor-hof',      // Name, frei waehlbar
    modus:   'halten',       // 'halten' | 'rasten'
    gewicht: 1,              // wie viele Koerper noetig sind
    radius:  CELL * 0.62
} }

// Nehmer
{ type: 'schloss', settings: {
    signal:  'tor-hof',
    wirkung: 'oeffnen',      // 'oeffnen' | 'schliessen'
    radius:  CELL * 1.05
} }

// Der Ausgang bekommt eine dritte Bedingung und bleibt abwaertskompatibel
{ type: 'exit', settings: {
    targetRoomId: 'tiefe-wacht',
    condition:    'signal',   // 'clear' und 'always' funktionieren unveraendert
    signal:       'ausgang-frei'
} }
```

Dazu ein Signalbrett pro Raum - eine `Map` von Name auf Wahrheitswert. Ein
Geber schreibt hinein, die Nehmer horchen. Beim Raumwechsel wird es geleert.

Als Gewicht auf einer Platte zaehlen Spieler, abgelegte Faesser, geschobene
Felsen und Gegner. Ein Ork, der auf die Platte gedraengt wird, haelt das Tor
also auf.

Ein Signalschloss bewegt nur Bauteile, deren Katalogeintrag
`signalBeweglich: true` traegt. Ohne diese Bedingung wuerde es auch den Boden
heben, denn Boeden sind begehbar. Gekennzeichnet sind Tor, Hoelzerner Steg und
Wachtbruecke.

## Faesser tragen

Das Vorratsfass ist `solid: true` und zerstoerbar. Dazu kam das Aufheben.

- Aufheben: das Fass haengt an einem Tragesockel vor der Brust
- Ablegen: setzt es auf den Boden, wo es als Gewicht zaehlt
- Werfen: Wurfbahn, zerbricht beim Aufprall
- Auf Gegner werfen: Schaden und kraeftige Wucht

Der Preis macht es zum Spiel: Wer traegt, kann nicht angreifen, nicht blocken
und nicht haken. Dafuer haelt er einen Schuss in der Hand.

Das Fass als Wurfgeschoss ist eine eigene Schadensquelle, kein neuer
Komboschritt. Der eingefrorene Kampfkern bleibt unberuehrt.

## Felsbloecke schieben

Der Felsblock ist genau eine Zelle gross - 2,35 x 2,35, halbe Zelle hoch. Ein
Block, der eine Zelle fuellt, kann nur buendig oder schief liegen. Darum
rueckt er Feld fuer Feld vor, auf die vier Rasterachsen eingerastet.

Voraussetzung ist das Armband der unbaendigen Ahnenkraft. Es erlaubt das
Tragen nicht erst, sondern erweitert: Felsen werden schiebbar, und geworfene
Faesser fliegen um Faktor 1,45 schneller und haerter. Damit wird jeder Fels,
der bisher Deko war, rueckwirkend zum Werkzeug.

## Drei Raetsel

### 01 - Das Gewicht der Wacht (Wachhof)

Ein Tor sperrt den Weg. Davor liegt eine Druckplatte im Modus `halten` - sie
haelt das Tor nur offen, solange etwas darauf steht. Der Spieler kann sich
selbst daraufstellen und sieht das Tor aufgehen. Nur kommt er dann nicht
hindurch. Zwei Schritte weiter steht ein Fass.

Gebaut und geprueft. Steht neben dem Hauptweg, damit ein Fehler niemanden
einsperrt.

### 02 - Die kalte Flamme (Tiefe Wacht)

Drei Fackeln an der Wand, zwei warme und eine Runenflamme. Die Bruecke faehrt
nur aus, wenn allein die blaue brennt. Ein geworfenes Fass loescht eine
Flamme, ein Treffer entzuendet sie wieder.

Die beiden Fackelfarben stehen samt Animation und Lichtfarbe bereits im
Katalog - die Zustaende sind modelliert, aber noch nicht abgefragt.

### 03 - Der schlafende Anker (Wachtschlucht)

Ueber dem Abgrund haengt ein Wachtanker, der nicht greift. Erst wenn der
Hueter faellt, erwacht das Wachtmal - und mit ihm der Anker. Der Satz "Das
ruhende Wachtmal erwacht nach dem Sieg ueber den Hueter" steht bereits als
Text im Code und hat bisher keine Wirkung.

## Was unangetastet bleibt

- Der Kampfvertrag. Trefferfenster, Wucht, Rueckstoss und Kamera werden nicht
  beruehrt. Das System liegt daneben, nicht darin.
- Das Speicherformat. Raumdaten bleiben in Format 3 lesbar. Neue Markerfelder
  reisen im vorhandenen `settings`-Objekt mit.
- Der Ausgang. `condition: 'clear'` arbeitet unveraendert weiter, alle vier
  Raeume laufen ohne Anpassung.

## Warum das nach Godot mitgeht

Signale sind Zeichenketten und Wahrheitswerte, mehr nicht. Kein Verweis, kein
Objektzeiger, nichts, was an Three.js haengt. Das Signalbrett ist eine
Tabelle, die sich genauso in eine Godot-Ressource schreibt wie die Raumdaten
heute - und Godot kennt den Begriff Signal ohnehin.

Der Kernexport bekommt dadurch einen Eintrag mehr, keine neue Struktur.

## Reihenfolge

1. Tragen, Ablegen, Werfen - erledigt
2. Signalbrett, Druckplatte, Tor - erledigt
3. Raetsel 01 im Wachhof - erledigt
4. Fackel und Anker als Rollen nachziehen - offen
5. Verzweigte Ausgaenge; `targetRoomId` ist schon eine Einstellung - offen
6. Groessere Level, wenn ein Raum mehr als eine Frage stellen kann - offen

Der Aufwand liegt in Schritt 1 und 2. Ab Schritt 3 zahlt der Editor zurueck.
