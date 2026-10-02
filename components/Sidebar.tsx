'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Files,
  Upload,
  Settings,
  Database,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/files', icon: Files, label: 'Files' },
  { href: '/upload', icon: Upload, label: 'Upload' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sidebar w-64 min-h-screen flex flex-col fixed left-0 top-0 z-30"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3 group">
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
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
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
    </aside>
  );
}
