# 🚗 El Bien Amado Rent A Car — Catálogo

Catálogo web de vehículos de alquiler para **El Bien Amado Rent A Car**, con panel de administración para gestionar la flota. Los clientes consultan los vehículos disponibles, filtran y ordenan, y reservan directamente por **WhatsApp**.

## ✨ Funcionalidades

**Sitio público**
- Catálogo de vehículos con precio por día, año, color, tipo de seguro y disponibilidad.
- Búsqueda, filtros y ordenamiento (más recientes, precio, año, marca).
- Página de detalle por vehículo con galería de fotos.
- Botón de contacto por WhatsApp con mensaje prellenado según el vehículo.

**Panel de administración** (`/admin`)
- Inicio de sesión protegido con cookie firmada (HMAC, `httpOnly`, duración de 8 h).
- Crear, editar y eliminar vehículos.
- Subida de hasta 8 fotos por vehículo a Cloudinary mediante firma en servidor.
- Registro de mantenimiento por vehículo, gastos en DOP, categorías e historial de kilometraje.
- Edición de registros de mantenimiento existentes.
- Gastos recurrentes mensuales y anuales por vehículo, con cálculo automático de próxima fecha.
- Orden de fotografías de portada hacia atrás y consulta de los últimos cinco mantenimientos desde la edición del vehículo.
- Resumen de mantenimiento histórico, proyección anual de gastos recurrentes y kilometraje más reciente.

## 🛠️ Tecnologías

| Área | Herramienta |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4, lucide-react |
| Base de datos | PostgreSQL (`pg`) |
| Imágenes | Cloudinary (`next-cloudinary`) |

## 📋 Requisitos

- Node.js 20 o superior
- Una base de datos PostgreSQL
- Una cuenta de Cloudinary

## 🚀 Instalación

```bash
git clone https://github.com/DannyG09/el-bien-amado-catalogo.git
cd el-bien-amado-catalogo
npm install
```

### Variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
DATABASE_URL=postgresql://usuario:contraseña@host:5432/basedatos

ADMIN_USER=tu_usuario_admin
ADMIN_PASSWORD=tu_contraseña_admin
ADMIN_SESSION_SECRET=cadena_aleatoria_de_al_menos_32_caracteres

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

> Genera el secreto de sesión con: `openssl rand -base64 48`

### Base de datos

La app espera estas tablas (nombres de columnas según las consultas del código; ajusta los tipos a tu caso):

- **`vehiculos`**: `id`, `marca`, `modelo`, `anio`, `placa`, `color`, `tiposeguro`, `preciodia`, `imagen`, `descripcion`, `disponible`
- **`vehiculo_fotos`**: fotos asociadas a cada vehículo (relación con `vehiculos.id`)
- **`mantenimientos`**: registros de gasto y kilometraje, asociados a `vehiculos.id`.

Antes de usar el apartado de mantenimiento, ejecuta en la base de datos el script
[`database/migrations/001_mantenimientos.sql`](./database/migrations/001_mantenimientos.sql).
Después, ejecuta [`database/migrations/002_gastos_recurrentes.sql`](./database/migrations/002_gastos_recurrentes.sql)
para habilitar los gastos recurrentes y su cálculo en los reportes.
Los gastos de mantenimiento y recurrentes se registran en pesos dominicanos (DOP);
la proyección anual convierte cada gasto mensual a doce meses y mantiene los gastos
históricos identificados por separado. El kilometraje máximo usa la última lectura
registrada para cada vehículo.

## ▶️ Scripts

```bash
npm run dev     # desarrollo en http://localhost:3000
npm run build   # build de producción
npm start       # servidor de producción
npm run lint    # revisión con ESLint
```

## 📁 Estructura

```
src/app/
├── page.tsx                 # Catálogo público
├── vehiculos/[id]/          # Detalle de vehículo
├── login/                   # Acceso de administrador
├── admin/                   # Panel (listado, nuevo, editar)
├── api/
│   ├── vehiculos/           # CRUD de vehículos
│   ├── vehiculo-fotos/      # Fotos de vehículos
│   ├── cloudinary-signature/# Firma para subidas
│   └── login · logout/      # Sesión de administrador
└── lib/                     # db, auth, subida a Cloudinary
public/                      # Logo e imágenes
```

## 🔌 API

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/vehiculos` | Público |
| POST | `/api/vehiculos` | Admin |
| PUT / DELETE | `/api/vehiculos/:id` | Admin |
| GET | `/api/vehiculo-fotos?vehiculoId=` | Público |
| POST / DELETE | `/api/vehiculo-fotos` | Admin |
| GET / POST | `/api/mantenimientos` | Admin |
| PUT | `/api/mantenimientos/:id` | Admin |
| GET | `/api/vehiculos/:id/mantenimientos` | Admin |
| GET / POST | `/api/vehiculos/:id/gastos-recurrentes` | Admin |
| PUT / DELETE | `/api/vehiculos/:id/gastos-recurrentes/:gastoId` | Admin |
| POST / DELETE / PATCH | `/api/vehiculo-fotos` | Admin |
| POST | `/api/login` · `/api/logout` | — |

## 👤 Autor

**Danny Guerrero** — [@DannyG09](https://github.com/DannyG09
