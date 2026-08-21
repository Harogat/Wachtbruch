# Wachtbruch: Bauplan eines Raums

Stand: 2026-08-21

Alle Masse in diesem Dokument sind am laufenden Spiel gemessen, keine
allgemeinen Regeln.

## Die eine Zahl, die alles bestimmt

Die Kamera haengt bei `followOffset (11.5, 12.5, 14.5)`, also 22,3 Einheiten
hinter der Figur, mit 40 Grad Blickwinkel. Daraus folgt, wie viel Welt
gleichzeitig sichtbar ist:

| Blickfeld ab der Figur | Breitbild 16:9 | Hochkant |
| --- | ---: | ---: |
| nach vorn, von der Kamera weg | 16,1 Zellen | 16,1 |
| zur Seite | 6,1 | 1,8 |
| nach hinten, zur Kamera | 3,7 | 3,7 |

Im Hochformat sieht der Spieler 3,6 Zellen Breite. Das Spielfeld ist 12,7
Zellen breit. Ein Kampf ueber die volle Breite findet auf dem Handy zur
Haelfte ausserhalb des Bildes statt.

Nach hinten bleiben ueberall nur 3,7 Zellen Vorwarnung. Ein Gegner von dort
ist etwa eine Sekunde sichtbar, bevor er zuschlaegt.

## Was der Raum hergibt

| Groesse | Wert |
| --- | ---: |
| Spielfeld | 12,7 x 8,7 Zellen, rund 110 |
| Zelle (`CELL`) | 2,35 |
| Ebenenhoehe (`LEVEL_HEIGHT`) | 2,115 |
| Maximale Stufe ohne Treppe (`COMBAT_SURFACE_STEP`) | 0,705 |
| Figurhoehe | 1,775 |
| Reichweite der Spielerschlaege | 0,86 bis 1,46 Zellen |
| Speerwerfer: schiesst / haelt / weicht | 3,75 / 2,25 / 1,35 |
| Nahkaempfer umkreisen mit | 0,9 |
| Enterhaken | 5,8 Zellen |
| Druckplatte spuert | 0,62 |

## Sechs Regeln

### 1. Ein Raum ist eine Buehne, kein Labyrinth

Nach vorn sind 16,1 Zellen sichtbar, der Raum ist 8,7 tief. Man sieht immer
alles. Struktur entsteht also nicht durch Verstecken, sondern durch
Silhouette: hoch gegen flach, eng gegen offen, hell gegen dunkel. Ein
Geheimgang waere in diesem Spiel eine Luege.

### 2. In der Mitte bleiben vier mal vier Zellen frei

Nahkaempfer umkreisen den Spieler mit Radius 0,9. Zwei von ihnen plus die
eigene Ausholbewegung brauchen rund 3,6 Zellen freien Boden. Aufgerundet: ein
freies Quadrat von 4 x 4. Alles, was hineinragt, macht aus einem Kampf ein
Verhaken.

### 3. Der Speerwerfer braucht fuenf Zellen Luft

Er schiesst ab 3,75, will auf 2,25 stehen und weicht unter 1,35 zurueck. In
einer Kampfzone unter fuenf Zellen Durchmesser findet er seinen Abstand nie
und klebt an der Wand. Wo ein Speerwerfer steht, gehoeren mindestens fuenf
Zellen Tiefe hin.

### 4. Es gibt nur zwei Hoehen

Boden und eine Ebene hoeher: 0 und 2,115. Dazwischen liegt eine tote Zone von
0,705 bis 2,115 - zu hoch zum Hinaufsteigen, zu niedrig fuer eine Treppe. Wer
dort etwas platziert, baut eine Kante, die nur aergert. Hoehen sind ganze
Ebenen oder gar nichts.

### 5. Nichts Wichtiges hinter dem Spieler

3,7 Zellen Vorwarnung nach hinten. Gegner, Fallen und Truhen gehoeren vor die
Figur oder seitlich. Was von hinten kommt, ist keine Herausforderung, sondern
ein Ueberfall - und der Spieler gibt dem Spiel die Schuld, nicht sich.

### 6. Requisiten an den Rand, eine je zwoelf Zellen

Die Raeume tragen heute vier bis neun Requisiten auf 110 Zellen. Das liest
sich sauber. Bei ungefaehr einer pro zwoelf Zellen bleiben, und an den Rand
damit. Faesser, Felsen und Fackeln am Rand sind Deckung, Werkzeug und
Orientierung. In der Mitte sind sie nur Hindernis.

## Die fuenf Zonen

Jeder Raum bekommt dieselben fuenf Bereiche. Nicht als Schablone, sondern
damit der Spieler nach dem zweiten Raum weiss, wie ein Raum zu lesen ist.

| Zone | Mass | Inhalt |
| --- | --- | --- |
| Ankunft | 2 Zellen tief | Kein Gegner, keine Falle. Der Kampftrigger liegt bei z 2,85, davor ist Ruhe. |
| Kampfkreis | mindestens 4 x 4, besser 5 x 5 | Voellig frei. Kein Fass, kein Fels, keine Saeule. |
| Randzone | 1 bis 2 Zellen breit | Faesser, Felsen, Fackeln, Banner. Deckung, Werkzeug, Orientierung. |
| Nische | 2 x 3 Zellen | Platte, Tor, Truhe. Abseits des Kampfwegs, aber sichtbar. |
| Ausgang | gegenueber der Ankunft | Von der Ankunft aus sichtbar. Das Ziel ist von Anfang an klar. |

## Woran man einen vollgestopften Raum erkennt

- Requisiten gleichmaessig ueber den Boden verteilt statt an den Raendern
- Etwas steht im mittleren 4 x 4, und sei es ein einzelnes Fass
- Mehr als drei verschiedene Requisitenarten in einem Raum
- Hoehen, die keine ganze Ebene sind
- Deko, die man weglassen koennte, ohne dass etwas fehlt

Die Probe: Nimm ein Requisit weg. Fehlt nichts, gehoerte es nicht hin. Ein
Raum ist fertig, wenn man nichts mehr wegnehmen kann, ohne dass er aermer
wird.

## Was ein Raum koennen soll

Jeder Raum stellt eine Frage und beantwortet sie. Nicht drei.

| Raum | Frage | Neu darin |
| --- | --- | --- |
| Wachhof | Kannst du kaempfen? | Schwert, Kombo |
| Tiefe Wacht | Kannst du Gewicht bewegen? | Fass, Druckplatte |
| Bruchkammer | Kannst du unter Druck bestehen? | Boss, Armband als Lohn |
| Wachtschlucht | Kannst du Wege schaffen? | Fels schieben, Enterhaken |

Vier Raeume, vier Fragen, vier neue Faehigkeiten. Wenn ein Raum keine eigene
Frage hat, ist er ein Gang - und Gaenge braucht ein Spiel mit vier Raeumen
nicht.
