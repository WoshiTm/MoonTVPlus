/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';

import { getConfig } from '@/lib/config';
import { getTMDBImageUrl, searchTMDBMulti } from '@/lib/tmdb.client';

/**
 * 动漫竖版封面解析（仅服务端）。
 * Bangumi 封面为横图时，按片名找一张竖版海报，链路：AniList → TMDB → 无。
 * AniList 为动漫专库、封面强制竖版，GraphQL 接口免 Key；但它会拦截
 * 非浏览器 UA 的请求，故解析必须在服务端用浏览器 UA 发起。
 */

const ANILIST_API_URL = 'https://graphql.anilist.co';
const ANILIST_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';

const ANILIST_QUERY = `
query ($search: String) {
  Page(perPage: 3) {
    media(search: $search, type: ANIME) {
      id
      title { romaji english native }
      coverImage { large }
    }
  }
}
`;

const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 天
const portraitCache = new Map<
  string,
  {
    portrait: string | null;
    source: 'anilist' | 'tmdb' | null;
    timestamp: number;
  }
>();

/** 去掉开头的【】/[] 标签（如【活動記録】），不用正则，避免括号转义问题 */
function stripLeadingBracketTag(title: string): string {
  if (title.startsWith('【')) {
    const end = title.indexOf('】');
    if (end > 0) return title.slice(end + 1).trimStart();
  }
  if (title.startsWith('[')) {
    const end = title.indexOf(']');
    if (end > 0) return title.slice(end + 1).trimStart();
  }
  return title;
}

/** 去掉季数/迷你动画等后缀，得到更可能命中原作的检索名 */
function cleanAnimeTitle(title: string): string {
  return stripLeadingBracketTag(title)
    .replace(/第[一二三四五六七八九十\d]+[期季]/g, '')
    .replace(/第\d+クール/g, '')
    .replace(/\s+Season\s+\d+/gi, '')
    .replace(/\s+S\d+\s*$/i, '')
    .replace(/ミニアニメ劇場|ミニアニメ/g, '')
    .replace(/\s*ミニ\s*$/, '')
    .replace(/ちょいたし\s*$/, '')
    .replace(/\s*2DMV.*$/, '')
    .replace(/[「」『』]/g, '')
    .replace(/\s+[伍五]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 在周年/2DMV/引号/括号处截断，取系列本名部分，再按常规清理 */
function baseCutTitle(title: string): string {
  const markers = ['周年', '2DMV', '「', '『', '（', '(', '【'];
  let cut = title.length;
  for (const m of markers) {
    const i = title.indexOf(m);
    if (i >= 0 && i < cut) cut = i;
  }
  return cleanAnimeTitle(title.slice(0, cut));
}

/** 取词尾括号里的内容（多为系列本名，如（蓮ノ空女学院スクールアイドルクラブ）） */
function parenTitle(title: string): string {
  const m = title.match(/[（(]([^）)]+)[）)]\s*$/);
  if (!m) return '';
  const inner = m[1].trim();
  if (inner.length < 6 || /^\d+$/.test(inner)) return '';
  return inner;
}

/** 取清理后的首个空格分段（系列根名），太短或疑似英文小词时不用 */
function firstSegmentTitle(title: string): string {
  const cleaned = cleanAnimeTitle(title);
  const seg = cleaned.split(/\s+/)[0] || '';
  if (seg.length < 4) return '';
  const hasCJK = /[\u3040-\u30ff\u3400-\u9fff]/.test(seg);
  if (!hasCJK && seg.length < 6) return '';
  return seg;
}

function buildSearchVariants(
  originalTitle: string | undefined,
  displayTitle: string
): string[] {
  const out: string[] = [];
  const push = (s: string | undefined) => {
    const t = (s || '').trim();
    if (t && !out.includes(t)) out.push(t);
  };
  push(originalTitle);
  push(originalTitle ? cleanAnimeTitle(originalTitle) : '');
  push(displayTitle);
  push(cleanAnimeTitle(displayTitle));
  push(originalTitle ? baseCutTitle(originalTitle) : '');
  push(originalTitle ? parenTitle(originalTitle) : '');
  push(baseCutTitle(displayTitle));
  push(parenTitle(displayTitle));
  push(originalTitle ? firstSegmentTitle(originalTitle) : '');
  push(firstSegmentTitle(displayTitle));
  return out;
}

async function searchAniList(query: string): Promise<string | null> {
  try {
    const res = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': ANILIST_UA,
      },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { search: query },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const media = data?.data?.Page?.media;
    if (!Array.isArray(media) || media.length === 0) return null;
    const cover = media[0]?.coverImage?.large;
    return typeof cover === 'string' && cover ? cover : null;
  } catch {
    return null;
  }
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_:：·.,!！?？'’"“”()（）[\]【】]/g, '')
    .trim();
}

/** 严格匹配：结果标题（去季数后缀、归一化后）须与查询一致，不取首条兜底 */
function findStrictMatch(results: any[], query: string): any | null {
  const want = normalizeTitle(cleanAnimeTitle(query));
  if (!want) return null;
  for (const r of results) {
    for (const field of [
      r.title,
      r.name,
      r.original_title,
      r.original_name,
    ]) {
      if (
        field &&
        normalizeTitle(cleanAnimeTitle(String(field))) === want
      ) {
        return r;
      }
    }
  }
  return null;
}

async function searchTMDBPortrait(title: string): Promise<string | null> {
  try {
    const config = await getConfig();
    const apiKey = config.SiteConfig.TMDBApiKey;
    if (!apiKey) return null;
    const proxy = config.SiteConfig.TMDBProxy;
    const reverseProxy = config.SiteConfig.TMDBReverseProxy;
    const queries = [title, cleanAnimeTitle(title)].filter(
      (q, i, arr) => q && arr.indexOf(q) === i
    );
    for (const q of queries) {
      const result = await searchTMDBMulti(apiKey, q, proxy, reverseProxy);
      if (result.code !== 200) continue;
      const match = findStrictMatch(result.results, q);
      const path = match?.poster_path;
      if (path) return getTMDBImageUrl(path, 'w500');
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveAnimePortrait(titles: {
  title: string;
  originalTitle?: string;
}): Promise<{
  portrait: string | null;
  source: 'anilist' | 'tmdb' | null;
}> {
  const displayTitle = (titles.title || '').trim();
  const originalTitle = (titles.originalTitle || '').trim();
  if (!displayTitle && !originalTitle) {
    return { portrait: null, source: null };
  }

  const cacheKey = `${originalTitle}|${displayTitle}`;
  const cached = portraitCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { portrait: cached.portrait, source: cached.source };
  }

  let portrait: string | null = null;
  let source: 'anilist' | 'tmdb' | null = null;

  for (const variant of buildSearchVariants(
    originalTitle || undefined,
    displayTitle || originalTitle
  )) {
    portrait = await searchAniList(variant);
    if (portrait) {
      source = 'anilist';
      break;
    }
  }

  if (!portrait) {
    const tmdbTitles = [displayTitle, originalTitle].filter(
      (t, i, arr) => t && arr.indexOf(t) === i
    );
    for (const t of tmdbTitles) {
      portrait = await searchTMDBPortrait(t);
      if (portrait) {
        source = 'tmdb';
        break;
      }
    }
  }

  portraitCache.set(cacheKey, {
    portrait,
    source,
    timestamp: Date.now(),
  });
  Array.from(portraitCache.entries()).forEach(([key, value]) => {
    if (Date.now() - value.timestamp > CACHE_TTL) {
      portraitCache.delete(key);
    }
  });

  return { portrait, source };
}
