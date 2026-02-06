'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Users,
  FileText,
  Bell,
  Menu,
  X,
} from 'lucide-react';

const menuItems = [
  {
    id: 'overview',
    label: '总览',
    icon: LayoutDashboard,
    href: '/dashboard/overview',
  },
  {
    id: 'analytics',
    label: '分析报表',
    icon: BarChart3,
    href: '/dashboard/analytics',
  },
  {
    id: 'authenticate',
    label: '风控策略',
    icon: Users,
    href: '/dashboard/authenticate',
  },
  {
    id: 'funds',
    label: '资金管理',
    icon: FileText,
    href: '/dashboard/funds',
  },
  {
    id: 'transactions',
    label: '交易明细',
    icon: Settings,
    href: '/dashboard/transactions',
  },
  {
    id: 'notifications',
    label: '通知',
    icon: Bell,
    href: '/dashboard/notifications',
  },
  {
    id: 'settings',
    label: '设置',
    icon: Settings,
    href: '/dashboard/settings',
  },
  
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-white/5 border border-white/10 lg:hidden cursor-pointer hover:border-white/30 hover:bg-white/10 transition-colors duration-200"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen w-64 bg-[#050505] border-r border-white/10 z-30 transition-transform duration-300 lg:translate-x-0 overflow-y-auto',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo/Header */}
        <div className="sticky top-0 bg-[#050505] h-20 flex items-center justify-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30">
              <LayoutDashboard className="w-5 h-5 text-[#050505]" />
            </div>
            <h1 className="text-lg font-semibold text-white tracking-wide">
              AgentPay
            </h1>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={closeMobile}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 cursor-pointer',
                  isActive
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-[#050505] shadow-lg'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10 bg-[#0B1220]">
          <p className="text-xs text-slate-400">
            v1.0.0 | AgentPay Console
          </p>
        </div>
      </aside>
    </>
  );
}
