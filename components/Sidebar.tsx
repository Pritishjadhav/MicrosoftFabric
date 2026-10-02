'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Files,
  Upload,
  Settings,
  LogOut,
  Database,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/files', icon: Files, label: 'Files' },
  { href: '/dashboard/upload', icon: Upload, label: 'Upload' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? 'U';
  const userName = session?.user?.name ?? 'User';
  const userEmail = session?.user?.email ?? '';

  return (
    <aside
      className="sidebar w-64 min-h-screen flex flex-col fixed left-0 top-0 z-30"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-sm leading-none block">
              Fabric File
            </span>
            <span className="text-white/50 text-xs leading-none mt-0.5 block">
              Manager
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Sidebar navigation">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
              )}
              <Icon
                size={17}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-white/40 group-hover:text-white/70'
                }`}
              />
              {label}
              {isActive && (
                <ChevronRight size={14} className="ml-auto text-white/40" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-white/40 text-xs truncate">{userEmail}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all duration-150 w-full text-left"
          aria-label="Sign out"
        >
          <LogOut size={16} className="text-white/40" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
