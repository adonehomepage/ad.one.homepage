import type { PageSection, PageSnapshot } from "@/types";
import { SAMPLE_SITE } from "@/modules/templates/sample-site";
import { defaultOakEditorialData } from "./default-data";
import type { OakEditorialData, OakFaqItem, OakGalleryItem, OakHeroPhoto, OakPlanType, OakSpecRow, OakStat, OakLocationRow } from "./types";
import { OAK_DATA_KEY } from "./types";

export { OAK_DATA_KEY };

function asString(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function asPhotos(v: unknown): OakHeroPhoto[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((item, i) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      src: asString(row.src || row.url),
      alt: asString(row.alt),
      label: asString(row.label, `0${i + 1}`),
    };
  });
}

function asGallery(v: unknown): OakGalleryItem[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      imageUrl: asString(row.imageUrl || row.url || row.src),
      eyebrow: asString(row.eyebrow),
      title: asString(row.title),
      body: asString(row.body),
      alt: asString(row.alt),
    };
  });
}

function asPlans(v: unknown): OakPlanType[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((item, i) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id: asString(row.id || row.name, `plan-${i}`),
      name: asString(row.name, `TYPE ${i + 1}`),
      area: asString(row.area || row.exclusiveArea),
      supply: asString(row.supply || row.supplyArea),
      rooms: asString(row.rooms),
      heading: asString(row.heading || row.summary),
      description: asString(row.description || row.body || row.summary),
      floorplanImageUrl: asString(row.floorplanImageUrl || row.imageUrl),
    };
  });
}

function asSpecs(v: unknown): OakSpecRow[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return { label: asString(row.label), value: asString(row.value) };
  });
}

function asStats(v: unknown): OakStat[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return { value: asString(row.value), label: asString(row.label) };
  });
}

function asFaq(v: unknown): OakFaqItem[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return { question: asString(row.question), answer: asString(row.answer) };
  });
}

function asLocRows(v: unknown): OakLocationRow[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return { title: asString(row.title), body: asString(row.body) };
  });
}

/** 깊은 병합 — 저장된 부분 객체와 기본값을 합친다. */
export function mergeOakEditorialData(partial?: unknown): OakEditorialData {
  const base = defaultOakEditorialData();
  if (!partial || typeof partial !== "object") return base;
  const p = partial as Record<string, unknown>;
  const hero = (p.hero ?? {}) as Record<string, unknown>;
  const manifesto = (p.manifesto ?? {}) as Record<string, unknown>;
  const overview = (p.overview ?? {}) as Record<string, unknown>;
  const spaces = (p.spaces ?? {}) as Record<string, unknown>;
  const floorplan = (p.floorplan ?? {}) as Record<string, unknown>;
  const location = (p.location ?? {}) as Record<string, unknown>;
  const faq = (p.faq ?? {}) as Record<string, unknown>;
  const register = (p.register ?? {}) as Record<string, unknown>;
  const footer = (p.footer ?? {}) as Record<string, unknown>;
  const nav = (p.nav ?? {}) as Record<string, unknown>;

  return {
    ...base,
    brandName: asString(p.brandName, base.brandName),
    logoText: asString(p.logoText, base.logoText),
    logoSubtitle: asString(p.logoSubtitle, base.logoSubtitle),
    logoUrl: asString(p.logoUrl, base.logoUrl),
    nav: {
      overview: asString(nav.overview, base.nav.overview),
      spaces: asString(nav.spaces, base.nav.spaces),
      plans: asString(nav.plans, base.nav.plans),
      location: asString(nav.location, base.nav.location),
      register: asString(nav.register, base.nav.register),
    },
    hero: {
      ...base.hero,
      eyebrowLeft: asString(hero.eyebrowLeft, base.hero.eyebrowLeft),
      eyebrowRight: asString(hero.eyebrowRight, base.hero.eyebrowRight),
      title: asString(hero.title, base.hero.title),
      sideEyebrow: asString(hero.sideEyebrow, base.hero.sideEyebrow),
      sideHeadline: asString(hero.sideHeadline, base.hero.sideHeadline),
      sideMeta: asString(hero.sideMeta, base.hero.sideMeta),
      bottomLead: asString(hero.bottomLead, base.hero.bottomLead),
      exploreLabel: asString(hero.exploreLabel, base.hero.exploreLabel),
      captionNote: asString(hero.captionNote, base.hero.captionNote),
      photos: asPhotos(hero.photos) ?? base.hero.photos,
    },
    manifesto: {
      eyebrow: asString(manifesto.eyebrow, base.manifesto.eyebrow),
      title: asString(manifesto.title, base.manifesto.title),
      body: asString(manifesto.body, base.manifesto.body),
    },
    overview: {
      ...base.overview,
      eyebrow: asString(overview.eyebrow, base.overview.eyebrow),
      title: asString(overview.title, base.overview.title),
      imageUrl: asString(overview.imageUrl, base.overview.imageUrl),
      imageNote: asString(overview.imageNote, base.overview.imageNote),
      infoEyebrow: asString(overview.infoEyebrow, base.overview.infoEyebrow),
      infoTitle: asString(overview.infoTitle, base.overview.infoTitle),
      infoBody: asString(overview.infoBody, base.overview.infoBody),
      footnote: asString(overview.footnote, base.overview.footnote),
      stats: asStats(overview.stats) ?? base.overview.stats,
      specs: asSpecs(overview.specs) ?? base.overview.specs,
    },
    spaces: {
      ...base.spaces,
      eyebrow: asString(spaces.eyebrow, base.spaces.eyebrow),
      title: asString(spaces.title, base.spaces.title),
      viewAllLabel: asString(spaces.viewAllLabel, base.spaces.viewAllLabel),
      items: asGallery(spaces.items) ?? base.spaces.items,
      itemCapSettled: spaces.itemCapSettled === true,
    },
    floorplan: {
      ...base.floorplan,
      eyebrow: asString(floorplan.eyebrow, base.floorplan.eyebrow),
      title: asString(floorplan.title, base.floorplan.title),
      lead: asString(floorplan.lead, base.floorplan.lead),
      detailEyebrow: asString(floorplan.detailEyebrow, base.floorplan.detailEyebrow),
      conceptNote: asString(floorplan.conceptNote, base.floorplan.conceptNote),
      expandLabel: asString(floorplan.expandLabel, base.floorplan.expandLabel),
      registerLinkLabel: asString(floorplan.registerLinkLabel, base.floorplan.registerLinkLabel),
      plans: asPlans(floorplan.plans) ?? base.floorplan.plans,
    },
    location: {
      ...base.location,
      eyebrow: asString(location.eyebrow, base.location.eyebrow),
      title: asString(location.title, base.location.title),
      lead: asString(location.lead, base.location.lead),
      footnote: asString(location.footnote, base.location.footnote),
      mapCaption: asString(location.mapCaption, base.location.mapCaption),
      mapImageUrl: asString(location.mapImageUrl, base.location.mapImageUrl),
      mapLinkUrl: asString(location.mapLinkUrl, base.location.mapLinkUrl),
      rows: asLocRows(location.rows) ?? base.location.rows,
    },
    faq: {
      ...base.faq,
      eyebrow: asString(faq.eyebrow, base.faq.eyebrow),
      title: asString(faq.title, base.faq.title),
      items: asFaq(faq.items) ?? base.faq.items,
    },
    register: {
      ...base.register,
      eyebrow: asString(register.eyebrow, base.register.eyebrow),
      title: asString(register.title, base.register.title),
      body: asString(register.body, base.register.body),
      privacySummary: asString(register.privacySummary, base.register.privacySummary),
      privacyBody: asString(register.privacyBody, base.register.privacyBody),
      consentLabel: asString(register.consentLabel, base.register.consentLabel),
      submitLabel: asString(register.submitLabel, base.register.submitLabel),
    },
    footer: {
      ...base.footer,
      eyebrow: asString(footer.eyebrow, base.footer.eyebrow),
      wordmark: asString(footer.wordmark, base.footer.wordmark),
      tagline: asString(footer.tagline, base.footer.tagline),
      copyright: asString(footer.copyright, base.footer.copyright),
      credit: asString(footer.credit, base.footer.credit),
    },
    floatingBrand: asString(p.floatingBrand, base.floatingBrand),
    floatingCta: asString(p.floatingCta, base.floatingCta),
    fontLicenseNote: asString(p.fontLicenseNote, base.fontLicenseNote),
    isSampleData: typeof p.isSampleData === "boolean" ? p.isSampleData : base.isSampleData,
  };
}

function usesLegacyOakAsset(url: string) {
  return url.includes("/samples/oak-editorial/");
}

/** 구 시안(오크 내장 사진·카피)을 프리미엄 샘플·임시 현장 기본값으로 치환 */
function sanitizeLegacyOakSample(data: OakEditorialData): OakEditorialData {
  const base = defaultOakEditorialData();
  const legacyAssets =
    data.hero.photos.some((p) => usesLegacyOakAsset(p.src)) ||
    usesLegacyOakAsset(data.overview.imageUrl) ||
    data.spaces.items.some((i) => usesLegacyOakAsset(i.imageUrl)) ||
    usesLegacyOakAsset(data.location.mapImageUrl) ||
    data.floorplan.plans.some((p) => usesLegacyOakAsset(p.floorplanImageUrl));
  const legacyName = /oak|오크/i.test(
    `${data.brandName} ${data.logoText} ${data.hero.title} ${data.floatingBrand} ${data.footer.wordmark}`,
  );
  if (!legacyAssets && !legacyName) return data;
  if (!data.isSampleData && !legacyAssets) return data;
  return {
    ...base,
    brandName: legacyName ? base.brandName : data.brandName || base.brandName,
    logoText: legacyName ? base.logoText : data.logoText || base.logoText,
    logoUrl: data.logoUrl?.trim() && !usesLegacyOakAsset(data.logoUrl) ? data.logoUrl : base.logoUrl,
    isSampleData: true,
  };
}

const LEGACY_SPACE_TITLES = ["탁 트인 조망", "편리한 교통", "생활 인프라"] as const;

/** 샘플 3장(위 2·아래 1)만 4장 기본으로 맞춘다. 이미 맞췄거나 문구를 바꾼 경우는 그대로 둔다. */
export function settleOakSpaceItems(data: OakEditorialData): OakEditorialData {
  if (data.spaces.itemCapSettled) return data;
  const items = data.spaces.items;
  const legacyTrio =
    items.length === 3 && items.every((item, index) => item.title.trim() === LEGACY_SPACE_TITLES[index]);
  if (!legacyTrio) return data;
  const fourth = defaultOakEditorialData().spaces.items[3];
  if (!fourth) return data;
  return {
    ...data,
    spaces: {
      ...data.spaces,
      items: [...items, fourth],
      itemCapSettled: true,
    },
  };
}

export function readOakEditorialDataForSnapshot(snapshot: PageSnapshot): OakEditorialData {
  const raw = snapshot.globalSettings?.[OAK_DATA_KEY];
  let merged = settleOakSpaceItems(sanitizeLegacyOakSample(mergeOakEditorialData(raw)));
  // 프로젝트명으로 브랜드 힌트(샘플·레거시 치환 후)
  const projectName = snapshot.projectName?.trim();
  if (projectName && !raw) {
    return applyOakSiteIdentity(merged, { siteName: projectName });
  }
  const sampleBrand = merged.brandName === "임시 현장" || merged.brandName === SAMPLE_SITE.name || /oak|오크/i.test(merged.brandName);
  if (projectName && sampleBrand && projectName !== merged.brandName) {
    merged = applyOakSiteIdentity(merged, { siteName: projectName });
  }
  return merged;
}

export function applyOakSiteIdentity(
  data: OakEditorialData,
  opts: { siteName?: string; phone?: string },
): OakEditorialData {
  const name = opts.siteName?.trim();
  if (!name) return data;
  return {
    ...data,
    brandName: name,
    logoText: name,
    hero: {
      ...data.hero,
      title: name,
      sideEyebrow: name,
    },
    manifesto: {
      ...data.manifesto,
      eyebrow: data.manifesto.eyebrow.replaceAll("임시 현장", name).replaceAll(SAMPLE_SITE.name, name),
    },
    overview: {
      ...data.overview,
      specs: data.overview.specs.map((row) =>
        row.label === "사업명" ? { ...row, value: `${name} (예시)` } : row,
      ),
    },
    footer: {
      ...data.footer,
      eyebrow: data.footer.eyebrow.replaceAll("임시 현장", name).replaceAll(SAMPLE_SITE.name, name),
      wordmark: name,
      copyright: `© ${name} — SAMPLE 2026`,
    },
    floatingBrand: name,
    isSampleData: true,
  };
}

function cleanName(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function replaceNameTokens(value: string, tokens: string[], next: string) {
  const sorted = [...tokens].filter(Boolean).sort((a, b) => b.length - a.length);
  let out = value;
  const marks: string[] = [];
  sorted.forEach((token, index) => {
    if (!out.includes(token)) return;
    const mark = `\u0000${index}\u0000`;
    out = out.replaceAll(token, mark);
    marks[index] = next;
  });
  marks.forEach((replacement, index) => {
    if (replacement) out = out.replaceAll(`\u0000${index}\u0000`, replacement);
  });
  return out;
}

function applyLinkedOakNames(data: OakEditorialData, tokens: string[], next: string): OakEditorialData {
  const names = [...new Set(tokens.map(cleanName).filter((token) => token && token !== next))];
  if (!next || names.length === 0) return data;
  const matches = (value: string) => names.includes(cleanName(value));
  const fill = (value: string) => (matches(value) || !cleanName(value) ? next : value);
  return {
    ...data,
    brandName: fill(data.brandName),
    logoText: fill(data.logoText),
    floatingBrand: fill(data.floatingBrand),
    hero: {
      ...data.hero,
      title: fill(data.hero.title),
      sideEyebrow: matches(data.hero.sideEyebrow) ? next : data.hero.sideEyebrow,
    },
    manifesto: {
      ...data.manifesto,
      eyebrow: replaceNameTokens(data.manifesto.eyebrow, names, next),
    },
    overview: {
      ...data.overview,
      specs: data.overview.specs.map((row) => {
        if (row.label !== "사업명") return row;
        const value = replaceNameTokens(row.value, names, next);
        return value === row.value ? row : { ...row, value };
      }),
    },
    footer: {
      ...data.footer,
      wordmark: fill(data.footer.wordmark),
      eyebrow: replaceNameTokens(data.footer.eyebrow, names, next),
      copyright: replaceNameTokens(data.footer.copyright, names, next),
    },
  };
}

/**
 * 로고·큰 제목·오른쪽 단지명·푸터 워드마크·플로팅이 같은 현장명이면 함께 바꾼다.
 * 그 칸이 예전 현장명과 다르면 광고 문구로 보고 그대로 둔다.
 * 큰 제목만 먼저 바뀌어 나머지가 옛 이름인 경우에는 그 옛 이름도 새 제목으로 맞춘다.
 */
export function linkOakSiteName(
  data: OakEditorialData,
  previousValue: string,
  nextValue: string,
): OakEditorialData | null {
  const prev = cleanName(previousValue);
  const next = cleanName(nextValue);
  if (!prev || !next || prev === next) return null;

  const brand = cleanName(data.brandName);
  const logo = cleanName(data.logoText);
  const title = cleanName(data.hero.title);
  const wordmark = cleanName(data.footer.wordmark);
  const floating = cleanName(data.floatingBrand);
  const nameSlots = [brand, logo, title, wordmark, floating].filter(Boolean);
  if (!nameSlots.includes(prev)) return null;

  const stale =
    prev === title && brand && title !== brand && [logo, wordmark, floating].every((value) => value === brand)
      ? brand
      : "";
  return applyLinkedOakNames(data, [prev, stale], next);
}

/** 편집기에 들어왔을 때, 큰 제목만 바뀌고 로고·푸터·플로팅이 옛 현장명인 상태를 맞춘다. */
export function catchUpOakSiteName(data: OakEditorialData): OakEditorialData | null {
  const title = cleanName(data.hero.title);
  const brand = cleanName(data.brandName);
  if (!title || !brand || title === brand) return null;
  const stillOldName = [data.logoText, data.footer.wordmark, data.floatingBrand].every(
    (value) => cleanName(value) === brand,
  );
  if (!stillOldName) return null;
  return applyLinkedOakNames(data, [brand], title);
}

/** oak-editorial 전용 섹션 시드용 content 조각 */
export function oakSectionContents(data: OakEditorialData): Record<string, Record<string, unknown>> {
  return {
    hero: { oak: true, ...data.hero, manifesto: data.manifesto },
    overview: { oak: true, ...data.overview },
    premium: { oak: true, ...data.spaces },
    floorplan: { oak: true, ...data.floorplan },
    location: { oak: true, ...data.location },
    faq: { oak: true, ...data.faq },
    lead_form: { oak: true, ...data.register },
    legal: { oak: true, ...data.footer, fontLicenseNote: data.fontLicenseNote },
  };
}

export function patchOakFromSection(
  data: OakEditorialData,
  section: PageSection,
): OakEditorialData {
  const c = section.content as Record<string, unknown>;
  if (!c?.oak) return data;
  switch (section.sectionType) {
    case "hero": {
      const manifesto = (c.manifesto ?? data.manifesto) as OakEditorialData["manifesto"];
      return {
        ...data,
        hero: {
          ...data.hero,
          eyebrowLeft: asString(c.eyebrowLeft, data.hero.eyebrowLeft),
          eyebrowRight: asString(c.eyebrowRight, data.hero.eyebrowRight),
          title: asString(c.title, data.hero.title),
          sideEyebrow: asString(c.sideEyebrow, data.hero.sideEyebrow),
          sideHeadline: asString(c.sideHeadline, data.hero.sideHeadline),
          sideMeta: asString(c.sideMeta, data.hero.sideMeta),
          bottomLead: asString(c.bottomLead, data.hero.bottomLead),
          exploreLabel: asString(c.exploreLabel, data.hero.exploreLabel),
          captionNote: asString(c.captionNote, data.hero.captionNote),
          photos: asPhotos(c.photos) ?? data.hero.photos,
        },
        manifesto: {
          eyebrow: asString((manifesto as { eyebrow?: string }).eyebrow, data.manifesto.eyebrow),
          title: asString((manifesto as { title?: string }).title, data.manifesto.title),
          body: asString((manifesto as { body?: string }).body, data.manifesto.body),
        },
      };
    }
    case "overview":
      return {
        ...data,
        overview: {
          ...data.overview,
          eyebrow: asString(c.eyebrow, data.overview.eyebrow),
          title: asString(c.title, data.overview.title),
          imageUrl: asString(c.imageUrl, data.overview.imageUrl),
          imageNote: asString(c.imageNote, data.overview.imageNote),
          infoEyebrow: asString(c.infoEyebrow, data.overview.infoEyebrow),
          infoTitle: asString(c.infoTitle, data.overview.infoTitle),
          infoBody: asString(c.infoBody, data.overview.infoBody),
          footnote: asString(c.footnote, data.overview.footnote),
          stats: asStats(c.stats) ?? data.overview.stats,
          specs: asSpecs(c.specs) ?? data.overview.specs,
        },
      };
    case "premium":
      return {
        ...data,
        spaces: {
          ...data.spaces,
          eyebrow: asString(c.eyebrow, data.spaces.eyebrow),
          title: asString(c.title, data.spaces.title),
          viewAllLabel: asString(c.viewAllLabel, data.spaces.viewAllLabel),
          items: asGallery(c.items) ?? data.spaces.items,
        },
      };
    case "floorplan":
      return {
        ...data,
        floorplan: {
          ...data.floorplan,
          eyebrow: asString(c.eyebrow, data.floorplan.eyebrow),
          title: asString(c.title, data.floorplan.title),
          lead: asString(c.lead, data.floorplan.lead),
          detailEyebrow: asString(c.detailEyebrow, data.floorplan.detailEyebrow),
          conceptNote: asString(c.conceptNote, data.floorplan.conceptNote),
          expandLabel: asString(c.expandLabel, data.floorplan.expandLabel),
          registerLinkLabel: asString(c.registerLinkLabel, data.floorplan.registerLinkLabel),
          plans: asPlans(c.plans) ?? data.floorplan.plans,
        },
      };
    case "location":
      return {
        ...data,
        location: {
          ...data.location,
          eyebrow: asString(c.eyebrow, data.location.eyebrow),
          title: asString(c.title, data.location.title),
          lead: asString(c.lead, data.location.lead),
          footnote: asString(c.footnote, data.location.footnote),
          mapCaption: asString(c.mapCaption, data.location.mapCaption),
          mapImageUrl: asString(c.mapImageUrl, data.location.mapImageUrl),
          mapLinkUrl: asString(c.mapLinkUrl, data.location.mapLinkUrl),
          rows: asLocRows(c.rows) ?? data.location.rows,
        },
      };
    case "faq":
      return {
        ...data,
        faq: {
          ...data.faq,
          eyebrow: asString(c.eyebrow, data.faq.eyebrow),
          title: asString(c.title, data.faq.title),
          items: asFaq(c.items) ?? data.faq.items,
        },
      };
    case "lead_form":
      return {
        ...data,
        register: {
          ...data.register,
          eyebrow: asString(c.eyebrow, data.register.eyebrow),
          title: asString(c.title, data.register.title),
          body: asString(c.body, data.register.body),
          privacySummary: asString(c.privacySummary, data.register.privacySummary),
          privacyBody: asString(c.privacyBody, data.register.privacyBody),
          consentLabel: asString(c.consentLabel, data.register.consentLabel),
          submitLabel: asString(c.submitLabel, data.register.submitLabel),
        },
      };
    case "legal":
      return {
        ...data,
        footer: {
          ...data.footer,
          eyebrow: asString(c.eyebrow, data.footer.eyebrow),
          wordmark: asString(c.wordmark, data.footer.wordmark),
          tagline: asString(c.tagline, data.footer.tagline),
          copyright: asString(c.copyright, data.footer.copyright),
          credit: asString(c.credit, data.footer.credit),
        },
        fontLicenseNote: asString(c.fontLicenseNote, data.fontLicenseNote),
      };
    default:
      return data;
  }
}

/** 원본 섹션 content로 oak 데이터를 재구성(복제본은 렌더 시 개별 사용) */
export function rebuildOakFromOriginalSections(
  sections: PageSection[],
  chrome: OakEditorialData,
): OakEditorialData {
  let next = chrome;
  for (const section of sections) {
    if (!section.isOriginal) continue;
    next = patchOakFromSection(next, section);
  }
  return next;
}
