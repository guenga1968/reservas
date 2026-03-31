'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/format';
import { Reservation, Stats } from '@/types';
import Loading from '@/components/ui/Loading';
import Link from 'next/link';

export default function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<Stats>({
    activeReservations: 0,
    todayCheckIn: 0,
    todayCheckOut: 0,
    totalGuests: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [reservationsRes, statsRes] = await Promise.all([
        supabase
          .from('reservations')
          .select('*, bungalow:bungalows(name), guest:guests(full_name, phone)')
          .in('status', ['confirmed', 'pending'])
          .gte('check_out', today)
          .order('check_in', { ascending: true })
          .limit(5),
        supabase.rpc('get_dashboard_stats', { check_date: today }),
      ]);

      if (reservationsRes.data) {
        setReservations(reservationsRes.data);
      }

      if (statsRes.data) {
        setStats(statsRes.data[0] || stats);
      } else {
        const [activeRes, todayIn, todayOut, guestsCount] = await Promise.all([
          supabase.from('reservations').select('id', { count: 'exact' }).in('status', ['confirmed', 'pending']).gte('check_out', today),
          supabase.from('reservations').select('id', { count: 'exact' }).eq('check_in', today).in('status', ['confirmed', 'pending']),
          supabase.from('reservations').select('id', { count: 'exact' }).eq('check_out', today).in('status', ['confirmed', 'pending']),
          supabase.from('guests').select('id', { count: 'exact' }),
        ]);

        setStats({
          activeReservations: activeRes.count || 0,
          todayCheckIn: todayIn.count || 0,
          todayCheckOut: todayOut.count || 0,
          totalGuests: guestsCount.count || 0,
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Resumen de tu complejo de alojamiento</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-indigo-600">{stats.activeReservations}</div>
          <div className="text-sm text-gray-600">Reservas Activas</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.todayCheckIn}</div>
          <div className="text-sm text-gray-600">Check-in Hoy</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.todayCheckOut}</div>
          <div className="text-sm text-gray-600">Check-out Hoy</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.totalGuests}</div>
          <div className="text-sm text-gray-600">Total Huéspedes</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Próximas Reservas</h3>
            <Link href="/reservations" className="text-sm text-indigo-600 hover:underline">
              Ver todas
            </Link>
          </div>

          {reservations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay reservas próximas</p>
          ) : (
            <div className="space-y-3">
              {reservations.map((res) => (
                <Link
                  key={res.id}
                  href={`/reservations/${res.id}`}
                  className="block p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{res.guest.full_name}</div>
                      <div className="text-sm text-gray-600">{res.bungalow.name}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(res.status)}`}>
                      {getStatusLabel(res.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatDate(res.check_in, { day: 'numeric', month: 'short' })} - {formatDate(res.check_out, { day: 'numeric', month: 'short' })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Acceso Rápido</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/reservations/new"
              className="p-4 border-2 border-dashed border-indigo-200 rounded-lg text-center hover:border-indigo-400 hover:bg-indigo-50"
            >
              <div className="text-2xl mb-1">+</div>
              <div className="text-sm font-medium text-gray-700">Nueva Reserva</div>
            </Link>
            <Link
              href="/calendar"
              className="p-4 border-2 border-dashed border-green-200 rounded-lg text-center hover:border-green-400 hover:bg-green-50"
            >
              <div className="text-2xl mb-1">📅</div>
              <div className="text-sm font-medium text-gray-700">Ver Calendario</div>
            </Link>
            <Link
              href="/guests"
              className="p-4 border-2 border-dashed border-blue-200 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50"
            >
              <div className="text-2xl mb-1">👥</div>
              <div className="text-sm font-medium text-gray-700">Huéspedes</div>
            </Link>
            <Link
              href="/reports"
              className="p-4 border-2 border-dashed border-purple-200 rounded-lg text-center hover:border-purple-400 hover:bg-purple-50"
            >
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-medium text-gray-700">Reportes</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
