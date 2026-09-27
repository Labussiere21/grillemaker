"""Génère bibliotheque/index.json à partir des fichiers .grille du dossier (lancé par la GitHub Action)."""
import glob
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bibliotheque")
items = []
for path in glob.glob(os.path.join(ROOT, "*.grille")):
    name = os.path.basename(path)
    try:
        with open(path, encoding="utf-8-sig") as f:
            d = json.load(f)
    except Exception as e:  # fichier illisible : on l'ignore sans casser la publication
        print(f"ignoré : {name} ({e})")
        continue
    items.append({
        "file": name,
        "title": (d.get("title") or os.path.splitext(name)[0]).strip(),
        "artist": (d.get("artist") or "").strip(),
        "key": (d.get("key") or "").strip(),
        "parts": len(d.get("structure") or []),
        "grids": len(d.get("sections") or []),
    })
items.sort(key=lambda x: (x["artist"].lower(), x["title"].lower()))
with open(os.path.join(ROOT, "index.json"), "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=1)
print(f"{len(items)} morceau(x) dans la bibliothèque")
