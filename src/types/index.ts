export interface Guest {
  id: string;
  full_name: string;
  dni: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
}

export interface Bungalow {
  id: string;
  name: string;
  is_active?: boolean;
}

export interface Reservation {
  id: string;
  check_in: string;
  check_out: string;
  check_in_time: string;
  check_out_time: string;
  guests_count: number;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  bungalow_id: string;
  bungalow: { id: string; name: string };
  guest: Guest;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Stats {
  activeReservations: number;
  todayCheckIn: number;
  todayCheckOut: number;
  totalGuests: number;
}
