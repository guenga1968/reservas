'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';

interface MonthlyStats {
  month: number;
  year: number;
  totalReservations: number;
  totalIncome: number;
  totalGuests: number;
}

interface BungalowStats {
  bungalow_name: string;
  reservation_count: number;
  total_income: number;
}

interface ReservationRow {
  check_in: string;
  total_price: number | null;
  guests_count: number | null;
  status: string;
  bungalow_id: string;
}

interface BungalowRow {
  id: string;
  name: string;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const BUNGALOW_COUNT = 4;

export default function ReportsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [bungalowStats, setBungalowStats] = useState<BungalowStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const supabase = createClient();

  useEffect(() => {
    loadStats();
  }, [selectedYear]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const [reservationsRes, bungalowsRes] = await Promise.all([
        supabase
          .from('reservations')
          .select('check_in, total_price, guests_count, status, bungalow_id')
          .in('status', ['confirmed', 'completed'])
          .gte('check_in', startDate)
          .lte('check_in', endDate),
        supabase
          .from('bungalows')
          .select('id, name')
          .eq('is_active', true),
      ]);

      const reservations = (reservationsRes.data || []) as ReservationRow[];
      const bungalowsData = (bungalowsRes.data || []) as BungalowRow[];

      const months: MonthlyStats[] = [];
      for (let m = 1; m <= 12; m++) {
        const monthRes = reservations.filter(r => {
          const month = new Date(r.check_in).getMonth() + 1;
          return month === m;
        });

        months.push({
          month: m,
          year: selectedYear,
          totalReservations: monthRes.length,
          totalIncome: monthRes.reduce((sum, r) => sum + (r.total_price || 0), 0),
          totalGuests: monthRes.reduce((sum, r) => sum + (r.guests_count || 0), 0),
        });
      }
      setMonthlyStats(months);

      const bungalowMap = new Map<string, BungalowStats>();
      bungalowsData.forEach((b: BungalowRow) => {
        bungalowMap.set(b.id, { bungalow_name: b.name, reservation_count: 0, total_income: 0 });
      });

      reservations.forEach(r => {
        const stats = bungalowMap.get(r.bungalow_id);
        if (stats) {
          stats.reservation_count++;
          stats.total_income += r.total_price || 0;
        }
      });

      setBungalowStats(Array.from(bungalowMap.values()).sort((a, b) => b.reservation_count - a.reservation_count));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalYearIncome = monthlyStats.reduce((sum, m) => sum + m.totalIncome, 0);
  const totalYearReservations = monthlyStats.reduce((sum, m) => sum + m.totalReservations, 0);
  const avgOccupancy = ((totalYearReservations / (12 * BUNGALOW_COUNT)) * 100).toFixed(1);
  const maxIncome = Math.max(...monthlyStats.map(m => m.totalIncome), 1);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
          <p className="text-gray-600">Estadísticas del complejo</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-3 border rounded-md"
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Ingresos del Año</div>
          <div className="text-2xl font-bold text-green-600">{formatPrice(totalYearIncome)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Reservas del Año</div>
          <div className="text-2xl font-bold text-indigo-600">{totalYearReservations}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Ocupación Promedio</div>
          <div className="text-2xl font-bold text-blue-600">{avgOccupancy}%</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Ingresos por Mes</h3>
        <div className="flex items-end gap-1 h-40">
          {monthlyStats.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center min-w-0">
              <div
                className="w-full bg-indigo-500 rounded-t active:bg-indigo-700"
                style={{ height: `${(m.totalIncome / maxIncome) * 100}%` }}
              ></div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate w-full text-center">{MONTH_NAMES[m.month - 1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Bungalows más Solicitados</h3>
          <div className="space-y-3">
            {bungalowStats.map((b, idx) => (
              <div key={b.bungalow_name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-medium">
                    {idx + 1}
                  </span>
                  <span>{b.bungalow_name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{b.reservation_count} reservas</div>
                  <div className="text-sm text-gray-500">{formatPrice(b.total_income)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Detalle Mensual</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Mes</th>
                  <th className="text-right py-2">Reservas</th>
                  <th className="text-right py-2">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((m) => (
                  <tr key={m.month} className="border-b">
                    <td className="py-2">{MONTH_NAMES[m.month - 1]}</td>
                    <td className="text-right">{m.totalReservations}</td>
                    <td className="text-right font-medium">{formatPrice(m.totalIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
