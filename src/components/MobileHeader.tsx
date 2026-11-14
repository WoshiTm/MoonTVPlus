'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UpdateNotification } from './UpdateNotification';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header
      className='md:hidden fixed top-0 left-0 right-0 z-[999] w-full'
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      {/* 背景层：多层毛玻璃叠加、模糊强度向下递减，过渡自然无分界线（类原生）；内容层不受影响 */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 top-0 -bottom-6'
      >
        <div
          className='absolute inset-0 bg-white/25 dark:bg-gray-900/25'
          style={{
            maskImage:
              'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)',
          }}
        />
        <div
          className='absolute inset-0 backdrop-blur-[2px]'
          style={{
            maskImage:
              'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)',
          }}
        />
        <div
          className='absolute inset-0 backdrop-blur-[6px]'
          style={{
            maskImage:
              'linear-gradient(to bottom, black calc(100% - 24px), transparent calc(100% - 8px))',
            WebkitMaskImage:
              'linear-gradient(to bottom, black calc(100% - 24px), transparent calc(100% - 8px))',
          }}
        />
        <div
          className='absolute inset-0 backdrop-blur-md'
          style={{
            maskImage:
              'linear-gradient(to bottom, black calc(100% - 24px), transparent calc(100% - 16px))',
            WebkitMaskImage:
              'linear-gradient(to bottom, black calc(100% - 24px), transparent calc(100% - 16px))',
          }}
        />
      </div>
      <div className='relative h-12 flex items-center justify-between px-4'>
        {/* 左侧：搜索按钮、返回按钮和设置按钮 */}
        <div className='flex items-center gap-2'>
          <Link
            href='/search'
            className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors'
          >
            <svg
              className='w-full h-full'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </Link>
          {showBackButton && <BackButton />}
        </div>

        {/* 右侧按钮 */}
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <UserMenu />
          <UpdateNotification />
        </div>

        {/* 中间：Logo（相对内容行居中，避免被 safe-area 顶偏） */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
          <Link
            href='/'
            prefetch={false}
            className='text-2xl font-bold text-green-600 tracking-tight hover:opacity-80 transition-opacity'
          >
            {siteName}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
