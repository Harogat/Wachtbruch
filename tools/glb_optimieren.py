"""
GLB-Optimierer fuer Wachtbruch.

Macht drei Dinge, alle verlustfrei fuer das Aussehen:

  1. UV-Koordinaten wegwerfen, wenn das Modell keine einzige Textur hat.
  2. Doppelte Vertices verschmelzen und einen Indexpuffer bauen.
     Viele Exporte liefern jedes Dreieck mit drei eigenen Vertices aus.
  3. Vertexfarben von float32 auf normalisierte uint8 bringen.

Animationen, Knoten, Materialien und Namen bleiben unangetastet.

    python glb_optimieren.py eingabe.glb ausgabe.glb
"""
import json
import struct
import sys
import os

KOMPONENTEN = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
               5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
ANZAHL = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4,
          'MAT2': 4, 'MAT3': 9, 'MAT4': 16}


def lies_glb(pfad):
    roh = open(pfad, 'rb').read()
    if roh[:4] != b'glTF':
        raise ValueError('Keine GLB-Datei')
    off, js, binaer = 12, None, b''
    while off < len(roh):
        laenge, typ = struct.unpack_from('<I4s', roh, off)
        inhalt = roh[off + 8:off + 8 + laenge]
        if typ == b'JSON':
            js = json.loads(inhalt.decode('utf-8'))
        elif typ.rstrip(b'\x00') == b'BIN':
            binaer = inhalt
        off += 8 + laenge + ((4 - laenge % 4) % 4 if laenge % 4 else 0)
    return js, binaer


def lies_accessor(g, binaer, index):
    acc = g['accessors'][index]
    anzahl = ANZAHL[acc['type']]
    fmt, groesse = KOMPONENTEN[acc['componentType']]
    if 'bufferView' not in acc:
        return [tuple([0] * anzahl)] * acc['count']
    bv = g['bufferViews'][acc['bufferView']]
    start = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = bv.get('byteStride') or anzahl * groesse
    werte = []
    for i in range(acc['count']):
        o = start + i * stride
        werte.append(struct.unpack_from('<' + fmt * anzahl, binaer, o))
    return werte


def hat_texturen(g):
    if g.get('textures') or g.get('images'):
        return True
    for m in g.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        for wert in pbr.values():
            if isinstance(wert, dict) and 'index' in wert:
                return True
        for schluessel in ('normalTexture', 'occlusionTexture', 'emissiveTexture'):
            if schluessel in m:
                return True
    return False


def optimiere(eingabe, ausgabe):
    g, binaer = lies_glb(eingabe)
    uv_weg = not hat_texturen(g)

    puffer = bytearray()
    neue_views = []
    neue_accs = []

    def schreibe(daten, ziel=None):
        while len(puffer) % 4:
            puffer.append(0)
        offset = len(puffer)
        puffer.extend(daten)
        view = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(daten)}
        if ziel:
            view['target'] = ziel
        neue_views.append(view)
        return len(neue_views) - 1

    def neuer_acc(werte, typ, comp_typ, ziel=None, normalisiert=False):
        anzahl = ANZAHL[typ]
        fmt, _ = KOMPONENTEN[comp_typ]
        roh = bytearray()
        for w in werte:
            roh.extend(struct.pack('<' + fmt * anzahl, *w))
        acc = {
            'bufferView': schreibe(roh, ziel),
            'componentType': comp_typ,
            'count': len(werte),
            'type': typ
        }
        if normalisiert:
            acc['normalized'] = True
        if typ == 'VEC3' and comp_typ == 5126:
            spalten = list(zip(*werte)) if werte else [(0,), (0,), (0,)]
            acc['min'] = [min(s) for s in spalten]
            acc['max'] = [max(s) for s in spalten]
        neue_accs.append(acc)
        return len(neue_accs) - 1

    vorher_v = 0
    nachher_v = 0
    dreiecke = 0
    # Vor dem Umschreiben merken, welche Accessoren zu Meshes gehoeren.
    mesh_accs = set()
    for mesh in g.get('meshes', []):
        for prim in mesh.get('primitives', []):
            mesh_accs.update(prim['attributes'].values())
            if 'indices' in prim:
                mesh_accs.add(prim['indices'])

    for mesh in g.get('meshes', []):
        for prim in mesh.get('primitives', []):
            attrs = prim['attributes']
            namen = [n for n in attrs if not (uv_weg and n.startswith('TEXCOORD'))]
            daten = {n: lies_accessor(g, binaer, attrs[n]) for n in namen}
            anzahl_v = len(next(iter(daten.values())))
            vorher_v += anzahl_v

            if 'indices' in prim:
                indizes = [i[0] for i in lies_accessor(g, binaer, prim['indices'])]
            else:
                indizes = list(range(anzahl_v))
            dreiecke += len(indizes) // 3

            # verschmelzen
            karte = {}
            neu_idx = []
            neue_daten = {n: [] for n in namen}
            for i in indizes:
                schluessel = tuple(round(k, 6) for n in namen for k in daten[n][i])
                ziel = karte.get(schluessel)
                if ziel is None:
                    ziel = len(neue_daten[namen[0]])
                    karte[schluessel] = ziel
                    for n in namen:
                        neue_daten[n].append(daten[n][i])
                neu_idx.append(ziel)
            nachher_v += len(neue_daten[namen[0]])

            neue_attrs = {}
            for n in namen:
                werte = neue_daten[n]
                alt = g['accessors'][attrs[n]]
                if n.startswith('COLOR') and alt['componentType'] == 5126:
                    umgewandelt = [tuple(max(0, min(255, round(k * 255))) for k in w) for w in werte]
                    neue_attrs[n] = neuer_acc(umgewandelt, alt['type'], 5121, 34962, normalisiert=True)
                else:
                    neue_attrs[n] = neuer_acc(werte, alt['type'], alt['componentType'], 34962)
            prim['attributes'] = neue_attrs

            hoechster = max(neu_idx) if neu_idx else 0
            idx_typ = 5123 if hoechster < 65536 else 5125
            prim['indices'] = neuer_acc([(i,) for i in neu_idx], 'SCALAR', idx_typ, 34963)

    # alles andere (Animationen, Skins) unveraendert uebernehmen
    umlenkung = {}
    for alt_i, acc in enumerate(list(g.get('accessors', []))):
        if alt_i in mesh_accs:
            continue
        werte = lies_accessor(g, binaer, alt_i)
        neu = neuer_acc(werte, acc['type'], acc['componentType'])
        if 'min' in acc:
            neue_accs[neu]['min'] = acc['min']
        if 'max' in acc:
            neue_accs[neu]['max'] = acc['max']
        umlenkung[alt_i] = neu

    for anim in g.get('animations', []):
        for s in anim['samplers']:
            s['input'] = umlenkung.get(s['input'], s['input'])
            s['output'] = umlenkung.get(s['output'], s['output'])
    for skin in g.get('skins', []):
        if 'inverseBindMatrices' in skin:
            skin['inverseBindMatrices'] = umlenkung.get(
                skin['inverseBindMatrices'], skin['inverseBindMatrices'])

    g['accessors'] = neue_accs
    g['bufferViews'] = neue_views
    g['buffers'] = [{'byteLength': len(puffer)}]

    js_roh = json.dumps(g, separators=(',', ':')).encode('utf-8')
    js_roh += b' ' * ((4 - len(js_roh) % 4) % 4)
    bin_roh = bytes(puffer) + b'\x00' * ((4 - len(puffer) % 4) % 4)
    gesamt = 12 + 8 + len(js_roh) + 8 + len(bin_roh)
    with open(ausgabe, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, gesamt))
        f.write(struct.pack('<I4s', len(js_roh), b'JSON'))
        f.write(js_roh)
        f.write(struct.pack('<I4s', len(bin_roh), b'BIN\x00'))
        f.write(bin_roh)

    alt = os.path.getsize(eingabe)
    neu = os.path.getsize(ausgabe)
    print(f"{os.path.basename(eingabe)}")
    print(f"  Dreiecke   {dreiecke}  (unveraendert)")
    print(f"  Vertices   {vorher_v} -> {nachher_v}   ({nachher_v/max(1,vorher_v)*100:.0f} %)")
    print(f"  UV         {'entfernt, keine Texturen vorhanden' if uv_weg else 'behalten'}")
    print(f"  Datei      {alt/1024:.0f} KB -> {neu/1024:.0f} KB   ({(1-neu/alt)*100:.0f} % kleiner)")


if __name__ == '__main__':
    optimiere(sys.argv[1], sys.argv[2])
