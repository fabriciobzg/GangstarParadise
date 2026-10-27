"""Gera site/data.js a partir dos CSVs da PokéAPI (github.com/PokeAPI/pokeapi).

Uso: python3 tools/build_data.py <pasta_com_csvs>
"""
import csv, json, os, sys, urllib.request

BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
FILES = ["pokemon", "pokemon_stats", "pokemon_types", "pokemon_species", "pokemon_abilities",
         "ability_names", "pokemon_species_flavor_text", "pokemon_forms", "pokemon_form_names",
         "pokemon_species_names"]
TYPES = {1: "normal", 2: "fighting", 3: "flying", 4: "poison", 5: "ground", 6: "rock", 7: "bug", 8: "ghost",
         9: "steel", 10: "fire", 11: "water", 12: "grass", 13: "electric", 14: "psychic", 15: "ice",
         16: "dragon", 17: "dark", 18: "fairy"}
EN = "9"
SKIP_ANY = ("totem", "power-construct", "battle-bond", "own-tempo", "magearna-original",
            "minior-orange", "minior-yellow", "minior-green", "minior-blue", "minior-indigo", "minior-violet",
            "pikachu-")
# Formas puramente cosméticas ou de evento que só poluem a base
SKIP_SUFFIX = ("-totem", "-gmax", "-cap", "-starter", "-cosplay", "-rock-star", "-belle", "-pop-star",
               "-phd", "-libre", "-busted", "-totem-busted", "-eternamax")


def load(folder, name):
    path = os.path.join(folder, name + ".csv")
    if not os.path.exists(path):
        urllib.request.urlretrieve(BASE + name + ".csv", path)
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main(folder):
    os.makedirs(folder, exist_ok=True)
    d = {n: load(folder, n) for n in FILES}
    species = {r["id"]: r for r in d["pokemon_species"]}
    sp_name = {r["pokemon_species_id"]: r["name"] for r in d["pokemon_species_names"] if r["local_language_id"] == EN}
    genus = {r["pokemon_species_id"]: r["genus"] for r in d["pokemon_species_names"] if r["local_language_id"] == EN}
    stats, types, abil = {}, {}, {}
    for r in d["pokemon_stats"]:
        stats.setdefault(r["pokemon_id"], {})[int(r["stat_id"])] = int(r["base_stat"])
    for r in sorted(d["pokemon_types"], key=lambda r: int(r["slot"])):
        if int(r["type_id"]) in TYPES:
            types.setdefault(r["pokemon_id"], []).append(TYPES[int(r["type_id"])])
    ab_name = {r["ability_id"]: r["name"] for r in d["ability_names"] if r["local_language_id"] == EN}
    for r in sorted(d["pokemon_abilities"], key=lambda r: int(r["slot"])):
        abil.setdefault(r["pokemon_id"], []).append([ab_name.get(r["ability_id"], "?"), int(r["is_hidden"])])
    form_of = {r["pokemon_id"]: r for r in d["pokemon_forms"] if r["is_default"] == "1"}
    form_name = {r["pokemon_form_id"]: r["pokemon_name"] for r in d["pokemon_form_names"]
                 if r["local_language_id"] == EN and r["pokemon_name"]}
    flavor = {}
    for r in d["pokemon_species_flavor_text"]:
        if r["language_id"] == EN and int(r["version_id"]) >= flavor.get(r["species_id"], (0, ""))[0]:
            flavor[r["species_id"]] = (int(r["version_id"]), " ".join(r["flavor_text"].split()))

    out, desc = [], {}
    for p in d["pokemon"]:
        pid, ident = p["id"], p["identifier"]
        if ident.endswith(SKIP_SUFFIX) or any(k in ident for k in SKIP_ANY) or pid not in stats or pid not in types:
            continue
        s = species[p["species_id"]]
        st = stats[pid]
        f = form_of.get(pid)
        name = sp_name.get(p["species_id"], ident)
        if p["is_default"] != "1" and f and f["id"] in form_name:
            name = form_name[f["id"]]
        cat = "mythical" if s["is_mythical"] == "1" else "legendary" if s["is_legendary"] == "1" else "normal"
        out.append({
            "id": int(pid), "sid": int(p["species_id"]), "slug": ident, "name": name,
            "types": types[pid], "stats": [st[i] for i in range(1, 7)],
            "gen": int(s["generation_id"]), "cat": cat,
            "baby": s["is_baby"] == "1",
            "form": p["is_default"] != "1",
            "mega": bool(f and f["is_mega"] == "1") or "-mega" in ident or "-primal" in ident,
            "h": int(p["height"]), "w": int(p["weight"]),
            "abil": abil.get(pid, []), "chain": int(s["evolution_chain_id"] or 0),
            "from": int(s["evolves_from_species_id"] or 0), "genus": genus.get(p["species_id"], ""),
        })
        desc[p["species_id"]] = flavor.get(p["species_id"], (0, ""))[1]
    out.sort(key=lambda x: (x["sid"], x["form"], x["id"]))
    root = os.path.join(os.path.dirname(__file__), "..", "site")
    with open(os.path.join(root, "data.js"), "w", encoding="utf-8") as fh:
        fh.write("// Gerado por tools/build_data.py a partir da PokéAPI. Não edite à mão.\n")
        fh.write("window.POKEDATA=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
        fh.write("window.POKEDESC=" + json.dumps(desc, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(len(out), "pokémon gravados")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "csv")
