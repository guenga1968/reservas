# Gestor de Turnos - Alojamiento Temporario

Web app para gestionar reservas de un complejo de 4 bungalows.

## Características

- ✅ Autenticación de administrador
- ✅ Gestión de reservas (crear, editar, eliminar)
- ✅ Calendario de disponibilidad
- ✅ Historial de huéspedes
- ✅ Botón para copiar mensaje de WhatsApp
- ✅ Reportes y estadísticas
- ✅ Diseño responsive (móvil-first)

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + Database)
- **Hosting**: Vercel

## Configuración

### 1. Crear proyecto Supabase

1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el script en `supabase/schema.sql`
4. Ve a **Settings > API** y copia:
   - Project URL
   - `service_role` key (para crear usuario admin)

### 2. Configurar variables de entorno

Copia el archivo `.env.local.example` a `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=tu_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### 3. Crear usuario administrador

En Supabase, ve a **Authentication > Users** y crea un usuario con email y contraseña.

### 4. Ejecutar localmente

```bash
npm run dev
```

La app estará en `http://localhost:3000`

## Estructura del Proyecto

```
src/
├── app/
│   ├── (auth)/login/       # Página de login
│   ├── (dashboard)/        # Dashboard protegido
│   │   ├── dashboard/      # Página principal
│   │   ├── reservations/   # Gestión de reservas
│   │   ├── guests/        # Historial de huéspedes
│   │   ├── calendar/      # Calendario
│   │   └── reports/       # Reportes
│   ├── layout.tsx
│   └── page.tsx
├── contexts/
│   └── AuthContext.tsx     # Auth provider
└── lib/
    └── supabase.ts        # Cliente Supabase
```

## Deploy a Vercel

1. Sube el código a GitHub
2. Ve a [vercel.com](https://vercel.com) e importa el repositorio
3. Configura las variables de entorno en Vercel
4. Deploy automático

## Uso

1. El administrador recibe llamada preguntando por disponibilidad
2. Abre la app desde el celular
3. Consulta el calendario para ver bungalows libres
4. Crea la reserva con datos del huésped y precio
5. Toca "Copiar WhatsApp" y pega el mensaje para enviar

## Horarios

- Check-in: 11:30 hs
- Check-out: 10:00 hs

## Licencia

MIT
