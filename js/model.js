/* GrilleMaker — modèle de données (compatible avec les fichiers .grille de la version bureau) */
(function (G) {
  "use strict";

  const SECTION_TYPES = ["Intro", "Couplet", "Pré-refrain", "Refrain", "Pont", "Solo",
    "Interlude", "Break", "Outro", "Coda"];
  const UNNUMBERED = ["Intro", "Outro", "Solo", "Pont", "Coda"];

  const uid = () => Math.random().toString(16).slice(2, 10);

  // ------------------------------------------------------------- cellules
  const newCell = (chord = "") => ({ chord, start: false, end: false, times: 2, volta: "", note: "" });

  const cellIsEmpty = c => !(c.chord.trim() || c.start || c.end || c.volta || c.note.trim());

  const splitChords = t => t.trim().split(/[,\s]+/).filter(Boolean);

  // ------------------------------------------------------------- sections
  function newSection(type = "Couplet", num = 1, cols = 4, rows = 4) {
    return {
      id: uid(), type, num, label: "", cols,
      rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => newCell())),
      measures_auto: true, measures: 0, comment: ""
    };
  }

  const sectionName = s => (s.label || "").trim() || (s.num ? `${s.type} ${s.num}` : s.type);

  function resizeSection(s, cols, rows) {
    if (cols != null) {
      s.cols = cols;
      s.rows.forEach(r => { while (r.length < cols) r.push(newCell()); r.length = cols; });
    }
    if (rows != null) {
      while (s.rows.length < rows) s.rows.push(Array.from({ length: s.cols }, () => newCell()));
      s.rows.length = rows;
    }
  }

  function usedRows(s) {
    const out = [];
    for (const row of s.rows) {
      const cells = row.slice();
      while (cells.length && cellIsEmpty(cells[cells.length - 1])) cells.pop();
      if (cells.length) out.push(cells);
    }
    return out;
  }

  function computeMeasures(s) {
    let total = 0, inBlock = false, block = 0, v1 = 0;
    for (const row of usedRows(s)) {
      for (const c of row) {
        if (c.start) { inBlock = true; block = 0; v1 = 0; }
        const t = Math.max(1, parseInt(c.times) || 2);
        if (inBlock) {
          if (c.volta === "1") v1++; else block++;
          if (c.end) { total += block * t + v1 * (t - 1); inBlock = false; }
        } else if (c.end) {
          total = (total + 1) * t;
        } else {
          total++;
        }
      }
    }
    if (inBlock) total += block + v1;
    return total;
  }

  const sectionMeasures = s => s.measures_auto !== false ? computeMeasures(s) : (parseInt(s.measures) || 0);

  // ------------------------------------------------------------- structure
  const newItem = (type, num, grid = "") =>
    ({ type, num, label: "", grid, measures_auto: true, measures: 0, note: "" });

  const itemName = it => (it.label || "").trim() || (it.num ? `${it.type} ${it.num}` : it.type);

  const findSection = (song, id) => song.sections.find(s => s.id === id) || null;

  function itemMeasures(song, it) {
    const s = findSection(song, it.grid);
    if (it.measures_auto !== false && s) return sectionMeasures(s);
    return parseInt(it.measures) || 0;
  }

  function nextNum(items, type) {
    const nums = items.filter(i => i.type === type).map(i => i.num);
    return nums.length ? Math.max(...nums) + 1 : 1;
  }

  function bestGridFor(song, type, num) {
    const same = song.sections.filter(s => s.type === type);
    if (!same.length) return "";
    const exact = same.find(s => s.num === num);
    if (exact) return exact.id;
    same.sort((a, b) => a.num - b.num);
    return same[(Math.max(1, num) - 1) % same.length].id;
  }

  function generateStructure(song, counts) {
    const items = [];
    const n = t => counts[t] || 0;
    const add = t => { const k = nextNum(items, t); items.push(newItem(t, k, bestGridFor(song, t, k))); };

    for (let i = 0; i < n("Intro"); i++) add("Intro");
    const nc = n("Couplet"), nr = n("Refrain");
    let npre = n("Pré-refrain");
    const middles = ["Pont", "Solo", "Interlude", "Break"].filter(t => n(t));
    const groups = (middles.length && nr >= 2) ? nr - 1 : nr;
    const dist = [];
    if (groups > 0) {
      const base = Math.floor(nc / groups), extra = nc % groups;
      for (let i = 0; i < groups; i++) dist.push(base + (i < extra ? 1 : 0));
    }
    for (let i = 0; i < nr; i++) {
      if (i < groups) for (let k = 0; k < dist[i]; k++) add("Couplet");
      if (middles.length && nr >= 2 && i === nr - 1) middles.forEach(t => { for (let k = 0; k < n(t); k++) add(t); });
      if (npre > 0) { add("Pré-refrain"); npre--; }
      add("Refrain");
    }
    for (let k = 0; k < nc - dist.reduce((a, b) => a + b, 0); k++) add("Couplet");
    if (middles.length && nr < 2) middles.forEach(t => { for (let k = 0; k < n(t); k++) add(t); });
    ["Coda", "Outro"].forEach(t => { for (let k = 0; k < n(t); k++) add(t); });

    for (const it of items) {
      if (items.filter(j => j.type === it.type).length === 1 && !["Couplet", "Refrain"].includes(it.type)) {
        it.num = 0;
        if (!it.grid) it.grid = bestGridFor(song, it.type, 1);
      }
    }
    return items;
  }

  function renumber(items) {
    const counts = {}, seen = {};
    items.forEach(i => counts[i.type] = (counts[i.type] || 0) + 1);
    items.forEach(i => {
      if (counts[i.type] === 1 && !["Couplet", "Refrain"].includes(i.type)) i.num = 0;
      else i.num = seen[i.type] = (seen[i.type] || 0) + 1;
    });
  }

  // ------------------------------------------------------------- morceau
  const newSong = () => ({ version: 1, title: "", artist: "", key: "", tempo: "", notes: "",
    sections: [], structure: [] });

  function defaultSong() {
    const s = newSong();
    s.sections = [newSection("Intro", 0, 4, 1), newSection("Couplet", 1), newSection("Refrain", 1, 4, 2)];
    return s;
  }

  function normalize(raw) {
    const song = Object.assign(newSong(), raw || {});
    song.sections = (song.sections || []).map(s => {
      const d = Object.assign(newSection(s.type || "Couplet", s.num ?? 1, s.cols || 4, 0), s);
      d.rows = (d.rows || []).map(r => r.map(c => Object.assign(newCell(), c)));
      resizeSection(d, d.cols, null);
      return d;
    });
    song.structure = (song.structure || []).map(it => Object.assign(newItem(it.type || "Couplet", it.num ?? 1), it));
    return song;
  }

  function duplicateSection(s) {
    const d = JSON.parse(JSON.stringify(s));
    d.id = uid();
    return d;
  }

  G.Model = {
    SECTION_TYPES, UNNUMBERED, newCell, cellIsEmpty, splitChords, newSection, sectionName,
    resizeSection, usedRows, computeMeasures, sectionMeasures, newItem, itemName, findSection,
    itemMeasures, nextNum, bestGridFor, generateStructure, renumber, newSong, defaultSong,
    normalize, duplicateSection
  };
})(window.GM = window.GM || {});
