'use client';

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import Loading from '@/components/ui/Loading';
import { getStatusColor, getStatusLabel } from '@/lib/format';

interface Bungalow {
  id: string;
  name: string;
}

interface Reservation {
  id: string;
  bungalow_id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest: { full_name: string };
}

function CalendarContent() {
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBungalow, setSelectedBungalow] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [currentDate]);

  useEffect(() => {
    if (bungalows.length > 0 && !selectedBungalow) {
      setSelectedBungalow(bungalows[0].id);
    }
  }, [bungalows]);

  const loadData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const [bungalowsRes, reservationsRes] = await Promise.all([
        supabase.from('bungalows').select('*').eq('is_active', true).order('name'),
        supabase
          .from('reservations')
          .select('id, bungalow_id, check_in, check_out, status, guest:guests(full_name)')
          .in('status', ['confirmed', 'pending'])
          .or(`check_in.lte.${endDate},check_out.gt.${startDate}`),
      ]);

      if (bungalowsRes.data) setBungalows(bungalowsRes.data);
      if (reservationsRes.data) setReservations(reservationsRes.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getDayColor = (dayReservations: Reservation[], date: Date) => {
    if (dayReservations.length === 0) return 'bg-green-50 hover:bg-green-100';

    const today = new Date().toISOString().split('T')[0];
    const dateStr = date.toISOString().split('T')[0];

    if (dayReservations.some(r => r.check_out === dateStr)) {
      return 'bg-orange-50 hover:bg-orange-100';
    }
    if (dateStr < today) {
      return 'bg-gray-50';
    }
    return 'bg-red-50 hover:bg-red-100';
  };

  const getStatusBadge = (dayReservations: Reservation[], dateStr: string) => {
    if (dayReservations.length === 0) return { label: 'Libre', color: 'bg-green-100 text-green-700' };
    if (dayReservations.some(r => r.check_out === dateStr)) return { label: 'Checkout', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Ocupado', color: 'bg-red-100 text-red-700' };
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const days = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const activeBungalow = bungalows.find(b => b.id === selectedBungalow) || bungalows[0];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendario</h2>
          <p className="text-gray-600">Disponibilidad de bungalows</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-3 border rounded-md hover:bg-gray-50 active:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Mes anterior"
          >
            ←
          </button>
          <span className="font-semibold min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-3 border rounded-md hover:bg-gray-50 active:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-2 mb-4">
        <div className="flex gap-3 text-sm" role="list" aria-label="Leyenda de colores">
          <span className="flex items-center gap-1" role="listitem"><span className="w-3 h-3 bg-green-100 rounded" aria-hidden="true"></span> Libre</span>
          <span className="flex items-center gap-1" role="listitem"><span className="w-3 h-3 bg-red-100 rounded" aria-hidden="true"></span> Ocupado</span>
          <span className="flex items-center gap-1" role="listitem"><span className="w-3 h-3 bg-orange-100 rounded" aria-hidden="true"></span> Checkout</span>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          {/* Mobile: selector de bungalow + lista vertical */}
          <div className="sm:hidden">
            {bungalows.length > 0 && (
              <>
                <div className="flex overflow-x-auto scrollbar-hide gap-2 mb-4">
                  {bungalows.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBungalow(b.id)}
                      className={`px-4 py-2.5 rounded-md text-sm whitespace-nowrap min-h-[44px] ${
                        selectedBungalow === b.id
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'bg-white text-gray-600 border hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>

                {activeBungalow && (
                  <div className="space-y-2">
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayDate = new Date(year, month, day);
                      const dayOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayDate.getDay()];

                      const dayRes = reservations.filter(r =>
                        r.bungalow_id === activeBungalow.id &&
                        r.check_in <= dateStr &&
                        r.check_out > dateStr
                      );

                      const badge = getStatusBadge(dayRes, dateStr);
                      const isToday = dateStr === todayStr;
                      const isPast = dateStr < todayStr;

                      const content = (
                        <div
                          className={`bg-white rounded-lg shadow p-3 flex items-center justify-between min-h-[56px] ${
                            isToday ? 'ring-2 ring-indigo-400' : ''
                          } ${isPast && dayRes.length === 0 ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-center min-w-[40px]">
                              <div className="text-lg font-bold text-gray-900">{day}</div>
                              <div className="text-xs text-gray-500">{dayOfWeek}</div>
                            </div>
                            <div>
                              <span className={`text-xs px-2 py-0.5 rounded ${badge.color}`}>
                                {badge.label}
                              </span>
                              {dayRes.length > 0 && (
                                <div className="text-sm text-gray-700 mt-1 font-medium">
                                  {dayRes[0].guest.full_name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-400">→</div>
                        </div>
                      );

                      return (
                        <Link
                          key={day}
                          href={dayRes.length > 0
                            ? `/reservations/${dayRes[0].id}`
                            : `/reservations/new?bungalow=${activeBungalow.id}&date=${dateStr}`
                          }
                          className="block"
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Desktop: grilla de 4 bungalows */}
          <div className="hidden sm:block space-y-4">
            {bungalows.map((bungalow) => {
              const bungalowReservations = reservations.filter(r => r.bungalow_id === bungalow.id);

              return (
                <div key={bungalow.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-indigo-600 text-white px-4 py-2 font-semibold">
                    {bungalow.name}
                  </div>
                  <div className="grid grid-cols-7 gap-1 p-2">
                    {dayNames.map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                        {day}
                      </div>
                    ))}
                    {days.map((day, idx) => {
                      if (!day) {
                        return <div key={idx} className="h-12"></div>;
                      }

                      const dateStr = day.toISOString().split('T')[0];
                      const bungalowResForDay = bungalowReservations.filter(r =>
                        r.check_in <= dateStr && r.check_out > dateStr
                      );

                      return (
                        <Link
                          key={idx}
                          href={bungalowResForDay.length > 0
                            ? `/reservations/${bungalowResForDay[0].id}`
                            : `/reservations/new?bungalow=${bungalow.id}&date=${dateStr}`
                          }
                          className={`h-12 flex flex-col items-center justify-center text-sm rounded ${getDayColor(bungalowResForDay, day)} border`}
                          aria-label={`${day.getDate()} de ${monthNames[month]}${bungalowResForDay.length > 0 ? `, ${bungalowResForDay[0].guest.full_name}` : ', libre'}`}
                        >
                          <span className="font-medium">{day.getDate()}</span>
                          {bungalowResForDay.length > 0 && (
                            <span className="text-xs truncate w-full text-center">
                              {bungalowResForDay[0].guest.full_name.split(' ')[0]}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CalendarContent />
    </Suspense>
  );
}
