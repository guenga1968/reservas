'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { formatDate, formatPrice, getStatusColor, getStatusLabel } from '@/lib/format';
import { Reservation } from '@/types';
import Loading from '@/components/ui/Loading';

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    loadReservations();
  }, [filter]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reservations')
        .select('*, bungalow:bungalows(name), guest:guests(full_name, phone)')
        .order('check_in', { ascending: false });

      if (filter === 'active') {
        query = query.in('status', ['confirmed', 'pending']).gte('check_out', new Date().toISOString().split('T')[0]);
      } else if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      if (data) setReservations(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (id: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (!error) {
      setReservations(reservations.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
    }
  };

  const deleteReservation = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta reserva permanentemente?')) return;

    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (!error) {
      setReservations(reservations.filter(r => r.id !== id));
    }
  };

  const isActive = (status: string) => status === 'pending' || status === 'confirmed';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reservas</h2>
          <p className="text-gray-600">Gestiona todas las reservas</p>
        </div>
        <Link
          href="/reservations/new"
          className="bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700 text-center"
        >
          + Nueva Reserva
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow mb-4 overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide gap-2 p-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-2 rounded-md text-sm whitespace-nowrap min-h-[44px] ${
                filter === opt.value
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : reservations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay reservas</div>
      ) : (
        <div className="space-y-3">
          {reservations.map((res) => (
            <div key={res.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{res.guest.full_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(res.status)}`}>
                      {getStatusLabel(res.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    📍 {res.bungalow.name} • 👥 {res.guests_count} • 📞 {res.guest.phone}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    📅 {formatDate(res.check_in)} - {formatDate(res.check_out)}
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="font-bold text-green-600">{formatPrice(res.total_price)}</div>
                  <div className="flex gap-2 mt-2">
                    <Link
                      href={`/reservations/${res.id}`}
                      className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-sm py-2 px-3 rounded-md"
                    >
                      Ver
                    </Link>
                    {isActive(res.status) ? (
                      <button
                        onClick={() => cancelReservation(res.id)}
                        className="text-red-600 bg-red-50 hover:bg-red-100 text-sm py-2 px-3 rounded-md"
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button
                        onClick={() => deleteReservation(res.id)}
                        className="text-red-600 bg-red-50 hover:bg-red-100 text-sm py-2 px-3 rounded-md"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
