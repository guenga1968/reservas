'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { formatDate, formatPrice, getStatusColor, getStatusLabel } from '@/lib/format';
import { Reservation } from '@/types';
import Loading from '@/components/ui/Loading';

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    status: '',
    total_price: '',
    guests_count: 1,
    check_in_time: '11:30',
    check_out_time: '10:00',
  });

  useEffect(() => {
    loadReservation();
  }, [params.id]);

  const loadReservation = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, bungalow:bungalows(id, name), guest:guests(*)')
        .eq('id', params.id)
        .single();

      if (error) throw error;

      if (data) {
        setReservation(data);
        setFormData({
          status: data.status,
          total_price: data.total_price.toString(),
          guests_count: data.guests_count,
          check_in_time: data.check_in_time || '11:30',
          check_out_time: data.check_out_time || '10:00',
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const price = parseFloat(formData.total_price);
      if (isNaN(price) || price < 0) {
        setError('El precio debe ser un número positivo');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('reservations')
        .update({
          status: formData.status,
          total_price: price,
          guests_count: formData.guests_count,
          check_in_time: formData.check_in_time,
          check_out_time: formData.check_out_time,
        })
        .eq('id', params.id);

      if (error) throw error;

      setReservation({
        ...reservation!,
        ...formData,
        total_price: price,
      });
      setEditMode(false);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al actualizar la reserva');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', params.id);

      if (error) throw error;
      setReservation({ ...reservation!, status: 'cancelled' });
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cancelar la reserva');
    } finally {
      setSaving(false);
    }
  };

  const generateWhatsAppMessage = () => {
    if (!reservation) return;

    const checkInTime = reservation.check_in_time || '11:30';
    const checkOutTime = reservation.check_out_time || '10:00';

    const message = `Hola ${reservation.guest.full_name}! Tu reserva está confirmada:

🏠 Alojamiento: ${reservation.bungalow.name}
📅 Check-in: ${reservation.check_in} a las ${checkInTime} hs
📅 Check-out: ${reservation.check_out} a las ${checkOutTime} hs
👥 Huéspedes: ${reservation.guests_count}
💰 Total: $${reservation.total_price}

¡Te esperamos! 📍`;

    navigator.clipboard.writeText(message);
    alert('Mensaje copiado al portapapeles');
  };

  if (loading) {
    return <Loading />;
  }

  if (!reservation) {
    return <div className="text-center py-8 text-gray-600">Reserva no encontrada</div>;
  }

  const isActive = reservation.status === 'pending' || reservation.status === 'confirmed';
  const checkInTime = reservation.check_in_time || '11:30';
  const checkOutTime = reservation.check_out_time || '10:00';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 py-2 px-1 -ml-1 self-start">
          ← Volver
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Detalle de Reserva</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-gray-900">Huésped</h3>
            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(reservation.status)}`}>
              {getStatusLabel(reservation.status)}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>Nombre:</strong> {reservation.guest.full_name}</p>
            <p><strong>DNI:</strong> {reservation.guest.dni || 'No registrado'}</p>
            <p><strong>Teléfono:</strong> {reservation.guest.phone}</p>
            <p><strong>Email:</strong> {reservation.guest.email || 'No registrado'}</p>
            {reservation.guest.notes && (
              <p><strong>Notas:</strong> {reservation.guest.notes}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Datos de la Reserva</h3>

          {editMode ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  id="edit-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                >
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-check-in-time" className="block text-sm font-medium text-gray-700 mb-1">Hora Check-in</label>
                  <input
                    id="edit-check-in-time"
                    type="time"
                    value={formData.check_in_time}
                    onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                    className="w-full px-3 py-3 border rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="edit-check-out-time" className="block text-sm font-medium text-gray-700 mb-1">Hora Check-out</label>
                  <input
                    id="edit-check-out-time"
                    type="time"
                    value={formData.check_out_time}
                    onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                    className="w-full px-3 py-3 border rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-guests" className="block text-sm font-medium text-gray-700 mb-1">Huéspedes</label>
                  <select
                    id="edit-guests"
                    value={formData.guests_count}
                    onChange={(e) => setFormData({ ...formData, guests_count: parseInt(e.target.value) })}
                    className="w-full px-3 py-3 border rounded-md"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n}{n > 4 ? ' (+cama extra)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-1">Total (ARS)</label>
                  <input
                    id="edit-price"
                    type="number"
                    value={formData.total_price}
                    onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                    className="w-full px-3 py-3 border rounded-md"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditMode(false); setError(''); }}
                  className="px-4 py-3 border rounded-md hover:bg-gray-50"
                >
                  Cancelar Edición
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <p><strong>Bungalow:</strong> {reservation.bungalow.name}</p>
              <p><strong>Check-in:</strong> {formatDate(reservation.check_in, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} a las {checkInTime} hs</p>
              <p><strong>Check-out:</strong> {formatDate(reservation.check_out, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} a las {checkOutTime} hs</p>
              <p><strong>Huéspedes:</strong> {reservation.guests_count}</p>
              <p><strong>Total:</strong> {formatPrice(reservation.total_price)}</p>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-3 border rounded-md hover:bg-gray-50"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={generateWhatsAppMessage}
                  className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  📱 WhatsApp
                </button>
                {isActive && (
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    ✕ Cancelar Reserva
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
