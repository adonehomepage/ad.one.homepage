import fs from "node:fs";
import path from "node:path";

const frameOnly = process.argv.includes("--frame-only");
let css = "";
if (!frameOnly) {
  const html = fs.readFileSync(
    "C:/Users/찬현/Downloads/ADIT-The-Oak-Interactive-Template.html",
    "utf8",
  );
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  css = styles.join("\n\n");
  css = css.replace(
    /url\('(data:font\/woff2;base64,[A-Za-z0-9+/=]+)'\)/g,
    "url('/samples/oak-editorial/pretendard-0.woff2')",
  );
  css = css.replace(/url\('(data:image\/[^']+)'\)/g, "url('/samples/oak-editorial/photo-00.jpg')");
}

function scopeCss(src) {
  const parts = [];
  let i = 0;
  while (i < src.length) {
    if (
      src.startsWith("@font-face", i) ||
      src.startsWith("@keyframes", i) ||
      src.startsWith("@media", i) ||
      src.startsWith("@supports", i)
    ) {
      const start = i;
      const brace = src.indexOf("{", i);
      let depth = 0;
      let j = brace;
      for (; j < src.length; j++) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      let block = src.slice(start, j);
      if (block.startsWith("@media") || block.startsWith("@supports")) {
        const open = block.indexOf("{");
        const inner = block.slice(open + 1, -1);
        block = block.slice(0, open + 1) + scopeCss(inner) + "}";
      }
      parts.push(block);
      i = j;
      continue;
    }
    if (/\s/.test(src[i])) {
      parts.push(src[i]);
      i++;
      continue;
    }
    const brace = src.indexOf("{", i);
    if (brace < 0) {
      parts.push(src.slice(i));
      break;
    }
    let sel = src.slice(i, brace).trim();
    let depth = 0;
    let j = brace;
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const body = src.slice(brace, j);
    const scoped = sel
      .split(",")
      .map((s) => {
        s = s.trim();
        if (!s) return s;
        if (s === ":root") return ".oak-editorial-root";
        if (s === "html" || s === "body") return ".oak-editorial-root";
        if (s.startsWith(".oak-editorial-root")) return s;
        return `.oak-editorial-root ${s}`;
      })
      .join(",");
    parts.push(scoped + body);
    i = j;
  }
  return parts.join("");
}

const dest = path.resolve("src/modules/templates/oak-editorial/styles/oak-editorial.css");

function extractMediaBlocks(css) {
  const blocks = [];
  const re = /@media\s*\(/g;
  let match;
  while ((match = re.exec(css))) {
    const start = match.index;
    const brace = css.indexOf("{", start);
    const header = css.slice(start, brace).replace(/\s+/g, "");
    let depth = 0;
    let end = brace;
    for (; end < css.length; end++) {
      if (css[end] === "{") depth++;
      else if (css[end] === "}") {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
    }
    blocks.push({ header, inner: css.slice(brace + 1, end - 1) });
    re.lastIndex = end;
  }
  return blocks;
}

function retargetDevice(inner, device) {
  const scoped = device ? inner.replaceAll(".oak-editorial-root", `.oak-editorial-root[data-device="${device}"]`) : inner.replaceAll(".oak-editorial-root", ".oak-editorial-root[data-device]");
  return scoped.replaceAll("vw", "cqw");
}

function extractTopLevelVw(css) {
  const parts = [];
  let i = 0;
  while (i < css.length) {
    if (css.startsWith("@media", i) || css.startsWith("@supports", i) || css.startsWith("@keyframes", i) || css.startsWith("@font-face", i)) {
      const brace = css.indexOf("{", i);
      let depth = 0;
      let j = brace;
      for (; j < css.length; j++) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      i = j;
      continue;
    }
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 2;
      continue;
    }
    if (/\s/.test(css[i])) {
      i++;
      continue;
    }
    const brace = css.indexOf("{", i);
    if (brace < 0) break;
    let depth = 0;
    let j = brace;
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const rule = css.slice(i, j);
    if (rule.includes("vw")) parts.push(rule);
    i = j;
  }
  return parts.join("\n");
}

/** 편집기 기기 프레임은 뷰포트가 아니라 칸 너비다. 공개 화면의 @media 는 그대로 두고, 프레임용 규칙을 붙인다. */
export function appendOakDeviceFrame(css) {
  const stripped = css.replace(/\n\/\* BEGIN oak-device-frame \*\/[\s\S]*?\/\* END oak-device-frame \*\/\n?/g, "");
  const blocks = extractMediaBlocks(stripped);
  const mobile = blocks.filter((block) => /max-width:1000px/.test(block.header) || /max-width:700px/.test(block.header));
  const tablet = blocks.filter(
    (block) => /max-width:1000px/.test(block.header) || (/max-width:1100px/.test(block.header) && /min-width:701px/.test(block.header)),
  );
  const frame = [
    "",
    "/* BEGIN oak-device-frame */",
    "/* 편집기 미리보기 프레임. 공개 페이지는 data-device 가 없어 기존 @media 만 탄다. vw 는 프레임 너비(cqw)로 바꾼다. */",
    ".oak-origin-host:has(> .oak-editorial-root[data-device]){container-type:inline-size;container-name:oakframe}",
    retargetDevice(extractTopLevelVw(stripped), ""),
    retargetDevice(mobile.map((block) => block.inner).join("\n"), "mobile"),
    retargetDevice(tablet.map((block) => block.inner).join("\n"), "tablet"),
    "/* END oak-device-frame */",
    "",
  ].join("\n")
    // 1000px 구간의 17vw 제목은 뒤의 clamp 규칙에 가려 공개 화면에서는 쓰이지 않는다.
    // 프레임 규칙이 더 구체적이라 그대로 두면 태블릿 미리보기만 제목이 커진다.
    .replaceAll(/\.oak-editorial-root\[data-device="(?:mobile|tablet)"\] \.hero-title\{font-size:17cqw\}/g, "");
  return stripped.trimEnd() + "\n" + frame;
}

const out = frameOnly ? appendOakDeviceFrame(fs.readFileSync(dest, "utf8")) : appendOakDeviceFrame(scopeCss(css));
fs.writeFileSync(dest, out);
console.log({
  len: out.length,
  bodyCopy: (out.match(/body-copy/g) || []).length,
  broken: (out.match(/root-copy/g) || []).length,
});
