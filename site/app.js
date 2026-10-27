/* PokéHub — base de dados de Pokémon no estilo FUTBIN / eFootball Hub.
 * Tudo roda no navegador a partir de window.POKEDATA (gerado por tools/build_data.py). */
(() => {
  "use strict";

  // ---------- Tipos ----------
  const TYPES = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground",
    "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
  const TYPE_PT = {
    normal: "Normal", fire: "Fogo", water: "Água", grass: "Planta", electric: "Elétrico", ice: "Gelo",
    fighting: "Lutador", poison: "Venenoso", ground: "Terrestre", flying: "Voador", psychic: "Psíquico",
    bug: "Inseto", rock: "Pedra", ghost: "Fantasma", dragon: "Dragão", dark: "Sombrio", steel: "Aço", fairy: "Fada",
  };
  const TYPE_COLOR = {
    normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", grass: "#7AC74C", electric: "#F7D02C", ice: "#96D9D6",
    fighting: "#C22E28", poison: "#A33EA1", ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587",
    bug: "#A6B91A", rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746", steel: "#B7B7CE", fairy: "#D685AD",
  };
  const DARK_TEXT = new Set(["normal", "electric", "ice", "ground", "bug", "rock", "steel", "grass", "fairy", "flying", "fire"]);
  // atacante -> [super efetivo], [pouco efetivo], [sem efeito]
  const CHART_SRC = {
    normal: [[], ["rock", "steel"], ["ghost"]],
    fire: [["grass", "ice", "bug", "steel"], ["fire", "water", "rock", "dragon"], []],
    water: [["fire", "ground", "rock"], ["water", "grass", "dragon"], []],
    grass: [["water", "ground", "rock"], ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"], []],
    electric: [["water", "flying"], ["electric", "grass", "dragon"], ["ground"]],
    ice: [["grass", "ground", "flying", "dragon"], ["fire", "water", "ice", "steel"], []],
    fighting: [["normal", "ice", "rock", "dark", "steel"], ["poison", "flying", "psychic", "bug", "fairy"], ["ghost"]],
    poison: [["grass", "fairy"], ["poison", "ground", "rock", "ghost"], ["steel"]],
    ground: [["fire", "electric", "poison", "rock", "steel"], ["grass", "bug"], ["flying"]],
    flying: [["grass", "fighting", "bug"], ["electric", "rock", "steel"], []],
    psychic: [["fighting", "poison"], ["psychic", "steel"], ["dark"]],
    bug: [["grass", "psychic", "dark"], ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"], []],
    rock: [["fire", "ice", "flying", "bug"], ["fighting", "ground", "steel"], []],
    ghost: [["psychic", "ghost"], ["dark"], ["normal"]],
    dragon: [["dragon"], ["steel"], ["fairy"]],
    dark: [["psychic", "ghost"], ["fighting", "dark", "fairy"], []],
    steel: [["ice", "rock", "fairy"], ["fire", "water", "electric", "steel"], []],
    fairy: [["fighting", "dragon", "dark"], ["fire", "poison", "steel"], []],
  };
  const CHART = {};
  for (const a of TYPES) {
    CHART[a] = {};
    for (const d of TYPES) CHART[a][d] = 1;
    const [se, nve, imm] = CHART_SRC[a];
    se.forEach(d => (CHART[a][d] = 2));
    nve.forEach(d => (CHART[a][d] = 0.5));
    imm.forEach(d => (CHART[a][d] = 0));
  }
  const eff = (atk, defTypes) => defTypes.reduce((m, d) => m * CHART[atk][d], 1);

  const STAT_PT = ["PS", "Ataque", "Defesa", "At. Esp.", "Def. Esp.", "Velocidade"];
  const STAT_AB = ["PS", "ATQ", "DEF", "AES", "DES", "VEL"];
  const GEN_REGION = ["", "Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"];

  // ---------- Dados derivados ----------
  const ALL = window.POKEDATA;
  const DESC = window.POKEDESC || {};
  const BY_SLUG = new Map(ALL.map(p => [p.slug, p]));
  const BY_SID = new Map();
  ALL.forEach(p => { if (!BY_SID.has(p.sid)) BY_SID.set(p.sid, []); BY_SID.get(p.sid).push(p); });
  const HAS_EVO = new Set(ALL.map(p => p.from).filter(Boolean));

  ALL.forEach(p => {
    const [hp, at, df, sa, sd, sp] = p.stats;
    p.bst = hp + at + df + sa + sd + sp;
    p.final = !HAS_EVO.has(p.sid);
    p.leg = p.cat !== "normal";
    p.lv = { hp: hp + 75, at: at + 20, df: df + 20, sa: sa + 20, sd: sd + 20, sp: sp + 20 };
    p.role = roleOf(p);
    // Habilidades que travam o Pokémon em batalha (Truant ataca em turnos alternados, Slow Start corta o Ataque).
    const ab = p.abil.map(x => x[0]);
    p.dmgMul = ab.length && ab.every(x => x === "Truant") ? 0.5 : ab.length && ab.every(x => x === "Slow Start") ? 0.6 : 1;
  });

  function roleOf(p) {
    const [hp, at, df, sa, sd, sp] = p.stats;
    const off = Math.max(at, sa);
    if (at >= 100 && sa >= 100 && Math.abs(at - sa) <= 15) return ["MX", "Atacante misto"];
    if (sp >= 95 && off >= 95) return at >= sa ? ["SF", "Sweeper físico"] : ["SE", "Sweeper especial"];
    if (off >= 110 && sp < 70) return at >= sa ? ["DF", "Demolidor físico"] : ["DE", "Demolidor especial"];
    if (off < 100 && (df >= 110 || sd >= 110 || hp >= 120)) {
      if (df >= sd + 20) return ["MF", "Muralha física"];
      if (sd >= df + 20) return ["ME", "Muralha especial"];
      return ["TQ", "Tanque"];
    }
    if (sp >= 100) return ["VL", "Veloz / suporte"];
    if (off >= 100) return at >= sa ? ["AF", "Atacante físico"] : ["AE", "Atacante especial"];
    return ["EQ", "Equilibrado"];
  }

  // ---------- Simulador 1v1 ----------
  // Nível 50, IV 31, sem EVs e natureza neutra. Cada lado usa o melhor golpe STAB de 80 de poder
  // (físico ou especial, o que causar mais dano) ou um golpe neutro de cobertura se isso for melhor.
  function damage(a, b) {
    let best = 1.0 * 0.9; // cobertura neutra sem STAB
    for (const t of a.types) best = Math.max(best, 1.5 * eff(t, b.types));
    const phys = (35.2 * a.lv.at / b.lv.df + 2) * best;
    const spec = (35.2 * a.lv.sa / b.lv.sd + 2) * best;
    return Math.max(phys, spec) * a.dmgMul;
  }
  function hitsToKo(hp, dmg) { return Math.min(99, Math.ceil(hp / dmg - 1e-9)); }
  // >0: A vence (valor = fração de PS que sobra). <0: B vence.
  function duel(a, b) {
    const dA = damage(a, b), dB = damage(b, a);
    const tA = hitsToKo(b.lv.hp, dA), tB = hitsToKo(a.lv.hp, dB);
    const aFirst = () => (tA <= tB ? 1 - (tA - 1) * dB / a.lv.hp : -(1 - tB * dA / b.lv.hp));
    const bFirst = () => (tB <= tA ? -(1 - (tB - 1) * dA / b.lv.hp) : 1 - tA * dB / a.lv.hp);
    let r;
    if (a.lv.sp > b.lv.sp) r = aFirst();
    else if (a.lv.sp < b.lv.sp) r = bFirst();
    else r = (aFirst() + bFirst()) / 2;
    return Math.max(-1, Math.min(1, r));
  }

  // Campo de referência: evoluções finais, sem lendários, sem formas especiais.
  const FIELD = ALL.filter(p => p.final && !p.leg && !p.form);
  ALL.forEach(p => {
    let wins = 0, sum = 0;
    for (const o of FIELD) {
      if (o === p) continue;
      const r = duel(p, o);
      if (r > 0) wins++;
      sum += r;
    }
    p.winrate = wins / (FIELD.length - (FIELD.includes(p) ? 1 : 0));
    p.duelAvg = sum / FIELD.length;
  });

  // Overall 40–99: mistura do percentil de status base com o percentil de vitória no simulador.
  const pctRank = key => {
    const sorted = ALL.map(p => p[key]).sort((x, y) => x - y);
    return v => {
      let lo = 0, hi = sorted.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
      return lo / (sorted.length - 1);
    };
  };
  const bstPct = pctRank("bst"), winPct = pctRank("winrate");
  ALL.forEach(p => { p.power = 0.5 * bstPct(p.bst) + 0.5 * winPct(p.winrate) + 0.0001 * p.bst; });
  const powerPct = pctRank("power");
  ALL.forEach(p => {
    p.ovr = Math.round(40 + 59 * Math.pow(powerPct(p.power), 1.6));
    p.tier = p.mega ? "mega" : p.cat === "mythical" ? "mythic" : p.cat === "legendary" ? "legend"
      : p.ovr >= 75 ? "gold" : p.ovr >= 65 ? "silver" : "bronze";
  });
  const statPct = [0, 1, 2, 3, 4, 5].map(i => {
    const s = ALL.map(p => p.stats[i]).sort((x, y) => x - y);
    return v => { let c = 0; while (c < s.length && s[c] < v) c++; return c / s.length; };
  });
  const bstPctAll = v => bstPct(v);

  // ---------- Utilidades ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SPR = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
  const sprite = p => (window.SPRITES && window.SPRITES[p.id]) || SPR + p.id + ".png";
  const artwork = p => (window.SPRITES ? sprite(p) : SPR + "other/official-artwork/" + p.id + ".png");
  window.__pkfb = (img, sid) => {
    img.onerror = null;
    const base = BY_SID.get(sid)[0];
    img.src = (window.SPRITES && window.SPRITES[base.id]) || SPR + base.id + ".png";
  };
  const img = (p, cls = "", src = sprite(p)) =>
    `<img class="${cls}" src="${src}" alt="${esc(p.name)}" loading="lazy" onerror="__pkfb(this,${p.sid})">`;
  const typeBadge = (t, sm) =>
    `<a class="type${sm ? " sm" : ""}" href="#tipo-${t}" style="background:${TYPE_COLOR[t]};color:${DARK_TEXT.has(t) ? "#1b1b1b" : "#fff"}">${TYPE_PT[t]}</a>`;
  const typeSpan = (t, extra = "", attrs = "") =>
    `<button type="button" class="type ${extra}" ${attrs} style="background:${TYPE_COLOR[t]};color:${DARK_TEXT.has(t) ? "#1b1b1b" : "#fff"}">${TYPE_PT[t]}</button>`;
  const tierLabel = { gold: "Ouro", silver: "Prata", bronze: "Bronze", legend: "Lendário", mythic: "Mítico", mega: "Mega" };
  const pctTxt = r => Math.round(Math.abs(r) * 100) + "%";
  const link = p => "#p-" + p.slug;

  function card(p, big = false) {
    const s = p.stats;
    const art = big && !window.SPRITES ? img(p, "art hd", artwork(p)) : img(p, "art");
    return `<a class="card ${p.tier}${big ? " big" : ""}" href="${link(p)}" title="${esc(p.name)}">
      <span class="tag">${tierLabel[p.tier]} · Gen ${p.gen}</span>
      <span class="ovr"><b>${p.ovr}</b><span>${p.role[0]}</span>
        <span class="tdots">${p.types.map(t => `<i style="background:${TYPE_COLOR[t]}" title="${TYPE_PT[t]}"></i>`).join("")}</span></span>
      ${art}
      <div class="nm">${esc(p.name)}</div>
      <div class="st">
        <div><b>${s[0]}</b>PS</div><div><b>${s[3]}</b>AES</div>
        <div><b>${s[1]}</b>ATQ</div><div><b>${s[4]}</b>DES</div>
        <div><b>${s[2]}</b>DEF</div><div><b>${s[5]}</b>VEL</div>
      </div></a>`;
  }
  function row(p, pos, right) {
    return `<a class="row" href="${link(p)}"><span class="pos">${pos}</span>${img(p)}
      <span class="who"><strong>${esc(p.name)}</strong><span class="types">${p.types.map(t => typeBadge(t, true).replace("<a", "<span").replace("</a>", "</span>")).join("")}</span></span>
      <span class="val">${right ?? `<span class="ovrpill ${p.tier}">${p.ovr}</span>`}</span></a>`;
  }
  const duelTxt = r => r > 0
    ? `<span class="win good">vence · sobra ${pctTxt(r)} PS</span>`
    : `<span class="win bad">perde · rival com ${pctTxt(r)} PS</span>`;

  function poolFilter(opts) {
    return p => (opts.leg || !p.leg) && (opts.mega || !p.mega) && (opts.forms || !p.form || p.mega) && (!opts.final || p.final);
  }

  // ---------- Layout ----------
  const NAV = [["inicio", "Base de dados"], ["rankings", "Rankings por tipo"], ["tiers", "Tier list"],
    ["tipos", "Tabela de tipos"], ["comparar", "Comparar"], ["time", "Montar time"]];
  const app = $("#app");
  app.innerHTML = `
    <header class="top"><div class="wrap">
      <a class="brand" href="#inicio"><span class="ball"></span>Poké<b>Hub</b></a>
      <nav class="nav" id="nav">${NAV.map(([h, t]) => `<a href="#${h}" data-v="${h}">${t}</a>`).join("")}</nav>
      <div class="quick"><input id="quick" type="search" list="dl-all" placeholder="Buscar Pokémon…" aria-label="Buscar Pokémon"></div>
    </div></header>
    <datalist id="dl-all">${ALL.map(p => `<option value="${esc(p.name)}"></option>`).join("")}</datalist>
    <main class="wrap" id="view"></main>
    <footer><div class="wrap">
      Dados de status, tipos e habilidades: <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a> (${ALL.length} Pokémon e formas).
      Overall e simulador 1v1 são cálculos próprios do PokéHub. Pokémon é marca de Nintendo, Game Freak e The Pokémon Company; site de fãs sem afiliação.
    </div></footer>`;
  const view = $("#view");
  const byName = name => {
    const n = name.trim().toLowerCase();
    return ALL.find(p => p.name.toLowerCase() === n) || ALL.find(p => p.slug === n) || ALL.find(p => p.name.toLowerCase().startsWith(n));
  };
  $("#quick").addEventListener("change", e => {
    const p = byName(e.target.value);
    if (p) { location.hash = link(p); e.target.value = ""; }
  });

  // ---------- Base de dados (home) ----------
  const dbState = { q: "", types: new Set(), gen: 0, sort: "ovr", leg: true, mega: true, forms: true, final: false, shown: 60 };
  function viewHome() {
    const top = (fn, n = 5) => ALL.filter(p => !p.leg && !p.mega && !p.form && p.final).sort(fn).slice(0, n);
    view.innerHTML = `
      <section>
        <div><div class="eyebrow">Base de dados · ${ALL.length} Pokémon</div><h1>Todos os Pokémon, com overall e counters</h1>
        <p class="lede">Cada carta mostra o overall (40–99), a função em batalha e os seis status base. Abra um Pokémon para ver fraquezas, quem ganha dele e de quem ele ganha.</p></div>
      </section>
      <section class="highlights">
        ${hl("Maiores overalls (não lendários)", top((a, b) => b.ovr - a.ovr || b.bst - a.bst), p => `<span class="ovrpill ${p.tier}">${p.ovr}</span>`)}
        ${hl("Mais vitórias no 1v1", top((a, b) => b.winrate - a.winrate), p => `<b class="num">${Math.round(p.winrate * 100)}%</b>`)}
        ${hl("Mais rápidos", top((a, b) => b.stats[5] - a.stats[5]), p => `<b class="num">${p.stats[5]} VEL</b>`)}
      </section>
      <section>
        <div class="panel filters">
          <input id="db-q" type="search" placeholder="Filtrar por nome, habilidade ou nº" value="${esc(dbState.q)}" aria-label="Filtrar">
          <select id="db-gen" aria-label="Geração"><option value="0">Todas as gerações</option>
            ${GEN_REGION.slice(1).map((r, i) => `<option value="${i + 1}" ${dbState.gen === i + 1 ? "selected" : ""}>Gen ${i + 1} · ${r}</option>`).join("")}</select>
          <select id="db-sort" aria-label="Ordenar">
            ${[["ovr", "Overall"], ["bst", "Total de status"], ["win", "% vitórias 1v1"], ["dex", "Nº da Pokédex"], ...STAT_PT.map((s, i) => ["s" + i, s])]
              .map(([v, t]) => `<option value="${v}" ${dbState.sort === v ? "selected" : ""}>Ordenar: ${t}</option>`).join("")}
          </select>
          <label class="chk"><input type="checkbox" id="db-leg" ${dbState.leg ? "checked" : ""}> Lendários/míticos</label>
          <label class="chk"><input type="checkbox" id="db-mega" ${dbState.mega ? "checked" : ""}> Megas</label>
          <label class="chk"><input type="checkbox" id="db-forms" ${dbState.forms ? "checked" : ""}> Formas regionais/alternativas</label>
          <label class="chk"><input type="checkbox" id="db-final" ${dbState.final ? "checked" : ""}> Só evolução final</label>
        </div>
        <div class="chips" id="db-types">${TYPES.map(t => typeSpan(t, dbState.types.has(t) ? "on" : dbState.types.size ? "off" : "", `data-t="${t}"`)).join("")}</div>
        <div class="muted" id="db-count"></div>
        <div class="cards" id="db-cards"></div>
        <button class="btn more" id="db-more" type="button">Mostrar mais</button>
      </section>`;
    const upd = () => renderDb();
    $("#db-q").addEventListener("input", e => { dbState.q = e.target.value; dbState.shown = 60; upd(); });
    $("#db-gen").addEventListener("change", e => { dbState.gen = +e.target.value; dbState.shown = 60; upd(); });
    $("#db-sort").addEventListener("change", e => { dbState.sort = e.target.value; upd(); });
    ["leg", "mega", "forms", "final"].forEach(k => $("#db-" + k).addEventListener("change", e => { dbState[k] = e.target.checked; dbState.shown = 60; upd(); }));
    $("#db-types").addEventListener("click", e => {
      const t = e.target.closest("[data-t]"); if (!t) return;
      const k = t.dataset.t;
      dbState.types.has(k) ? dbState.types.delete(k) : dbState.types.size < 2 ? dbState.types.add(k) : (dbState.types.clear(), dbState.types.add(k));
      dbState.shown = 60;
      $("#db-types").querySelectorAll("[data-t]").forEach(b => {
        b.classList.toggle("on", dbState.types.has(b.dataset.t));
        b.classList.toggle("off", dbState.types.size > 0 && !dbState.types.has(b.dataset.t));
      });
      upd();
    });
    $("#db-more").addEventListener("click", () => { dbState.shown += 60; upd(); });
    upd();
  }
  function hl(title, list, right) {
    return `<div class="panel"><h3>${title}</h3><div class="rows">${list.map((p, i) => row(p, i + 1, right(p))).join("")}</div></div>`;
  }
  function renderDb() {
    const q = dbState.q.trim().toLowerCase();
    const f = poolFilter(dbState);
    let list = ALL.filter(p => f(p)
      && (!dbState.gen || p.gen === dbState.gen)
      && [...dbState.types].every(t => p.types.includes(t))
      && (!q || p.name.toLowerCase().includes(q) || String(p.sid) === q || p.abil.some(a => a[0].toLowerCase().includes(q))));
    const s = dbState.sort;
    const key = s === "ovr" ? p => p.ovr * 1000 + p.bst : s === "bst" ? p => p.bst : s === "win" ? p => p.winrate
      : s === "dex" ? p => -(p.sid + (p.form ? 0.5 : 0)) : p => p.stats[+s.slice(1)];
    list.sort((a, b) => key(b) - key(a));
    $("#db-count").textContent = `${list.length} resultado${list.length === 1 ? "" : "s"}`;
    $("#db-cards").innerHTML = list.slice(0, dbState.shown).map(p => card(p)).join("");
    $("#db-more").hidden = list.length <= dbState.shown;
  }

  // ---------- Página do Pokémon ----------
  const ctrState = { pool: "std" };
  function viewMon(p) {
    const s = p.stats;
    const defM = TYPES.map(t => [t, eff(t, p.types)]);
    const groups = [[4, "4×"], [2, "2×"], [0.5, "½×"], [0.25, "¼×"], [0, "0×"]];
    const evo = BY_SID.get(p.sid);
    const chain = ALL.filter(o => o.chain === p.chain && !o.form).sort((a, b) => a.sid - b.sid);
    const forms = evo.filter(o => o !== p);
    const stabHits = p.types.map(t => [t, TYPES.filter(d => CHART[t][d] === 2)]);
    const desc = DESC[p.sid];
    const abil = p.abil.map(a => a[1] ? `${esc(a[0])} <span class="muted">(oculta)</span>` : esc(a[0])).join(", ");
    view.innerHTML = `
      <section class="hero">
        ${card(p, true)}
        <div class="facts">
          <div><div class="eyebrow">#${String(p.sid).padStart(4, "0")} · ${esc(p.genus)} · Gen ${p.gen} (${GEN_REGION[p.gen]})</div>
          <h1>${esc(p.name)}</h1></div>
          <div class="chips">${p.types.map(t => typeBadge(t)).join("")}</div>
          ${desc ? `<p class="flavor" lang="en">“${esc(desc)}”</p>` : ""}
          <dl>
            <div><dt>Overall</dt><dd><span class="ovrpill ${p.tier}">${p.ovr}</span> ${tierLabel[p.tier]}</dd></div>
            <div><dt>Função</dt><dd>${p.role[1]}</dd></div>
            <div><dt>Vitórias 1v1</dt><dd class="num">${Math.round(p.winrate * 100)}% <span class="muted">de ${FIELD.length}</span></dd></div>
            <div><dt>Total de status</dt><dd class="num">${p.bst}</dd></div>
            <div><dt>Altura · Peso</dt><dd class="num">${(p.h / 10).toFixed(1)} m · ${(p.w / 10).toFixed(1)} kg</dd></div>
            <div><dt>Habilidades</dt><dd>${abil}</dd></div>
          </dl>
        </div>
      </section>

      <div class="cols2">
        <section class="panel">
          <h2>Status base</h2>
          <div class="statbars">
            ${s.map((v, i) => `<div class="sb"><span>${STAT_PT[i]}</span><b class="num">${v}</b>
              <span class="bar"><i style="width:${Math.min(100, v / 2.2)}%;background:${barColor(v)}"></i></span>
              <span class="pct">top ${Math.max(1, Math.round(100 - statPct[i](v) * 100))}%</span></div>`).join("")}
            <div class="sb total"><span>Total</span><b class="num">${p.bst}</b>
              <span class="bar"><i style="width:${Math.min(100, p.bst / 7.8)}%;background:var(--accent)"></i></span>
              <span class="pct">top ${Math.max(1, Math.round(100 - bstPctAll(p.bst) * 100))}%</span></div>
          </div>
        </section>
        <section class="panel">
          <h2>Dano recebido por tipo</h2>
          <div class="mults">
            ${groups.map(([m, lbl]) => {
              const ts = defM.filter(x => x[1] === m).map(x => typeBadge(x[0]));
              return ts.length ? `<div class="mrow"><b>${lbl}</b><div class="chips">${ts.join("")}</div></div>` : "";
            }).join("")}
          </div>
          <h3>Bate forte (STAB super efetivo) em</h3>
          <div class="mults">${stabHits.map(([t, l]) => `<div class="mrow"><span>${typeBadge(t)}</span><div class="chips">${l.length ? l.map(d => typeBadge(d, true)).join("") : '<span class="muted">nenhum tipo</span>'}</div></div>`).join("")}</div>
        </section>
      </div>

      <section>
        <div class="sechead">
          <div><h2>Contra quem é bom e quem ganha dele</h2>
          <p class="lede">Duelo 1v1 simulado no nível 50: cada lado usa seu melhor golpe STAB (ou cobertura neutra), quem é mais rápido ataca primeiro.</p></div>
          <select id="ctr-pool" aria-label="Rivais considerados">
            <option value="std" ${ctrState.pool === "std" ? "selected" : ""}>Rivais: evoluções finais comuns</option>
            <option value="all" ${ctrState.pool === "all" ? "selected" : ""}>Rivais: todos, inclusive lendários e Megas</option>
            <option value="leg" ${ctrState.pool === "leg" ? "selected" : ""}>Rivais: só lendários e míticos</option>
          </select>
        </div>
        <div class="cols2" id="ctr"></div>
      </section>

      <section>
        <h2>Linha evolutiva${forms.length ? " e formas" : ""}</h2>
        <div class="evo">${chain.map((o, i) => `${i ? '<span class="arr">›</span>' : ""}<a href="${link(o)}" class="${o === p ? "cur" : ""}">${img(o)}${esc(o.name)}<span class="ovrpill ${o.tier}">${o.ovr}</span></a>`).join("")}</div>
        ${forms.length ? `<div class="evo">${forms.map(o => `<a href="${link(o)}">${img(o)}${esc(o.name)}<span class="ovrpill ${o.tier}">${o.ovr}</span></a>`).join("")}</div>` : ""}
      </section>
      <div><a class="btn" href="#comparar" id="go-cmp">Comparar ${esc(p.name)} com outro Pokémon</a></div>`;
    $("#go-cmp").addEventListener("click", () => { cmpState.a = p.slug; });
    const renderCtr = () => {
      const pool = ctrState.pool === "std" ? FIELD : ctrState.pool === "leg" ? ALL.filter(o => o.leg && !o.form) : ALL;
      const res = pool.filter(o => o.sid !== p.sid).map(o => [o, duel(p, o)]);
      const counters = [...res].sort((a, b) => a[1] - b[1]).slice(0, 12);
      const beats = [...res].sort((a, b) => b[1] - a[1]).slice(0, 12);
      const w = res.filter(x => x[1] > 0).length;
      $("#ctr").innerHTML = `
        <div class="panel" style="display:grid;gap:10px;align-content:start"><h3>Counters: quem ganha de ${esc(p.name)}</h3>
          <div class="rows">${counters.map(([o, r], i) => row(o, i + 1, `<span class="ovrpill ${o.tier}">${o.ovr}</span>${duelTxt(r)}`)).join("")}</div></div>
        <div class="panel" style="display:grid;gap:10px;align-content:start"><h3>${esc(p.name)} é melhor contra</h3>
          <p class="muted" style="margin:0">Vence ${w} de ${res.length} duelos (${Math.round(w / res.length * 100)}%).</p>
          <div class="rows">${beats.map(([o, r], i) => row(o, i + 1, `<span class="ovrpill ${o.tier}">${o.ovr}</span>${duelTxt(r)}`)).join("")}</div></div>`;
    };
    $("#ctr-pool").addEventListener("change", e => { ctrState.pool = e.target.value; renderCtr(); });
    renderCtr();
  }
  function barColor(v) {
    return v < 50 ? "#ff6b4a" : v < 70 ? "#f0a33a" : v < 90 ? "#e8d23a" : v < 110 ? "#8fd14f" : v < 130 ? "#3ecf7a" : "#22c3d6";
  }

  // ---------- Rankings por tipo ----------
  const rkState = { type: "fire", leg: false, mega: false, forms: true, final: true, sort: "ovr" };
  function viewRankings() {
    view.innerHTML = `
      <section><div><div class="eyebrow">Rankings</div><h1>Melhores Pokémon de cada tipo</h1>
        <p class="lede">Escolha um tipo para ver os mais fortes dele e, ao lado, quem mais vence Pokémon desse tipo no simulador 1v1.</p></div>
        <div class="chips" id="rk-types">${TYPES.map(t => typeSpan(t, t === rkState.type ? "on" : "off", `data-t="${t}"`)).join("")}</div>
        <div class="panel filters">
          <select id="rk-sort" aria-label="Ordenar">${[["ovr", "Overall"], ["win", "% vitórias 1v1"], ["bst", "Total de status"], ...STAT_PT.map((s, i) => ["s" + i, s])]
            .map(([v, t]) => `<option value="${v}" ${rkState.sort === v ? "selected" : ""}>Ordenar: ${t}</option>`).join("")}</select>
          <label class="chk"><input type="checkbox" id="rk-leg" ${rkState.leg ? "checked" : ""}> Lendários/míticos</label>
          <label class="chk"><input type="checkbox" id="rk-mega" ${rkState.mega ? "checked" : ""}> Megas</label>
          <label class="chk"><input type="checkbox" id="rk-forms" ${rkState.forms ? "checked" : ""}> Formas regionais/alternativas</label>
          <label class="chk"><input type="checkbox" id="rk-final" ${rkState.final ? "checked" : ""}> Só evolução final</label>
        </div>
      </section>
      <div class="cols2" id="rk-out"></div>`;
    $("#rk-types").addEventListener("click", e => {
      const t = e.target.closest("[data-t]"); if (!t) return;
      rkState.type = t.dataset.t;
      $("#rk-types").querySelectorAll("[data-t]").forEach(b => { b.classList.toggle("on", b.dataset.t === rkState.type); b.classList.toggle("off", b.dataset.t !== rkState.type); });
      renderRk();
    });
    $("#rk-sort").addEventListener("change", e => { rkState.sort = e.target.value; renderRk(); });
    ["leg", "mega", "forms", "final"].forEach(k => $("#rk-" + k).addEventListener("change", e => { rkState[k] = e.target.checked; renderRk(); }));
    renderRk();
  }
  function renderRk() {
    const t = rkState.type, f = poolFilter(rkState), s = rkState.sort;
    const key = s === "ovr" ? p => p.ovr * 1000 + p.bst : s === "bst" ? p => p.bst : s === "win" ? p => p.winrate : p => p.stats[+s.slice(1)];
    const right = s === "ovr" ? undefined : s === "win" ? p => `<b class="num">${Math.round(p.winrate * 100)}%</b>`
      : s === "bst" ? p => `<b class="num">${p.bst}</b>` : p => `<b class="num">${p.stats[+s.slice(1)]} ${STAT_AB[+s.slice(1)]}</b>`;
    const mine = ALL.filter(p => p.types.includes(t) && f(p)).sort((a, b) => key(b) - key(a)).slice(0, 25);
    const targets = ALL.filter(p => p.types.includes(t) && p.final && !p.form && !p.leg);
    const vs = ALL.filter(f).map(p => {
      let sum = 0, w = 0;
      for (const o of targets) { if (o.sid === p.sid) continue; const r = duel(p, o); sum += r; if (r > 0) w++; }
      return [p, sum / targets.length, w / targets.length];
    }).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const weakTo = TYPES.filter(a => CHART[a][t] === 2), resists = TYPES.filter(a => CHART[a][t] < 1);
    $("#rk-out").innerHTML = `
      <section class="panel" style="align-content:start">
        <h2>Top ${mine.length} do tipo ${typeBadge(t)}</h2>
        <div class="rows">${mine.map((p, i) => row(p, i + 1, right && right(p))).join("") || '<p class="muted">Nenhum Pokémon com esses filtros.</p>'}</div>
      </section>
      <section class="panel" style="align-content:start">
        <h2>Melhores contra ${TYPE_PT[t]}</h2>
        <p class="muted" style="margin:0">Golpes super efetivos contra ${TYPE_PT[t]}: ${weakTo.map(x => typeBadge(x, true)).join(" ") || "nenhum"}.
          ${TYPE_PT[t]} resiste a: ${resists.map(x => typeBadge(x, true)).join(" ")}.</p>
        <p class="muted" style="margin:0">Média dos duelos contra ${targets.length} Pokémon comuns do tipo:</p>
        <div class="rows">${vs.map(([p, avg, w], i) => row(p, i + 1, `<span class="ovrpill ${p.tier}">${p.ovr}</span><span class="win good">vence ${Math.round(w * 100)}%</span>`)).join("")}</div>
      </section>`;
  }

  // ---------- Tier list ----------
  const tlState = { leg: false, mega: false, final: true, forms: true };
  const TIERS = [["S", 90, "#ff7a6b"], ["A", 82, "#ffb35c"], ["B", 74, "#ffe066"], ["C", 64, "#a8e06b"], ["D", 0, "#7cc4f2"]];
  function viewTiers() {
    view.innerHTML = `
      <section><div><div class="eyebrow">Tier list</div><h1>Tier list por overall</h1>
        <p class="lede">S = 90+, A = 82–89, B = 74–81, C = 64–73, D = abaixo de 64. O overall junta status base e desempenho no simulador 1v1 contra ${FIELD.length} evoluções finais.</p></div>
        <div class="panel filters">
          <label class="chk"><input type="checkbox" id="tl-leg" ${tlState.leg ? "checked" : ""}> Lendários/míticos</label>
          <label class="chk"><input type="checkbox" id="tl-mega" ${tlState.mega ? "checked" : ""}> Megas</label>
          <label class="chk"><input type="checkbox" id="tl-forms" ${tlState.forms ? "checked" : ""}> Formas regionais/alternativas</label>
          <label class="chk"><input type="checkbox" id="tl-final" ${tlState.final ? "checked" : ""}> Só evolução final</label>
        </div>
      </section><section id="tl-out"></section>`;
    ["leg", "mega", "forms", "final"].forEach(k => $("#tl-" + k).addEventListener("change", e => { tlState[k] = e.target.checked; renderTl(); }));
    renderTl();
  }
  function renderTl() {
    const list = ALL.filter(poolFilter(tlState)).sort((a, b) => b.ovr - a.ovr || b.bst - a.bst);
    $("#tl-out").innerHTML = TIERS.map(([n, min, col], i) => {
      const max = i ? TIERS[i - 1][1] : 1e9;
      const ms = list.filter(p => p.ovr >= min && p.ovr < max);
      return `<div class="tier"><b style="background:${col}">${n}</b><div class="mons">${ms.length
        ? ms.map(p => `<a href="${link(p)}" title="${esc(p.name)} · ${p.ovr}">${img(p)}${esc(p.name)}<span class="num muted">${p.ovr}</span></a>`).join("")
        : '<span class="muted">Nenhum</span>'}</div></div>`;
    }).join("");
  }

  // ---------- Tabela de tipos ----------
  const tcState = { d1: "dragon", d2: "flying" };
  function viewTypes(focus) {
    if (focus) { tcState.d1 = focus; tcState.d2 = ""; }
    view.innerHTML = `
      <section><div><div class="eyebrow">Tabela de tipos</div><h1>Quem é forte contra quem</h1>
        <p class="lede">Linhas são o tipo do golpe, colunas o tipo de quem recebe. Verde = 2×, vermelho = ½×, preto = sem efeito.</p></div>
        <div class="legend"><span><i style="background:var(--good)"></i>2× super efetivo</span><span><i style="background:var(--bad)"></i>½× pouco efetivo</span><span><i style="background:#111"></i>0× imune</span></div>
        <div class="panel scroll"><table class="tchart"><thead><tr><th></th>${TYPES.map(t => `<th>${typeBadge(t)}</th>`).join("")}</tr></thead>
          <tbody>${TYPES.map(a => `<tr><th>${typeBadge(a)}</th>${TYPES.map(d => {
            const m = CHART[a][d];
            return `<td class="${m === 2 ? "x2" : m === 0.5 ? "x05" : m === 0 ? "x0" : ""}" title="${TYPE_PT[a]} → ${TYPE_PT[d]}: ${m}×">${m === 1 ? "" : m === 0.5 ? "½" : m}</td>`;
          }).join("")}</tr>`).join("")}</tbody></table></div>
      </section>
      <section class="panel">
        <h2>Calculadora de fraquezas</h2>
        <div class="filters">
          <select id="tc-1" aria-label="Tipo 1">${TYPES.map(t => `<option value="${t}" ${t === tcState.d1 ? "selected" : ""}>${TYPE_PT[t]}</option>`).join("")}</select>
          <select id="tc-2" aria-label="Tipo 2"><option value="">Sem segundo tipo</option>${TYPES.map(t => `<option value="${t}" ${t === tcState.d2 ? "selected" : ""}>${TYPE_PT[t]}</option>`).join("")}</select>
        </div>
        <div id="tc-out" class="cols2"></div>
      </section>`;
    const upd = () => { tcState.d1 = $("#tc-1").value; tcState.d2 = $("#tc-2").value; renderTc(); };
    $("#tc-1").addEventListener("change", upd);
    $("#tc-2").addEventListener("change", upd);
    renderTc();
  }
  function renderTc() {
    const def = [tcState.d1, tcState.d2].filter((t, i, a) => t && a.indexOf(t) === i);
    const groups = [[4, "4×"], [2, "2×"], [1, "1×"], [0.5, "½×"], [0.25, "¼×"], [0, "0×"]];
    const ms = TYPES.map(t => [t, eff(t, def)]);
    const ex = ALL.filter(p => !p.form && p.types.length === def.length && def.every(t => p.types.includes(t))).sort((a, b) => b.ovr - a.ovr).slice(0, 8);
    const atk = def.map(a => [a, TYPES.filter(d => CHART[a][d] === 2)]);
    $("#tc-out").innerHTML = `
      <div class="mults"><h3>Defendendo como ${def.map(t => typeBadge(t)).join(" ")}</h3>
        ${groups.map(([m, l]) => { const ts = ms.filter(x => x[1] === m); return ts.length ? `<div class="mrow"><b>${l}</b><div class="chips">${ts.map(x => typeBadge(x[0], true)).join("")}</div></div>` : ""; }).join("")}</div>
      <div class="mults"><h3>Atacando com STAB</h3>
        ${atk.map(([a, l]) => `<div class="mrow"><span>${typeBadge(a)}</span><div class="chips">${l.map(d => typeBadge(d, true)).join("") || '<span class="muted">nenhum 2×</span>'}</div></div>`).join("")}
        <h3>Pokémon com essa combinação</h3>
        <div class="rows">${ex.map((p, i) => row(p, i + 1)).join("") || '<p class="muted">Nenhum Pokémon tem exatamente essa combinação.</p>'}</div></div>`;
  }

  // ---------- Comparador ----------
  const cmpState = { a: "garchomp", b: "dragonite" };
  function viewCompare() {
    view.innerHTML = `
      <section><div><div class="eyebrow">Comparador</div><h1>Frente a frente</h1>
        <p class="lede">Compare status, tipos e o resultado do duelo 1v1 entre dois Pokémon.</p></div>
        <div class="vs">
          <div class="side"><input id="cmp-a" type="search" list="dl-all" value="${esc(BY_SLUG.get(cmpState.a).name)}" aria-label="Primeiro Pokémon"><div id="cmp-ca"></div></div>
          <div class="mid">VS</div>
          <div class="side"><input id="cmp-b" type="search" list="dl-all" value="${esc(BY_SLUG.get(cmpState.b).name)}" aria-label="Segundo Pokémon"><div id="cmp-cb"></div></div>
        </div>
      </section>
      <section class="panel" id="cmp-out"></section>`;
    const set = (k, el) => { const p = byName(el.value); if (p) { cmpState[k] = p.slug; renderCmp(); } };
    $("#cmp-a").addEventListener("change", e => set("a", e.target));
    $("#cmp-b").addEventListener("change", e => set("b", e.target));
    renderCmp();
  }
  function renderCmp() {
    const a = BY_SLUG.get(cmpState.a), b = BY_SLUG.get(cmpState.b);
    $("#cmp-ca").innerHTML = card(a, true);
    $("#cmp-cb").innerHTML = card(b, true);
    const lines = [...STAT_PT.map((n, i) => [n, a.stats[i], b.stats[i], 255]), ["Total", a.bst, b.bst, 800], ["Overall", a.ovr, b.ovr, 99],
      ["Vitórias 1v1 %", Math.round(a.winrate * 100), Math.round(b.winrate * 100), 100]];
    const r = duel(a, b);
    const ea = Math.max(...a.types.map(t => eff(t, b.types))), eb = Math.max(...b.types.map(t => eff(t, a.types)));
    const winner = r > 0 ? a : b;
    $("#cmp-out").innerHTML = `
      <h2>Status</h2>
      <div class="cmp">${lines.map(([n, x, y, max]) => `<div class="line">
        <b class="${x > y ? "w" : ""}">${x}</b><span class="l"><i class="${x > y ? "w" : ""}" style="width:${x / max * 100}%"></i></span>
        <span>${n}</span>
        <span class="r"><i class="${y > x ? "w" : ""}" style="width:${y / max * 100}%"></i></span><b class="${y > x ? "w" : ""}">${y}</b></div>`).join("")}</div>
      <div class="verdict">
        <h2>Duelo 1v1</h2>
        <p><strong>${esc(winner.name)}</strong> vence, terminando com ${pctTxt(r)} dos PS.</p>
        <p class="muted">Melhor STAB de ${esc(a.name)} contra ${esc(b.name)}: ${ea}×. Melhor STAB de ${esc(b.name)} contra ${esc(a.name)}: ${eb}×.
          ${a.stats[5] === b.stats[5] ? "Mesma velocidade: empate no primeiro golpe." : `${esc((a.stats[5] > b.stats[5] ? a : b).name)} ataca primeiro.`}</p>
      </div>`;
  }

  // ---------- Montador de time ----------
  let team = [];
  try { team = JSON.parse(localStorage.getItem("pokehub-team") || "[]").filter(s => BY_SLUG.has(s)); } catch (e) { team = []; }
  if (!team.length) team = ["garchomp", "rotom-wash", "scizor", "gardevoir", "heatran", "ferrothorn"].filter(s => BY_SLUG.has(s));
  const saveTeam = () => { try { localStorage.setItem("pokehub-team", JSON.stringify(team)); } catch (e) { /* armazenamento indisponível */ } };
  function viewTeam() {
    view.innerHTML = `
      <section><div><div class="eyebrow">Montar time</div><h1>Analisador de time</h1>
        <p class="lede">Monte até 6 Pokémon e veja fraquezas em comum, cobertura ofensiva e sugestões para tapar buracos. Começa com um time de exemplo.</p></div>
        <div class="filters"><input id="tm-add" type="search" list="dl-all" placeholder="Adicionar Pokémon ao time" aria-label="Adicionar Pokémon">
          <button class="btn" type="button" id="tm-clear">Limpar time</button></div>
        <div class="team" id="tm-slots"></div>
      </section>
      <div class="cols2" id="tm-out"></div>`;
    $("#tm-add").addEventListener("change", e => {
      const p = byName(e.target.value);
      if (p && team.length < 6 && !team.includes(p.slug)) { team.push(p.slug); saveTeam(); renderTeam(); }
      e.target.value = "";
    });
    $("#tm-clear").addEventListener("click", () => { team = []; saveTeam(); renderTeam(); });
    $("#tm-slots").addEventListener("click", e => {
      const b = e.target.closest("[data-rm]"); if (!b) return;
      team = team.filter(s => s !== b.dataset.rm); saveTeam(); renderTeam();
    });
    $("#tm-out").addEventListener("click", e => {
      const b = e.target.closest("[data-add]"); if (!b || team.length >= 6) return;
      team.push(b.dataset.add); saveTeam(); renderTeam();
    });
    renderTeam();
  }
  function renderTeam() {
    const mons = team.map(s => BY_SLUG.get(s));
    $("#tm-slots").innerHTML = Array.from({ length: 6 }, (_, i) => {
      const p = mons[i];
      return p ? `<div class="slot"><a href="${link(p)}">${img(p)}</a><strong>${esc(p.name)}</strong>
        <span class="chips">${p.types.map(t => typeBadge(t, true)).join("")}</span><button class="btn" type="button" data-rm="${p.slug}">Remover</button></div>`
        : `<div class="slot muted">Vaga ${i + 1}</div>`;
    }).join("");
    if (!mons.length) { $("#tm-out").innerHTML = ""; return; }
    const rows = TYPES.map(t => {
      const m = mons.map(p => eff(t, p.types));
      const weak = m.filter(x => x > 1).length, res = m.filter(x => x < 1 && x > 0).length, imm = m.filter(x => x === 0).length;
      return { t, weak, res, imm, alert: weak >= 3 || (weak >= 2 && res + imm === 0) };
    });
    const holes = rows.filter(r => r.alert).map(r => r.t);
    const covered = new Set(mons.flatMap(p => p.types.flatMap(a => TYPES.filter(d => CHART[a][d] === 2))));
    const uncovered = TYPES.filter(t => !covered.has(t));
    const sugg = holes.length ? ALL.filter(p => p.final && !p.leg && !p.mega && !team.includes(p.slug))
      .map(p => [p, holes.filter(t => eff(t, p.types) < 1).length - holes.filter(t => eff(t, p.types) > 1).length * 2])
      .filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || b[0].ovr - a[0].ovr).slice(0, 8) : [];
    $("#tm-out").innerHTML = `
      <section class="panel" style="align-content:start">
        <h2>Defesa do time</h2>
        <div class="scroll"><table class="tm"><thead><tr><th>Golpe</th><th>Fracos</th><th>Resistem</th><th>Imunes</th></tr></thead>
        <tbody>${rows.map(r => `<tr class="${r.alert ? "alert" : ""}"><td>${typeBadge(r.t, true)}</td>
          <td class="${r.weak >= 3 ? "bad" : ""}">${r.weak || "–"}</td><td class="${r.res ? "good" : ""}">${r.res || "–"}</td><td class="${r.imm ? "zero" : ""}">${r.imm || "–"}</td></tr>`).join("")}</tbody></table></div>
      </section>
      <section class="panel" style="align-content:start">
        <h2>Resumo</h2>
        <p style="margin:0">${holes.length ? `Pontos fracos: ${holes.map(t => typeBadge(t, true)).join(" ")}` : "Nenhuma fraqueza grave em comum."}</p>
        <p style="margin:0">${uncovered.length ? `Tipos que seu STAB não acerta super efetivo: ${uncovered.map(t => typeBadge(t, true)).join(" ")}` : "O STAB do time acerta todos os tipos super efetivo."}</p>
        <p class="muted" style="margin:0">Overall médio: <b class="num">${Math.round(mons.reduce((s, p) => s + p.ovr, 0) / mons.length)}</b></p>
        ${sugg.length ? `<h3>Sugestões para cobrir as fraquezas</h3>
          <div class="rows">${sugg.map(([p], i) => row(p, i + 1, `<span class="ovrpill ${p.tier}">${p.ovr}</span>${team.length < 6 ? `<button class="btn" type="button" data-add="${p.slug}" onclick="event.preventDefault()">Adicionar</button>` : ""}`)).join("")}</div>` : ""}
      </section>`;
  }

  // ---------- Rotas ----------
  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || "inicio";
    let v = h;
    if (h.startsWith("p-") && BY_SLUG.has(h.slice(2))) { viewMon(BY_SLUG.get(h.slice(2))); v = ""; document.title = BY_SLUG.get(h.slice(2)).name + " · PokéHub"; }
    else if (h.startsWith("tipo-") && TYPES.includes(h.slice(5))) { rkState.type = h.slice(5); viewRankings(); v = "rankings"; }
    else {
      document.title = "PokéHub";
      ({ rankings: viewRankings, tiers: viewTiers, tipos: () => viewTypes(), comparar: viewCompare, time: viewTeam }[h] || (v = "inicio", viewHome))();
    }
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
})();
