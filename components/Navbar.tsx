'use client';

import { useSession } from 'next-auth/react';
import { Bell, Search } from 'lucide-react';

interface NavbarProps {
  title?: string;
}

export function Navbar({ title }: NavbarProps) {
  const { data: session } = useSession();
  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Left: Title */}
      <div>
        {title ? (
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-800">Fabric File Manager</span>
          </div>
        )}
      </div>

      {/* Right: Actions + Avatar */}
      <div className="flex items-center gap-3">
        {/* Search hint — decorative */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-default">
          <Search size={14} />
          <span>Search files...</span>
          <kbd className="ml-2 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Notification bell */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700 leading-none">
              {session?.user?.name ?? 'User'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{session?.user?.email ?? ''}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ring-2 ring-white shadow-sm">
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
}
