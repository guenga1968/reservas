-- ============================================
-- ESTRUCTURA DE BASE DE DATOS
-- Gestor de Alojamiento Temporario
-- ============================================

-- Tabla de bungalows
CREATE TABLE bungalows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de huéspedes
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  dni VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de reservas
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  bungalow_id UUID NOT NULL REFERENCES bungalows(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  check_in_time TIME DEFAULT '11:30',
  check_out_time TIME DEFAULT '10:00',
  guests_count INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

CREATE INDEX idx_reservations_bungalow_dates ON reservations(bungalow_id, check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_check_in ON reservations(check_in);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_guests_dni ON guests(dni);

-- ============================================
-- DATOS INICIALES: 4 BUNGALOWS
-- ============================================

INSERT INTO bungalows (name, capacity, description) VALUES
  ('Bungalow 1', 4, 'Cama matrimonial + 2 individuales'),
  ('Bungalow 2', 4, 'Cama matrimonial + 2 individuales'),
  ('Bungalow 3', 4, 'Cama matrimonial + 2 individuales'),
  ('Bungalow 4', 4, 'Cama matrimonial + 2 individuales');

-- ============================================
-- FUNCIÓN: VERIFICAR DISPONIBILIDAD
-- ============================================

CREATE OR REPLACE FUNCTION check_availability(
  p_bungalow_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  available BOOLEAN;
BEGIN
  -- Verificar que check_out sea posterior a check_in
  IF p_check_out <= p_check_in THEN
    RETURN FALSE;
  END IF;

  -- Verificar si hay reservas que se solapen
  SELECT COUNT(*) = 0 INTO available
  FROM reservations
  WHERE bungalow_id = p_bungalow_id
    AND status NOT IN ('cancelled')
    AND (
      (check_in <= p_check_in AND check_out > p_check_in)
      OR (check_in < p_check_out AND check_out >= p_check_out)
      OR (check_in >= p_check_in AND check_out <= p_check_out)
    );

  RETURN COALESCE(available, TRUE);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: OBTENER ESTADÍSTICAS DE OCUPACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION get_occupancy_stats(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  bungalow_id UUID,
  bungalow_name VARCHAR(50),
  total_days INTEGER,
  occupied_days INTEGER,
  occupancy_rate DECIMAL(5, 2)
) AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_total_days INTEGER;
BEGIN
  v_month_start := MAKE_DATE(p_year, p_month, 1);
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
  v_total_days := EXTRACT(DAY FROM v_month_end);

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    v_total_days,
    COALESCE(
      (SELECT SUM(
        LEAST(r.check_out, v_month_end + 1) - GREATEST(r.check_in, v_month_start)
      )::INTEGER
       FROM reservations r
       WHERE r.bungalow_id = b.id
         AND r.status NOT IN ('cancelled')
         AND r.check_in < v_month_end + 1
         AND r.check_out > v_month_start
      ), 0
    ) AS occupied_days,
    CASE 
      WHEN v_total_days > 0 THEN 
        ROUND((COALESCE(
          (SELECT SUM(LEAST(r.check_out, v_month_end + 1) - GREATEST(r.check_in, v_month_start))::DECIMAL 
           FROM reservations r 
           WHERE r.bungalow_id = b.id 
             AND r.status NOT IN ('cancelled') 
             AND r.check_in < v_month_end + 1 
             AND r.check_out > v_month_start
          ), 0) / v_total_days) * 100, 2)
      ELSE 0.00 
    END AS occupancy_rate
  FROM bungalows b
  WHERE b.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEGURIDAD: RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE bungalows ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Policy para bungalows (lectura pública, escritura solo auth)
CREATE POLICY "Allow read bungalows" ON bungalows FOR SELECT USING (true);
CREATE POLICY "Allow all bungalows" ON bungalows FOR ALL USING (auth.role() = 'authenticated');

-- Policy para guests
CREATE POLICY "Allow read guests" ON guests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all guests" ON guests FOR ALL USING (auth.role() = 'authenticated');

-- Policy para reservations
CREATE POLICY "Allow read reservations" ON reservations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all reservations" ON reservations FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- FUNCIÓN: ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCIÓN: DASHBOARD STATS
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(check_date DATE)
RETURNS TABLE (
  active_reservations INTEGER,
  today_check_in INTEGER,
  today_check_out INTEGER,
  total_guests INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM reservations WHERE status IN ('confirmed', 'pending') AND check_out > check_date)::INTEGER,
    (SELECT COUNT(*)::INTEGER FROM reservations WHERE check_in = check_date AND status IN ('confirmed', 'pending'))::INTEGER,
    (SELECT COUNT(*)::INTEGER FROM reservations WHERE check_out = check_date AND status IN ('confirmed', 'pending'))::INTEGER,
    (SELECT COUNT(*)::INTEGER FROM guests)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CONFIGURACIÓN DE AUTENTICACIÓN
-- ============================================

-- Habilitar autenticación por email/password (ya viene por defecto)
-- El usuario se crea desde la UI de Supabase o mediante invite
