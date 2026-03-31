'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Loading from '@/components/ui/Loading';

interface Bungalow {
  id: string;
  name: string;
}

interface Guest {
  id: string;
  full_name: string;
  phone: string;
}

interface OverlapInfo {
  check_out_time: string;
  guest_name: string;
}

function NewReservationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overlapInfo, setOverlapInfo] = useState<OverlapInfo | null>(null);

  const [existingGuestId, setExistingGuestId] = useState('');
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [guestData, setGuestData] = useState({
    full_name: '',
    dni: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [reservationData, setReservationData] = useState({
    bungalow_id: searchParams.get('bungalow') || '',
    check_in: searchParams.get('date') || '',
    check_out: '',
    check_in_time: '11:30',
    check_out_time: '10:00',
    guests_count: 1,
    total_price: '',
    status: 'confirmed',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    checkOverlap();
  }, [reservationData.bungalow_id, reservationData.check_in]);

  const loadData = async () => {
    try {
      const [bungalowsRes, guestsRes] = await Promise.all([
        supabase.from('bungalows').select('*').eq('is_active', true).order('name'),
        supabase.from('guests').select('id, full_name, phone').order('full_name'),
      ]);

      if (bungalowsRes.data) setBungalows(bungalowsRes.data);
      if (guestsRes.data) setGuests(guestsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkOverlap = async () => {
    if (!reservationData.bungalow_id || !reservationData.check_in) {
      setOverlapInfo(null);
      return;
    }

    try {
      const { data } = await supabase
        .from('reservations')
        .select('check_out_time, guest:guests(full_name)')
        .eq('bungalow_id', reservationData.bungalow_id)
        .eq('check_out', reservationData.check_in)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (data) {
        const outTime = data.check_out_time || '10:00';
        const guestName = (data.guest as unknown as { full_name: string }).full_name;
        setOverlapInfo({
          check_out_time: outTime,
          guest_name: guestName,
        });
        setReservationData(prev => ({
          ...prev,
          check_in_time: prev.check_in_time < outTime ? outTime : prev.check_in_time,
        }));
      } else {
        setOverlapInfo(null);
      }
    } catch {
      setOverlapInfo(null);
    }
  };

  const checkAvailability = async () => {
    if (!reservationData.bungalow_id || !reservationData.check_in || !reservationData.check_out) {
      return true;
    }

    const { data, error } = await supabase.rpc('check_availability', {
      p_bungalow_id: reservationData.bungalow_id,
      p_check_in: reservationData.check_in,
      p_check_out: reservationData.check_out,
    });

    if (error) {
      console.error('Error checking availability:', error);
      return true;
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (reservationData.check_out && reservationData.check_in) {
      if (reservationData.check_out <= reservationData.check_in) {
        setError('La fecha de check-out debe ser posterior a la fecha de check-in');
        return;
      }
    }

    if (overlapInfo && reservationData.check_in_time < overlapInfo.check_out_time) {
      setError(`La hora de check-in debe ser posterior a ${overlapInfo.check_out_time} hs (salida del huésped anterior)`);
      return;
    }

    const price = parseFloat(reservationData.total_price);
    if (isNaN(price) || price < 0) {
      setError('El precio debe ser un número positivo');
      return;
    }

    setSaving(true);

    try {
      const isAvailable = await checkAvailability();
      if (!isAvailable) {
        setError('El bungalow no está disponible en las fechas seleccionadas');
        setSaving(false);
        return;
      }

      let guestId = existingGuestId;

      if (!guestId && isNewGuest) {
        const { data: guestDataResult, error: guestError } = await supabase
          .from('guests')
          .insert({
            full_name: guestData.full_name,
            dni: guestData.dni || null,
            phone: guestData.phone || null,
            email: guestData.email || null,
            notes: guestData.notes || null,
          })
          .select('id')
          .single();

        if (guestError) throw guestError;
        guestId = guestDataResult.id;
      }

      if (!guestId) {
        setError('Por favor selecciona o crea un huésped');
        setSaving(false);
        return;
      }

      const { error: reservationError } = await supabase
        .from('reservations')
        .insert({
          guest_id: guestId,
          bungalow_id: reservationData.bungalow_id,
          check_in: reservationData.check_in,
          check_out: reservationData.check_out,
          check_in_time: reservationData.check_in_time,
          check_out_time: reservationData.check_out_time,
          guests_count: reservationData.guests_count,
          total_price: price,
          status: reservationData.status,
        });

      if (reservationError) throw reservationError;

      router.push('/reservations');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la reserva';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const generateWhatsAppMessage = () => {
    const bungalow = bungalows.find(b => b.id === reservationData.bungalow_id);
    const guest = isNewGuest ? guestData.full_name : guests.find(g => g.id === existingGuestId)?.full_name;

    if (!bungalow || !guest || !reservationData.check_in || !reservationData.check_out) {
      alert('Completa los datos de la reserva primero');
      return;
    }

    const message = `Hola ${guest}! Tu reserva está confirmada:

🏠 Alojamiento: ${bungalow.name}
📅 Check-in: ${reservationData.check_in} a las ${reservationData.check_in_time} hs
📅 Check-out: ${reservationData.check_out} a las ${reservationData.check_out_time} hs
👥 Huéspedes: ${reservationData.guests_count}
💰 Total: $${reservationData.total_price}

¡Te esperamos! 📍`;

    navigator.clipboard.writeText(message);
    alert('Mensaje copiado al portapapeles. Pégalo en WhatsApp para enviar.');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Nueva Reserva</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Datos del Huésped</h3>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isNewGuest}
                onChange={(e) => setIsNewGuest(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Nuevo huésped</span>
            </label>
          </div>

          {isNewGuest ? (
            <div className="grid gap-4">
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  id="guest-name"
                  type="text"
                  value={guestData.full_name}
                  onChange={(e) => setGuestData({ ...guestData, full_name: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="guest-dni" className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input
                    id="guest-dni"
                    type="text"
                    value={guestData.dni}
                    onChange={(e) => setGuestData({ ...guestData, dni: e.target.value })}
                    className="w-full px-3 py-3 border rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                  <input
                    id="guest-phone"
                    type="tel"
                    value={guestData.phone}
                    onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                    className="w-full px-3 py-3 border rounded-md"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="guest-email"
                  type="email"
                  value={guestData.email}
                  onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                />
              </div>
              <div>
                <label htmlFor="guest-notes" className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  id="guest-notes"
                  value={guestData.notes}
                  onChange={(e) => setGuestData({ ...guestData, notes: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="existing-guest" className="block text-sm font-medium text-gray-700 mb-1">
                Seleccionar huésped *
              </label>
              <select
                id="existing-guest"
                value={existingGuestId}
                onChange={(e) => setExistingGuestId(e.target.value)}
                className="w-full px-3 py-3 border rounded-md"
                required
              >
                <option value="">Seleccionar...</option>
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.full_name} {g.phone ? `(${g.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Datos de la Reserva</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="bungalow" className="block text-sm font-medium text-gray-700 mb-1">
                Bungalow *
              </label>
              <select
                id="bungalow"
                value={reservationData.bungalow_id}
                onChange={(e) => setReservationData({ ...reservationData, bungalow_id: e.target.value })}
                className="w-full px-3 py-3 border rounded-md"
                required
              >
                <option value="">Seleccionar...</option>
                {bungalows.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {overlapInfo && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                <strong>⚠️ Traslape detectado:</strong> El huésped anterior ({overlapInfo.guest_name}) se retira a las <strong>{overlapInfo.check_out_time} hs</strong>. Hora mínima de check-in: {overlapInfo.check_out_time} hs.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="check-in" className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in *
                </label>
                <input
                  id="check-in"
                  type="date"
                  value={reservationData.check_in}
                  onChange={(e) => setReservationData({ ...reservationData, check_in: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="check-in-time" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora Check-in
                </label>
                <input
                  id="check-in-time"
                  type="time"
                  value={reservationData.check_in_time}
                  onChange={(e) => setReservationData({ ...reservationData, check_in_time: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                  min={overlapInfo?.check_out_time || '00:00'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="check-out" className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out *
                </label>
                <input
                  id="check-out"
                  type="date"
                  value={reservationData.check_out}
                  onChange={(e) => setReservationData({ ...reservationData, check_out: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="check-out-time" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora Check-out
                </label>
                <input
                  id="check-out-time"
                  type="time"
                  value={reservationData.check_out_time}
                  onChange={(e) => setReservationData({ ...reservationData, check_out_time: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="guests-count" className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad de huéspedes *
                </label>
                <select
                  id="guests-count"
                  value={reservationData.guests_count}
                  onChange={(e) => setReservationData({ ...reservationData, guests_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-3 border rounded-md"
                  required
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'persona' : 'personas'}
                      {n > 4 ? ' (+cama extra)' : ''}
                    </option>
                  ))}
                </select>
                {reservationData.guests_count > 4 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Recordar agregar cama extra. Anotar en notas de la reserva.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="total-price" className="block text-sm font-medium text-gray-700 mb-1">
                  Total (ARS) *
                </label>
                <input
                  id="total-price"
                  type="number"
                  value={reservationData.total_price}
                  onChange={(e) => setReservationData({ ...reservationData, total_price: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                id="status"
                value={reservationData.status}
                onChange={(e) => setReservationData({ ...reservationData, status: e.target.value })}
                className="w-full px-3 py-3 border rounded-md"
                required
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Reserva'}
          </button>

          <button
            type="button"
            onClick={generateWhatsAppMessage}
            className="bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 whitespace-nowrap"
          >
            📱 WhatsApp
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewReservationPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewReservationForm />
    </Suspense>
  );
}
