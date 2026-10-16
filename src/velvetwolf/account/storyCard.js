// The Wolf Type result as a story-sized picture (1080 x 1920) to post: the hall's dark, one pool
// of white light, the type's name in the display face and its one line. Drawn on a canvas in the
// browser; nothing is uploaded.
const W = 1080, H = 1920;

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function tracked(ctx, text, x, y, spacing) {
  // canvas letter-spacing isn't everywhere yet; space the capitals by hand
  let cx = x - ([...text].reduce((w, ch) => w + ctx.measureText(ch).width + spacing, -spacing)) / 2;
  for (const ch of text) { ctx.fillText(ch, cx + ctx.measureText(ch).width / 2, y); cx += ctx.measureText(ch).width + spacing; }
}

export async function drawStoryCard({ type, memberNo }) {
  if (typeof document === "undefined") return null;
  await Promise.all(["300 120px Unbounded", "400 40px Unbounded", "600 34px Manrope", "500 40px Manrope"].map((f) => document.fonts?.load(f).catch(() => null)));
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0A0A0B";
  ctx.fillRect(0, 0, W, H);
  // the pool of light, and a soft floor
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, W * 0.75);
  g.addColorStop(0, "rgba(255, 248, 236, 0.16)");
  g.addColorStop(1, "rgba(255, 248, 236, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const f = ctx.createRadialGradient(W / 2, H * 0.86, 20, W / 2, H * 0.86, W * 0.6);
  f.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  f.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = f;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#E8E4DA";
  ctx.font = "600 34px Manrope, sans-serif";
  tracked(ctx, "VELVETWOLF", W / 2, 170, 14);

  ctx.fillStyle = "rgba(232, 228, 218, 0.7)";
  ctx.font = "600 30px Manrope, sans-serif";
  tracked(ctx, "MY WOLF TYPE", W / 2, H * 0.3, 10);

  ctx.fillStyle = "#E8E4DA";
  ctx.font = "300 118px Unbounded, sans-serif";
  const nameLines = wrap(ctx, type.name.toUpperCase(), W - 160);
  const y0 = H * 0.42 - ((nameLines.length - 1) * 130) / 2;
  nameLines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * 130));

  // the gold rule: the one accent
  ctx.fillStyle = "#C9A84C";
  ctx.fillRect(W / 2 - 60, y0 + (nameLines.length - 1) * 130 + 110, 120, 3);

  ctx.fillStyle = "rgba(232, 228, 218, 0.82)";
  ctx.font = "500 44px Manrope, sans-serif";
  wrap(ctx, type.line, W - 240).forEach((l, i) => ctx.fillText(l, W / 2, y0 + (nameLines.length - 1) * 130 + 200 + i * 60));

  ctx.fillStyle = "rgba(232, 228, 218, 0.55)";
  ctx.font = "500 32px Manrope, sans-serif";
  wrap(ctx, type.look, W - 280).forEach((l, i) => ctx.fillText(l, W / 2, H * 0.68 + i * 46));

  ctx.fillStyle = "rgba(232, 228, 218, 0.46)";
  ctx.font = "600 28px Manrope, sans-serif";
  if (memberNo) tracked(ctx, `MEMBER NO. ${String(memberNo).padStart(4, "0")}`, W / 2, H - 230, 8);
  tracked(ctx, "VELVETWOLF.IN/QUIZ", W / 2, H - 170, 8);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}
