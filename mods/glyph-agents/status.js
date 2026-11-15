import { div } from "gpui-kit";
import { h_flex } from "gpui-base";

// Glyph status badges. All colors come from the active Herdr theme: working, blocked, done, idle, dim, accent.
// working: two cells cycling through alien glyphs; idle (paused): breathing pause bars;
// blocked (needs you): solid pulsing alert; done: green check.
const range = (a, b, skip = () => false) => { const o = []; for (let c = a; c <= b; c++) if (!skip(c)) o.push(String.fromCodePoint(c)); return o; };
// Cyan: Runic, Ogham, Canadian syllabics (~180 glyphs).
const RUNES = [...range(0x16A0, 0x16EA), ...range(0x1681, 0x169A), ...range(0x1401, 0x1450)];
// Magenta: technical symbols (minus the emoji ones), operators, shapes, hexagons, alchemical (~230 glyphs).
const TECH = [...range(0x2300, 0x23FF, (c) => (c >= 0x231A && c <= 0x231B) || (c >= 0x23E9 && c <= 0x23F3) || (c >= 0x23F8 && c <= 0x23FA)),
  ...range(0x2A00, 0x2A2F), ...range(0x25E0, 0x25FC), ...range(0x2B21, 0x2B2F), ...range(0x1F700, 0x1F773)];
// Both cells mix both sets. Colour is per element, so two layers share one clock:
// the cyan layer shows a rune (else blank) and the magenta layer a tech glyph (else blank) on each frame.
function mixedFrames(runeShare, seed) {
  let x = seed, ri = seed % RUNES.length, ti = (seed * 7) % TECH.length;
  const rnd = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const run = [], tec = [];
  for (let i = 0; i < 48; i++) {
    if (rnd() < runeShare) { ri = (ri + 1 + Math.floor(rnd() * 17)) % RUNES.length; run.push(RUNES[ri]); tec.push(""); }
    else { ti = (ti + 1 + Math.floor(rnd() * 17)) % TECH.length; run.push(""); tec.push(TECH[ti]); }
  }
  return [run, tec];
}
// Frames run on one shared clock, so a badge can't start late. Instead each badge (by key) gets its
// own glyph sequence and a speed within about +/-15%, so no two look alike.
const _seq = new Map();
function seqFor(key) {
  if (_seq.has(key)) return _seq.get(key);
  let h = 2166136261;
  for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const q = { left: mixedFrames(0.75, (h % 9973) + 1), right: mixedFrames(0.25, ((h >>> 9) % 9973) + 1),
    lms: Math.round(103 * (0.85 + (h % 31) / 100)), rms: Math.round(145 * (0.85 + ((h >>> 5) % 31) / 100)) };
  _seq.set(key, q);
  return q;
}
// Second glyph layer and dark text follow the active theme; hex values are only fallbacks.
const magenta = (t) => t.accent ?? "#ff40da";
const ink = (t) => t.accent_foreground ?? t.background ?? "#0a0613";
// size: "full" (pill with label), "mini" (compact pill), "rail" (one narrow cell)
export function glyphStatus(t, status, { size = "full", key = "" } = {}) {
  const layer = (list, ms, color) => div().absolute().inset_0().flex().items_center().justify_center().font_bold().text_color(color).frames(list, ms);
  const cell = ([run, tec], ms, t, w) => div().relative().w(w).h_full().flex_none().child(layer(run, ms, t.working)).child(layer(tec, ms, magenta(t)));
  if (status === "working") {
    const q = seqFor(key);
    const w = size === "rail" ? 12 : 9;
    return h_flex().flex_none().items_center().h(size === "rail" ? 14 : 18).px(size === "rail" ? 0 : 4).rounded(5)
      .text_size(size === "rail" ? 10 : 12)
      .when(size !== "rail", el => el.bg(t.working + "22").border(1).border_color(t.working + "88"))
      .child(cell(q.left, q.lms, t, w))
      .when(size !== "rail", el => el.child(cell(q.right, q.rms, t, w)))
      .loop("opacity", { from: 0.7, to: 1, period: 700 });
  }
  if (status === "blocked" || status === "error") {
    if (size !== "full") return div().size(size === "rail" ? 14 : 16).flex_none().rounded(4).bg(t.blocked).text_size(11).font_bold().text_color(ink(t)).flex().items_center().justify_center().child("!").loop("opacity", { from: 0.4, to: 1, period: 600 });
    return h_flex().flex_none().items_center().gap(4).px(7).h(20).rounded(6).bg(t.blocked).border(1).border_color("#ffffff66").text_size(10.5).font_bold().text_color(ink(t))
      .child(div().frames(["▲", "△"], 420)).child("NEEDS YOU")
      .loop("opacity", { from: 0.45, to: 1, period: 600 });
  }
  if (status === "done") {
    if (size !== "full") return div().flex_none().w(size === "rail" ? 12 : 14).flex().justify_center().text_size(12).font_bold().text_color(t.done).child("✓");
    return h_flex().flex_none().items_center().gap(4).px(6).h(18).rounded(5).bg(t.done + "26").border(1).border_color(t.done).text_size(10.5).font_bold().text_color(t.done).child("✓").child("DONE")
      .loop("opacity", { from: 0.75, to: 1, period: 1600 });
  }
  if (status === "idle") {
    return h_flex().flex_none().items_center().h(size === "rail" ? 14 : 18).px(size === "rail" ? 1 : 5).rounded(5).text_size(8).text_color(t.idle ?? t.dim)
      .when(size === "full", el => el.border(1).border_color((t.idle ?? t.dim) + "55"))
      .child("❚❚").loop("opacity", { from: 0.3, to: 0.95, period: 2600 });
  }
  return div().size(7).mx(3).flex_none().rounded(4).bg(t.dim);
}
