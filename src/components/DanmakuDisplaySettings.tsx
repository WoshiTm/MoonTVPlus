'use client';

import type { DanmakuSettings } from '@/lib/danmaku/types';

interface DanmakuDisplaySettingsProps {
  settings: DanmakuSettings;
  onChange: (patch: Partial<DanmakuSettings>) => void;
  /** 外层使用 TMDB 背景图时，文字用浅色 */
  lightText?: boolean;
}

// 显示区域滑块：marginBottom 是底部留白，显示面积 = 100 - 留白
function displayAreaPercent(marginBottom: number | string): number {
  if (typeof marginBottom === 'string') {
    const parsed = parseInt(marginBottom, 10);
    if (Number.isNaN(parsed)) return 50;
    return Math.min(100, Math.max(10, 100 - parsed));
  }
  return 50;
}

export default function DanmakuDisplaySettings({
  settings,
  onChange,
  lightText = false,
}: DanmakuDisplaySettingsProps) {
  const labelClass = lightText
    ? 'text-white/85'
    : 'text-gray-700 dark:text-gray-200';
  const valueClass = lightText
    ? 'text-white/70'
    : 'text-gray-500 dark:text-gray-400';
  const borderClass = lightText
    ? 'border-white/15'
    : 'border-gray-200 dark:border-gray-700';

  const areaPercent = displayAreaPercent(settings.marginBottom);
  const opacityPercent = Math.round(settings.opacity * 100);

  return (
    <div
      className={`flex-shrink-0 border-t ${borderClass} pt-3 pb-1 px-1 space-y-2`}
    >
      <div className={`text-sm font-medium ${labelClass}`}>弹幕显示设置</div>

      <label className='flex items-center gap-3 text-sm'>
        <span className={`w-14 flex-shrink-0 ${labelClass}`}>字体大小</span>
        <input
          type='range'
          min={12}
          max={40}
          step={1}
          value={settings.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className='flex-1 min-w-0 accent-green-500'
          aria-label='弹幕字体大小'
        />
        <span className={`w-12 flex-shrink-0 text-right ${valueClass}`}>
          {settings.fontSize}
        </span>
      </label>

      <label className='flex items-center gap-3 text-sm'>
        <span className={`w-14 flex-shrink-0 ${labelClass}`}>速度</span>
        <input
          type='range'
          min={1}
          max={10}
          step={1}
          value={settings.speed}
          onChange={(e) => onChange({ speed: Number(e.target.value) })}
          className='flex-1 min-w-0 accent-green-500'
          aria-label='弹幕速度'
        />
        <span className={`w-12 flex-shrink-0 text-right ${valueClass}`}>
          {settings.speed}
        </span>
      </label>

      <label className='flex items-center gap-3 text-sm'>
        <span className={`w-14 flex-shrink-0 ${labelClass}`}>不透明度</span>
        <input
          type='range'
          min={10}
          max={100}
          step={5}
          value={opacityPercent}
          onChange={(e) =>
            onChange({ opacity: Number(e.target.value) / 100 })
          }
          className='flex-1 min-w-0 accent-green-500'
          aria-label='弹幕不透明度'
        />
        <span className={`w-12 flex-shrink-0 text-right ${valueClass}`}>
          {opacityPercent}%
        </span>
      </label>

      <label className='flex items-center gap-3 text-sm'>
        <span className={`w-14 flex-shrink-0 ${labelClass}`}>上边距</span>
        <input
          type='range'
          min={0}
          max={100}
          step={5}
          value={settings.marginTop}
          onChange={(e) => onChange({ marginTop: Number(e.target.value) })}
          className='flex-1 min-w-0 accent-green-500'
          aria-label='弹幕上边距'
        />
        <span className={`w-12 flex-shrink-0 text-right ${valueClass}`}>
          {settings.marginTop}
        </span>
      </label>

      <label className='flex items-center gap-3 text-sm'>
        <span className={`w-14 flex-shrink-0 ${labelClass}`}>显示区域</span>
        <input
          type='range'
          min={10}
          max={100}
          step={5}
          value={areaPercent}
          onChange={(e) =>
            onChange({ marginBottom: `${100 - Number(e.target.value)}%` })
          }
          className='flex-1 min-w-0 accent-green-500'
          aria-label='弹幕显示区域'
        />
        <span className={`w-12 flex-shrink-0 text-right ${valueClass}`}>
          {areaPercent}%
        </span>
      </label>
    </div>
  );
}
