'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Guest } from '@/types';
import Loading from '@/components/ui/Loading';

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [feedback, setFeedback] = useState('');
  const supabase = createClient();

  const [formData, setFormData] = useState({
    full_name: '',
    dni: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    loadGuests();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    if (showModal) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [showModal]);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('guests')
        .select('*')
        .order('full_name', { ascending: true });

      if (data) setGuests(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGuest) {
        const { error } = await supabase.from('guests').update(formData).eq('id', editingGuest.id);
        if (error) throw error;
        setGuests(guests.map(g => g.id === editingGuest.id ? { ...g, ...formData } : g));
        setFeedback('Huésped actualizado');
      } else {
        const { data, error } = await supabase.from('guests').insert(formData).select('*').single();
        if (error) throw error;
        if (data) setGuests([...guests, data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        setFeedback('Huésped creado');
      }

      setShowModal(false);
      setEditingGuest(null);
      setFormData({ full_name: '', dni: '', phone: '', email: '', notes: '' });
    } catch (err) {
      console.error('Error:', err);
      setFeedback('Error al guardar');
    }
  };

  const deleteGuest = async (id: string) => {
    if (!confirm('¿Eliminar este huésped?')) return;

    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (!error) {
      setGuests(guests.filter(g => g.id !== id));
      setFeedback('Huésped eliminado');
    }
  };

  const openEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({
      full_name: guest.full_name,
      dni: guest.dni || '',
      phone: guest.phone || '',
      email: guest.email || '',
      notes: guest.notes || '',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingGuest(null);
    setFormData({ full_name: '', dni: '', phone: '', email: '', notes: '' });
    setShowModal(true);
  };

  const filteredGuests = guests.filter(g =>
    g.full_name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search) ||
    g.dni?.includes(search)
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Huéspedes</h2>
          <p className="text-gray-600">{guests.length} huéspedes registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700"
        >
          + Nuevo Huésped
        </button>
      </div>

      {feedback && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md" role="status">
          {feedback}
        </div>
      )}

      <div className="bg-white rounded-lg shadow mb-4 p-4">
        <label htmlFor="search-guests" className="sr-only">Buscar huésped</label>
        <input
          id="search-guests"
          type="text"
          placeholder="Buscar por nombre, teléfono o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-3 border rounded-md"
        />
      </div>

      {loading ? (
        <Loading />
      ) : filteredGuests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay huéspedes</div>
      ) : (
        <div className="grid gap-3">
          {filteredGuests.map((guest) => (
            <div key={guest.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-900">{guest.full_name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    📞 {guest.phone} {guest.dni && `• DNI: ${guest.dni}`}
                  </div>
                  {guest.email && <div className="text-sm text-gray-500">✉️ {guest.email}</div>}
                  {guest.notes && <div className="text-sm text-gray-500 mt-1">📝 {guest.notes}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(guest)} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-sm py-2 px-3 rounded-md">
                    Editar
                  </button>
                  <button onClick={() => deleteGuest(guest.id)} className="text-red-600 bg-red-50 hover:bg-red-100 text-sm py-2 px-3 rounded-md">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={editingGuest ? 'Editar huésped' : 'Nuevo huésped'}
        >
            <div
            className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              {editingGuest ? 'Editar Huésped' : 'Nuevo Huésped'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="modal-name" className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  id="modal-name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-dni" className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input
                    id="modal-dni"
                    type="text"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    className="w-full px-3 py-3 border rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="modal-phone" className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                  <input
                    id="modal-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-3 border rounded-md"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="modal-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                />
              </div>
              <div>
                <label htmlFor="modal-notes" className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  id="modal-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-3 border rounded-md"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700">
                  {editingGuest ? 'Guardar' : 'Crear'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-3 border rounded-md hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
