'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Loading from '@/components/ui/Loading';

const navItems = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/calendar', label: 'Calendario', icon: '📅' },
  { href: '/reservations/new', label: 'Nueva Reserva', icon: '➕' },
  { href: '/reservations', label: 'Reservas', icon: '📋' },
  { href: '/guests', label: 'Huéspedes', icon: '👥' },
  { href: '/reports', label: 'Reportes', icon: '📊' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Gestor de Turnos</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-900 py-2 px-3 -mr-3 rounded"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <nav className="bg-white border-b lg:hidden" aria-label="Navegación principal">
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 text-sm whitespace-nowrap px-3 py-2.5 rounded-md min-h-[44px] ${
                pathname === item.href
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent pointer-events-none" aria-hidden="true" />
      </nav>

      <div className="container mx-auto px-4 py-4 flex gap-6">
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="bg-white rounded-lg shadow p-4 sticky top-24">
            <nav className="space-y-1" aria-label="Navegación lateral">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                    pathname === item.href
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
