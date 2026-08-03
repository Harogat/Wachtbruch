# Wachtbruch-Eigenassets

Diese Eigenassets bilden ein zusammengehoeriges Laufzeitmodul:

- `Wachtanker_von_Ahnhoehe.glb`: platzierbares Enterhakenziel mit `Grapple_Target`
- `Enterhaken_von_Ahnhoehe.glb`: sichtbarer Haken mit `Hook_Impact` und modularen Kettengliedern
- `Wachtmal_von_Ahnhoehe.glb`: ruhendes und erwachtes Abschlussobjekt der Bruchkammer
- `Wachtfackel_von_Ahnhoehe_Gelb.glb`: warme, animierte Wachtflamme
- `Wachtfackel_von_Ahnhoehe_Blau.glb`: animierte blaue Runenflamme

Die gleichnamigen `metadata.json`-Dateien dokumentieren Einheiten, Pivot, Knoten,
Animationsclips und vorgesehene Laufzeitzustaende. Alle Modelle verwenden Meter,
Y als Hochachse und werden im Web-Prototyp deshalb ohne Kenney-Skalierungsfaktor
geladen. Die Fackeln besitzen eingebettete Punktlichter und laufen in einem
2,4-Sekunden-Loop. Export-Collider mit dem Praefix `COLLIDER_` bleiben im
Renderer unsichtbar.

Fuer die Godot-Migration sind die stabilen Asset-IDs:

- `wachtanker-ahnhoehe`
- `enterhaken-ahnhoehe`
- `wachtmal-ahnhoehe`
- `wachtfackel-ahnhoehe-gelb`
- `wachtfackel-ahnhoehe-blau`
