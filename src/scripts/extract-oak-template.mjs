/**
 * ADIT-The-Oak-Interactive-Template.html → 에셋·CSS·마크업 골격 분리
 * 실행: node src/scripts/extract-oak-template.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("C:/Users/찬현/Downloads/ADIT-The-Oak-Interactive-Template.html");
const OUT_PUBLIC = path.resolve("public/samples/oak-editorial");
const OUT_MOD = path.resolve("src/modules/templates/oak-editorial");

fs.mkdirSync(OUT_PUBLIC, { recursive: true });
fs.mkdirSync(path.join(OUT_MOD, "styles"), { recursive: true });
fs.mkdirSync(path.join(OUT_MOD, "lib"), { recursive: true });

const html = fs.readFileSync(SRC, "utf8");

// CSS: first <style>…</style> blocks (may be multiple)
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
let css = styles.join("\n\n");

// Extract @font-face base64 → file, rewrite url
let fontIdx = 0;
css = css.replace(
  /url\('(data:font\/woff2;base64,[A-Za-z0-9+/=]+)'\)/g,
  (_m, dataUrl) => {
    const b64 = dataUrl.split(",")[1];
    const name = `pretendard-${fontIdx++}.woff2`;
    fs.writeFileSync(path.join(OUT_PUBLIC, name), Buffer.from(b64, "base64"));
    console.log("font", name, Buffer.from(b64, "base64").length);
    return `url('/samples/oak-editorial/${name}')`;
  },
);

// Extract images from HTML attributes and CSS
let imgIdx = 0;
const imgMap = new Map();
function saveImage(dataUrl, hint = "img") {
  if (imgMap.has(dataUrl)) return imgMap.get(dataUrl);
  const m = /^data:image\/([\w+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return dataUrl;
  const ext = m[1] === "jpeg" ? "jpg" : m[1].replace("+xml", "");
  const name = `${hint}-${String(imgIdx++).padStart(2, "0")}.${ext}`;
  fs.writeFileSync(path.join(OUT_PUBLIC, name), Buffer.from(m[2], "base64"));
  const pub = `/samples/oak-editorial/${name}`;
  imgMap.set(dataUrl, pub);
  console.log("img", name, Buffer.from(m[2], "base64").length);
  return pub;
}

// Replace data images in full HTML copy for body extraction
let working = html;
working = working.replace(/src="(data:image\/[^"]+)"/g, (_m, dataUrl) => {
  const pub = saveImage(dataUrl, "photo");
  return `src="${pub}"`;
});
working = working.replace(/url\('(data:image\/[^']+)'\)/g, (_m, dataUrl) => {
  const pub = saveImage(dataUrl, "cssimg");
  return `url('${pub}')`;
});
working = working.replace(/url\("(data:image\/[^"]+)"\)/g, (_m, dataUrl) => {
  const pub = saveImage(dataUrl, "cssimg");
  return `url("${pub}")`;
});

// Re-extract CSS after image rewrite in styles only
const styles2 = [...working.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
let css2 = styles2.join("\n\n");
css2 = css2.replace(
  /url\('(data:font\/woff2;base64,[A-Za-z0-9+/=]+)'\)/g,
  (_m, dataUrl) => {
    const b64 = dataUrl.split(",")[1];
    const name = `pretendard-extra.woff2`;
    // already extracted above from first pass — keep path
    return `url('/samples/oak-editorial/pretendard-0.woff2')`;
  },
);
// Also replace any remaining data images in css2
css2 = css2.replace(/url\('(data:image\/[^']+)'\)/g, (_m, dataUrl) => {
  return `url('${saveImage(dataUrl, "cssimg")}')`;
});

// Scope CSS under .oak-editorial-root to isolate
const scoped = css2
  .replace(/:root\s*\{/g, ".oak-editorial-root{")
  .replace(/\bhtml\b/g, ".oak-editorial-root")
  .replace(/\bbody\b/g, ".oak-editorial-root");

fs.writeFileSync(path.join(OUT_MOD, "styles", "oak-editorial.css"), scoped, "utf8");
console.log("wrote oak-editorial.css", scoped.length);

// Body inner HTML
const bodyMatch = working.match(/<body[^>]*>([\s\S]*)<\/body>/i);
let body = bodyMatch ? bodyMatch[1] : "";
// Strip CURSOR HANDOFF details for production markup reference (keep in docs)
const handoff = body.match(/<details[\s\S]*CURSOR HANDOFF[\s\S]*?<\/details>/i)?.[0] ?? "";
fs.writeFileSync(path.join("docs", "oak-handoff.html"), handoff || "(none)", "utf8");

// Script
const scriptMatch = working.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
const script = scriptMatch ? scriptMatch[1] : "";
fs.writeFileSync(path.join(OUT_MOD, "lib", "oak-interactions.raw.js"), script, "utf8");
console.log("wrote script", script.length);

// Save cleaned body for reference
fs.writeFileSync(path.join(OUT_MOD, "lib", "oak-body.raw.html"), body, "utf8");
console.log("images:", imgMap.size);
console.log("done");
