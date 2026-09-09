import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, PiggyBank, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/transacoes', label: 'Transações', icon: List },
  { to: '/investimentos', label: 'Investimentos', icon: PiggyBank },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground md:flex md:flex-col">
        <div className="p-6"><Link to="/" className="flex items-center gap-2.5"><span className="h-4 w-4 bg-accent"/><span className="text-lg font-bold">Contrapeso</span></Link></div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({to,label,icon:Icon,end}) => <NavLink key={to} to={to} end={end} className={({isActive}) => cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}><Icon className="h-4 w-4"/>{label}</NavLink>)}
        </nav>
        <div className="border-t border-sidebar-border p-4"><div className="mb-3 truncate text-xs text-sidebar-foreground/60">{user?.email}</div><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><LogOut className="h-4 w-4"/>Sair</button></div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden"><div className="flex items-center justify-between"><Link to="/" className="flex items-center gap-2"><span className="h-3.5 w-3.5 bg-accent"/><span className="font-bold">Contrapeso</span></Link><button onClick={handleLogout} aria-label="Sair" className="p-2"><LogOut className="h-4 w-4"/></button></div><nav className="mt-3 flex gap-2 overflow-x-auto">{nav.map(({to,label,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>cn('whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold',isActive?'bg-primary text-primary-foreground':'bg-muted')}>{label}</NavLink>)}</nav></header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
