import { NextRequest, NextResponse } from 'next/server';

import { resolveAnimePortrait } from '@/lib/anime-portrait.server';

/**
 * 动漫竖版封面解析：Bangumi 封面为横图时，按片名找一张竖版海报。
 * GET /api/anime-cover?title=<显示名>&original=<Bangumi 原名>
 * 始终返回 200：{ portrait: string | null, source: 'anilist' | 'tmdb' | null }，
 * portrait 为 null 表示没有竖版可补，调用方按横屏显示处理。
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title') || '';
  const original = searchParams.get('original') || '';

  if (!title && !original) {
    return NextResponse.json({ error: '缺少 title 参数' }, { status: 400 });
  }

  const result = await resolveAnimePortrait({
    title: title || original,
    originalTitle: original || undefined,
  });

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  });
}
