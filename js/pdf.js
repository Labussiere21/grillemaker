/* GrilleMaker — rendu PDF (jsPDF). Coordonnées "bas-gauche" comme la version bureau. */
(function (G) {
  "use strict";
  const M = G.Model;
  const CM = 28.3465;
  const INK = "#1c1c1c", GREY = "#6b6b6b", ACCENT = "#5b3a8c", LIGHT = "#f1ecf7";
  const MARGIN = 1.2 * CM, LABEL_W = 3.3 * CM, REP_PAD = 0.45 * CM, HEAD = 0.42 * CM, BLOCK_GAP = 0.6 * CM;

  function Pen(doc) {
    const ph = doc.internal.pageSize.getHeight();
    const p = {
      doc, ph,
      stroke: c => doc.setDrawColor(c),
      fill: c => doc.setFillColor(c),
      ink: c => doc.setTextColor(c),
      lw: w => doc.setLineWidth(w),
      font: (style, size) => { doc.setFont("helvetica", style); doc.setFontSize(size); },
      sw: (s, style, size) => { p.font(style, size); return doc.getTextWidth(s); },
      line: (x1, y1, x2, y2) => doc.line(x1, ph - y1, x2, ph - y2),
      rect: (x, y, w, h, st = "S") => doc.rect(x, ph - y - h, w, h, st),
      rrect: (x, y, w, h, r, st = "FD") => doc.roundedRect(x, ph - y - h, w, h, r, r, st),
      dot: (x, y, r) => doc.circle(x, ph - y, r, "F"),
      text: (s, x, y, align) => doc.text(String(s), x, ph - y, align ? { align } : undefined),
    };
    return p;
  }

  function fit(p, text, style, size, maxW) {
    while (size > 5 && p.sw(text, style, size) > maxW) size -= 0.5;
    return size;
  }

  function simile(p, cx, cy, h) {
    const s = h * 0.22;
    p.lw(Math.max(1.6, h * 0.07)); p.stroke(INK); p.fill(INK);
    p.line(cx - s, cy - s, cx + s, cy + s);
    const r = h * 0.055;
    p.dot(cx - s * 0.95, cy + s * 0.55, r);
    p.dot(cx + s * 0.95, cy - s * 0.55, r);
  }

  function drawCell(p, x, y, w, h, cell) {
    p.stroke(INK); p.fill(INK); p.ink(INK); p.lw(0.9);
    p.rect(x, y, w, h);
    const chord = cell.chord.trim();
    if (["%", "/.", "./."].includes(chord)) {
      simile(p, x + w / 2, y + h / 2, h);
    } else {
      const parts = M.splitChords(chord);
      if (parts.length === 1) {
        const fs = fit(p, parts[0], "bold", h * 0.46, w * 0.72);
        p.font("bold", fs); p.text(parts[0], x + w / 2, y + h / 2 - fs * 0.35, "center");
      } else if (parts.length === 2) {
        p.lw(0.6); p.line(x, y, x + w, y + h);
        const fs = Math.min(fit(p, parts[0], "bold", h * 0.36, w * 0.46), fit(p, parts[1], "bold", h * 0.36, w * 0.46));
        p.font("bold", fs);
        p.text(parts[0], x + w * 0.27, y + h * 0.60, "center");
        p.text(parts[1], x + w * 0.73, y + h * 0.13, "center");
      } else if (parts.length) {
        const slot = (w * 0.86) / parts.length;
        const fs = Math.min(...parts.map(t => fit(p, t, "bold", h * 0.34, slot * 0.92)));
        p.font("bold", fs);
        parts.forEach((t, i) => p.text(t, x + w * 0.07 + slot * (i + 0.5), y + h / 2 - fs * 0.35, "center"));
      }
    }
    if (cell.note.trim()) {
      p.font("italic", 7); p.ink(GREY);
      p.text(cell.note.trim(), x + w / 2, y - 8, "center");
      p.ink(INK);
    }
  }

  function repeatStart(p, x, y, h) {
    p.stroke(INK); p.fill(INK);
    p.lw(2.6); p.line(x - 6.5, y, x - 6.5, y + h);
    p.lw(0.9); p.line(x - 3, y, x - 3, y + h);
    const r = Math.max(1.3, h * 0.045);
    p.dot(x + 3, y + h * 0.36, r); p.dot(x + 3, y + h * 0.64, r);
  }

  function repeatEnd(p, x, y, h, times) {
    p.stroke(INK); p.fill(INK);
    p.lw(0.9); p.line(x + 3, y, x + 3, y + h);
    p.lw(2.6); p.line(x + 6.5, y, x + 6.5, y + h);
    const r = Math.max(1.3, h * 0.045);
    p.dot(x - 3, y + h * 0.36, r); p.dot(x - 3, y + h * 0.64, r);
    if (times && parseInt(times) > 2) {
      p.font("bold", 10); p.ink(INK);
      p.text(`x${parseInt(times)}`, x + 8, y + h + 3, "right");
    }
  }

  function drawRow(p, x0, y, cw, ch, cells) {
    cells.forEach((c, i) => drawCell(p, x0 + i * cw, y, cw, ch, c));
    let i = 0;
    while (i < cells.length) {
      const v = cells[i].volta;
      if (!v) { i++; continue; }
      let j = i;
      while (j + 1 < cells.length && cells[j + 1].volta === v) j++;
      const xa = x0 + i * cw + 2, xb = x0 + (j + 1) * cw - 2, top = y + ch + HEAD * 0.85;
      p.stroke(INK); p.lw(0.8);
      p.line(xa, y + ch + 2, xa, top); p.line(xa, top, xb, top);
      if (v === "1") p.line(xb, top, xb, y + ch + 2);
      p.font("bold", 8); p.ink(INK); p.text(`${v}.`, xa + 3, top - 8);
      i = j + 1;
    }
    cells.forEach((c, k) => {
      if (c.start) repeatStart(p, x0 + k * cw, y, ch);
      if (c.end) repeatEnd(p, x0 + (k + 1) * cw, y, ch, c.times);
    });
  }

  const rowHead = cells => cells.some(c => c.volta || (c.end && (parseInt(c.times) || 2) > 2)) ? HEAD : 0.1 * CM;

  function geometry(sec, colW, ch) {
    const rows = M.usedRows(sec);
    const ncols = Math.max(sec.cols, 1, ...rows.map(r => r.length));
    const cw = Math.min(ch * 2.3, (colW - LABEL_W - 2 * REP_PAD) / ncols);
    const heads = rows.map(rowHead);
    const notes = rows.map(r => r.some(c => c.note.trim()) ? 0.3 * CM : 0);
    let height = heads.reduce((a, b) => a + b, 0) + rows.length * ch + notes.reduce((a, b) => a + b, 0);
    if ((sec.comment || "").trim()) height += 0.4 * CM;
    return { rows, cw, heads, notes, height: Math.max(height, 1.6 * CM) };
  }

  function labelBox(p, x, yTop, w, name, sub) {
    const h = 0.75 * CM;
    p.fill(LIGHT); p.stroke(ACCENT); p.lw(1.1);
    p.rrect(x, yTop - h, w, h, 6);
    const fs = fit(p, name, "bold", 11, w - 8);
    p.font("bold", fs); p.ink(INK);
    p.text(name, x + w / 2, yTop - h / 2 - fs * 0.35, "center");
    p.font("bold", 10); p.ink(ACCENT);
    p.text(sub, x + w / 2, yTop - h - 12, "center");
    p.ink(INK);
  }

  function drawSection(p, sec, x, yTop, colW, ch) {
    const g = geometry(sec, colW, ch);
    labelBox(p, x, yTop - (g.heads[0] || 0), LABEL_W - 0.45 * CM, M.sectionName(sec), `${M.sectionMeasures(sec)} M`);
    const gx = x + LABEL_W + REP_PAD;
    let y = yTop;
    g.rows.forEach((cells, i) => {
      y -= g.heads[i] + ch;
      drawRow(p, gx, y, g.cw, ch, cells);
      y -= g.notes[i];
    });
    if ((sec.comment || "").trim()) {
      p.font("italic", 8.5); p.ink(GREY);
      p.text(sec.comment.trim(), gx, y - 0.32 * CM);
      p.ink(INK);
    }
  }

  // ------------------------------------------------------------- structure
  function boxes(p, song) {
    return song.structure.map(it => {
      const name = M.itemName(it);
      const sec = M.findSection(song, it.grid);
      const ref = sec ? M.sectionName(sec) : "";
      let extra = ref && ref !== name ? `= ${ref}` : "";
      if ((it.note || "").trim()) extra = (extra ? extra + "  " : "") + it.note.trim();
      const w = Math.max(p.sw(name, "bold", 9.5), p.sw(extra, "italic", 7), 1.4 * CM) + 12;
      return { name, sub: `${M.itemMeasures(song, it)} M`, extra, w };
    });
  }

  function structureHeight(p, song, width) {
    if (!song.structure.length) return 0;
    let lines = 1, x = 0;
    for (const b of boxes(p, song)) {
      if (x && x + b.w > width) { lines++; x = 0; }
      x += b.w + 0.5 * CM;
    }
    return 0.55 * CM + lines * 1.35 * CM + 0.2 * CM;
  }

  function drawStructure(p, song, x0, yTop, width) {
    if (!song.structure.length) return;
    const total = song.structure.reduce((a, it) => a + M.itemMeasures(song, it), 0);
    p.font("bold", 10); p.ink(ACCENT);
    p.text(`STRUCTURE  -  ${total} mesures`, x0, yTop - 10);
    let y = yTop - 0.55 * CM, x = x0;
    const bs = boxes(p, song), h = 0.62 * CM;
    bs.forEach((b, i) => {
      if (x > x0 && x + b.w > x0 + width) { x = x0; y -= 1.35 * CM; }
      p.fill(LIGHT); p.stroke(ACCENT); p.lw(0.9);
      p.rrect(x, y - h, b.w, h, 5);
      p.font("bold", 9.5); p.ink(INK); p.text(b.name, x + b.w / 2, y - h / 2 - 3.3, "center");
      p.font("bold", 8.5); p.ink(ACCENT); p.text(b.sub, x + b.w / 2, y - h - 10, "center");
      if (b.extra) { p.font("italic", 7); p.ink(GREY); p.text(b.extra, x + b.w / 2, y - h - 19, "center"); }
      if (i < bs.length - 1 && !(x + b.w + 0.5 * CM + bs[i + 1].w > x0 + width)) {
        p.font("normal", 10); p.ink(GREY); p.text("\u203A", x + b.w + 0.25 * CM, y - h / 2 - 3.5, "center");
      }
      p.ink(INK);
      x += b.w + 0.5 * CM;
    });
  }

  function header(p, song, pw) {
    const y = p.ph - MARGIN;
    p.font("bold", 20); p.ink(INK);
    p.text(song.title.trim() || "Sans titre", MARGIN, y - 18);
    const info = [song.artist.trim()];
    if ((song.key || "").trim()) info.push(`Tonalité : ${song.key.trim()}`);
    if ((song.tempo || "").trim()) info.push(`Tempo : ${song.tempo.trim()}`);
    p.font("normal", 10); p.ink(GREY);
    p.text(info.filter(Boolean).join("   ·   "), pw - MARGIN, y - 16, "right");
    p.stroke(ACCENT); p.lw(1.5); p.line(MARGIN, y - 26, pw - MARGIN, y - 26);
    p.ink(INK);
    return y - 26 - 0.35 * CM;
  }

  function plan(p, song, pw) {
    const width = pw - 2 * MARGIN;
    const top = p.ph - MARGIN - 26 - 0.35 * CM;
    const stH = structureHeight(p, song, width);
    const notesH = (song.notes || "").trim() ? 0.8 * CM : 0;
    const avail = top - stH - MARGIN - notesH;
    const colOptions = pw > p.ph ? [2, 1] : [1, 2];
    for (const chCm of [1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.92, 0.85, 0.78, 0.7, 0.62]) {
      const ch = chCm * CM;
      for (const ncol of colOptions) {
        const colW = (width - (ncol - 1) * 0.8 * CM) / ncol;
        if (colW < LABEL_W + 2 * REP_PAD + 4 * ch * 1.3) continue;
        const cols = [[]];
        let used = 0, ok = true;
        for (const s of song.sections) {
          const h = geometry(s, colW, ch).height;
          if (used + h > avail) {
            if (cols.length === ncol) { ok = false; break; }
            cols.push([]); used = 0;
          }
          cols[cols.length - 1].push(s); used += h + BLOCK_GAP;
        }
        if (ok) return { single: true, ch, ncol, colW, cols, stH };
      }
    }
    const ncol = colOptions[0];
    return { single: false, ch: 0.9 * CM, ncol, colW: (width - (ncol - 1) * 0.8 * CM) / ncol, stH };
  }

  function render(song, orientation = "landscape") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
    doc.setProperties({ title: song.title || "Grille", author: song.artist || "", creator: "GrilleMaker" });
    const p = Pen(doc);
    const pw = doc.internal.pageSize.getWidth();
    const width = pw - 2 * MARGIN;
    const pl = plan(p, song, pw);
    let y = header(p, song, pw);
    drawStructure(p, song, MARGIN, y, width);
    y -= pl.stH;
    const { ch, colW, ncol } = pl;
    const footer = () => {
      if ((song.notes || "").trim()) {
        p.font("italic", 9.5); p.ink(INK);
        p.text("» " + song.notes.trim(), MARGIN, MARGIN + 0.1 * CM);
      }
    };
    if (pl.single) {
      pl.cols.forEach((col, ci) => {
        const x = MARGIN + ci * (colW + 0.8 * CM);
        let yy = y;
        col.forEach(s => { drawSection(p, s, x, yy, colW, ch); yy -= geometry(s, colW, ch).height + BLOCK_GAP; });
      });
      footer();
    } else {
      const bottom = MARGIN + ((song.notes || "").trim() ? 0.8 * CM : 0);
      let ci = 0, yy = y, topPage = y;
      for (const s of song.sections) {
        const h = geometry(s, colW, ch).height;
        if (yy - h < bottom) {
          ci++; yy = topPage;
          if (ci >= ncol) {
            footer(); doc.addPage();
            topPage = header(p, song, pw); yy = topPage; ci = 0;
          }
        }
        drawSection(p, s, MARGIN + ci * (colW + 0.8 * CM), yy, colW, ch);
        yy -= h + BLOCK_GAP;
      }
      footer();
    }
    return doc;
  }

  G.PDF = { render };
})(window.GM = window.GM || {});
