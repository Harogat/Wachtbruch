# Wachtbruch: Combat Core v1

Stand: 2026-07-25

## Zweck

Dieser Vertrag friert den ersten belastbaren Kampfkern ein. Weitere Inhalte
duerfen ihn erweitern, aber Treffer, Bewegung und Kamera nicht still
umdeuten. Der Web-Prototyp und die spaetere Godot-Runtime sollen dieselben
Daten und dieselbe wahrnehmbare Reihenfolge verwenden.

## Fester Ablauf eines Angriffs

1. Eingabe waehlt einen Eintrag aus `modules/catalog/attacks.js`.
2. `duration` und `animationSpeed` bestimmen die Bewegungsdauer.
3. `hitStart` und `hitEnd` oeffnen genau ein Trefferfenster.
4. `lunge`, `lungeStart` und `lungeEnd` bewegen den Angreifer kontrolliert.
5. `chainAt` gibt den naechsten Komboschritt frei.
6. Die einstellbare Kombopause liegt zwischen zwei Schritten.
7. Schaden und Wucht werden erst im Trefferfenster aufgeloest.
8. Ein Weltkontakt vor dem Ziel schliesst das Trefferfenster sofort.

Ein gehaltenes Aufladen ist ein eigener Angriff und kein versteckter
Komboschritt.

## Waffenabpraller an Weltgeometrie

Der gemeinsame Datenvertrag steht in
`modules/combat/weapon-rebound.js`. Jeder Angriff besitzt einen
nachvollziehbaren Schwungwinkel und mehrere kurze Fuehler entlang der
Waffenbahn.

- Feste Mauern, Saeulen, Raumgrenzen, geschlossene Tore,
  Hoehenbegrenzungen und Treppenflanken stoppen die Waffenbahn.
- Der Angriff endet am ersten Weltkontakt und kann danach keinen Gegner
  hinter der Geometrie treffen.
- Ein kurzer, kollisionsgepruefter Rueckimpuls ersetzt ein hartes
  Zurueckteleportieren.
- Helle 3D-Funken, ein kurzer Lichtimpuls und ein metallischer Kontaktklang
  machen den Grund des Abbruchs lesbar.
- Zerstoerbare Faesser bleiben regulaere Ziele. Ihr Treffer wird vor dem
  Weltabpraller aufgeloest.

## Trefferprofile fuer Ra

Die stabilen Profile stehen in `modules/combat/hit-reactions.js`:

| Profil | Einsatz | Wirkung |
| --- | --- | --- |
| `blocked` | Schild faengt einen blockbaren Treffer | sehr kurze Reaktion, kein Lebensverlust |
| `light` | normaler Nah- oder Fernkampftreffer | klarer Impuls und kurze Kontrolleinschraenkung |
| `heavy` | Boss, mindestens 2 Schaden oder starke Wucht | laengere Reaktion und staerkeres Trefferfeedback |
| `environment` | Kantensturz oder Abgrund | kurze Landungs-/Ruecksetzreaktion ohne Kampfschlag-Gefuehl |

Rueckstoss ist eine gedaempfte Bewegung ueber mehrere Frames. Er darf den
Spieler nicht sofort versetzen und muss Kollision, Stufen und begehbare
Hoehen respektieren.

## Kameravertrag

Die Kamera folgt der beabsichtigten Blick- und Bewegungsrichtung. Sie folgt
nicht der kurzfristigen Modellrotation einer Attacke oder eines
Rundumschlags. Richtungswechsel werden weich angenaehert; Trefferfeedback
darf diese Basis nur kurz ueberlagern.

## Referenzpruefung

Der Browser-Kernlauf wurde auf folgenden Situationen geprueft:

- Ebene: normaler Treffer kostet 1 Leben.
- Block: Treffer wird registriert, kostet aber kein Leben.
- Wand: Rueckstoss endet vor fester Geometrie.
- Treppe: Treffer und Rueckstoss bleiben auf dem begehbaren Hoehenprofil.
- Kante: feste Aussenbegrenzung verhindert ein unbeabsichtigtes Verlassen.
- Waffenbahn: ein Schlag an fester Geometrie endet, erzeugt Funken und
  verursacht keinen Treffer durch die Wand.
- Zerstoerbares Ziel: ein Fass nimmt weiterhin den regulaeren Angriff an.
- Kombo: drei rechtzeitig eingegebene Angriffe werden als drei Angriffe und
  drei Treffer ausgewertet.
- Kamera: ein gehaltener Angriff verschiebt den Kameravorlauf nicht durch
  seine Animationsrotation.

`node --experimental-default-type=module tools/verify-core.mjs` prueft
zusaetzlich die Datenvertraege, Profilwahl und Godot-Exportform.

## Menschlicher Gefuehlstest

Nach technischen Aenderungen werden drei Situationen kurz gespielt:

1. normaler Treffer
2. schwerer Treffer
3. geblockter Treffer

Pro Situation reicht zuerst ein Wort: `griffig`, `weich`, `hart`, `lang`,
`hektisch` oder `unlesbar`. Erst danach werden Werte geaendert. So bleibt
Gefuehl eine bewusste Abnahme und wird nicht mit neuen Funktionen vermischt.
