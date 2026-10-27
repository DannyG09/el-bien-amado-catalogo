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
- Registro de clientes con nacionalidad, cédula, datos de contacto, vencimiento de licencia, dirección y notas.
- Edición de clientes con carga privada y administración de fotos de perfil, cédulas, licencias y otros documentos.
- Contratos de renta vinculados al historial de clientes y vehículos.
- Reservas de vehículos desde la creación del contrato; quedan rentados al cargar la firma presencial y se liberan al completar o cancelar el contrato.
- Registro de pagos de renta y depósito, cálculo de saldo y generación de PDF con términos y datos de empresa guardados como copia del contrato.
- Configuración de nombre, contacto, términos y firma/sello empresarial para los nuevos contratos.
- Subida de hasta 8 fotos por vehículo a Cloudinary mediante firma en servidor.
- Panel principal con indicadores de la flota y accesos rápidos; navegación y encabezados con un diseño visual unificado.
- Registro de mantenimiento por vehículo, gastos en DOP, categorías e historial de kilometraje.
- Historial de mantenimiento con filtros, paginación de 25 registros y edición de registros existentes.
- Adjuntar facturas opcionales a los mantenimientos; se guardan como imágenes privadas en Cloudinary y solo las puede abrir una sesión administrativa.
- Descargar un reporte mensual en PDF con los mantenimientos realizados y una sección separada de cargos recurrentes programados.
- Gastos recurrentes mensuales y anuales por vehículo, con cálculo automático de próxima fecha.
- Pantalla central de gastos recurrentes conectada a la flota, clasificada por tipo, con contador de días de vigencia, filtros, proyección anual y reporte PDF anual con resumen y desglose mensual.
- Reordenamiento de fotografías para elegir la portada y consulta de los últimos cinco mantenimientos desde la edición del vehículo.
- Estado de cada vehículo (disponible, rentado, en mantenimiento o en taller de pintura), con filtros en el panel; el catálogo público muestra únicamente los disponibles.
- Edición del kilometraje actual de la flota, sincronizado automáticamente al registrar lecturas de mantenimiento.
- Resumen de gastos históricos, proyección anual de gastos recurrentes y kilometraje actual por vehículo.
- Interfaz de administración simplificada, sin imagen de fondo, y consultas paginadas para reducir la carga del historial.

## 🛠️ Tecnologías

| Área | Herramienta |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4, lucide-react |
| Base de datos | PostgreSQL (`pg`) |
| Imágenes | Cloudinary (`next-cloudinary`) |
| Reportes PDF | `pdf-lib` |

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

- **`vehiculos`**: `id`, `marca`, `modelo`, `anio`, `placa`, `color`, `tiposeguro`, `preciodia`, `imagen`, `descripcion`, `disponible`, `estado`, `kilometraje`
- **`vehiculo_fotos`**: fotos asociadas a cada vehículo (relación con `vehiculos.id`)
- **`mantenimientos`**: registros de gasto y kilometraje, asociados a `vehiculos.id`.
- **`vehiculo_gastos_recurrentes`**: pagos periódicos asociados a cada vehículo.
- **`clientes`** y **`cliente_documentos`**: datos personales y archivos privados de clientes.
- **`contratos`**, **`contrato_pagos`** y **`contrato_configuracion`**: contratos, pagos, firmas y datos/condiciones empresariales.
- **`multas_danos`** y **`multa_dano_fotos`**: incidentes de vehículos, cobros y evidencia fotográfica.
- **`reservas_vehiculos`** y **`contrato_extensiones`**: disponibilidad por fechas, reservas y extensiones de contratos.

Ejecuta las migraciones en orden:

1. [`database/migrations/001_mantenimientos.sql`](./database/migrations/001_mantenimientos.sql) habilita el historial de mantenimiento.
2. [`database/migrations/002_gastos_recurrentes.sql`](./database/migrations/002_gastos_recurrentes.sql) habilita los gastos recurrentes.
3. [`database/migrations/003_facturas_mantenimientos.sql`](./database/migrations/003_facturas_mantenimientos.sql) añade referencias opcionales a facturas privadas para los mantenimientos existentes.
4. [`database/migrations/004_categorias_gastos_recurrentes.sql`](./database/migrations/004_categorias_gastos_recurrentes.sql) clasifica los gastos recurrentes existentes y añade tipos de gasto.
5. [`database/migrations/005_estado_y_kilometraje_vehiculos.sql`](./database/migrations/005_estado_y_kilometraje_vehiculos.sql) añade el estado y kilometraje actual de cada vehículo. Los vehículos previamente no disponibles se inicializan como rentados; puedes ajustar su estado desde el panel.
6. [`database/migrations/006_estado_taller_pintura.sql`](./database/migrations/006_estado_taller_pintura.sql) permite registrar el nuevo estado de taller de pintura. Ejecútala incluso si ya aplicaste la migración 005.
7. [`database/migrations/007_clientes.sql`](./database/migrations/007_clientes.sql) crea las tablas para registrar clientes y sus documentos.
8. [`database/migrations/008_contratos.sql`](./database/migrations/008_contratos.sql) crea contratos, pagos y configuración, y agrega el estado reservado a los vehículos. Ejecútala después de la migración 007.
9. [`database/migrations/009_multas_danos.sql`](./database/migrations/009_multas_danos.sql) crea el registro de multas, daños y sus fotografías.
10. [`database/migrations/010_reservas_extensiones.sql`](./database/migrations/010_reservas_extensiones.sql) crea las reservas por fecha y el historial de extensiones. Ejecútala después de la migración 009.

Las reservas y contratos bloquean las fechas de entrega y devolución inclusive.
Las extensiones propuestas no cambian el contrato firmado y solo se aplican
cuando administración confirma que el cliente las aceptó.

Los documentos de clientes se guardan como archivos autenticados en Cloudinary y
se sirven únicamente a sesiones administrativas. Se aceptan imágenes JPG, PNG,
WEBP y documentos PDF de hasta 8 MB.
Las firmas de cliente y empresa se aceptan en PNG o JPG de hasta 8 MB y se
guardan en PostgreSQL. Cada contrato conserva una copia de los datos de cliente,
vehículo, empresa y términos usada al crearlo.

Los gastos de mantenimiento y recurrentes se registran en pesos dominicanos (DOP).
La proyección anual convierte cada gasto mensual a doce meses y presenta los gastos
históricos por separado. El kilometraje actual se guarda en el vehículo, se inicializa
con la lectura de mantenimiento más reciente y se incrementa al registrar un mantenimiento
con una lectura superior.

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
├── admin/                   # Panel, vehículos, clientes, contratos y mantenimiento
├── api/
│   ├── contratos/           # Contratos, pagos, firmas, configuración y PDF
│   ├── clientes/             # Clientes y archivos privados
│   ├── gastos-recurrentes/  # Gestión de flota y reporte anual PDF
│   ├── vehiculos/           # Vehículos, mantenimientos recientes y gastos recurrentes
│   ├── mantenimientos/      # Historial, facturas privadas, PDF mensual y edición
│   ├── vehiculo-fotos/      # Fotos y orden de galería
│   ├── cloudinary-signature/# Firma para subidas a Cloudinary
│   └── login/ · logout/     # Sesión de administrador
└── lib/                     # db, auth, subida a Cloudinary
public/                      # Logo e imágenes
```

## 🔌 API

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/vehiculos` | Público |
| POST | `/api/vehiculos` | Admin |
| PUT / DELETE | `/api/vehiculos/:id` | Admin |
| PATCH | `/api/vehiculos/:id` | Admin |
| GET | `/api/vehiculo-fotos?vehiculoId=` | Público |
| POST / DELETE / PATCH | `/api/vehiculo-fotos` | Admin |
| POST | `/api/cloudinary-signature` | Admin |
| GET / POST | `/api/mantenimientos` | Admin |
| PUT | `/api/mantenimientos/:id` | Admin |
| GET | `/api/mantenimientos/:id/factura` | Admin |
| GET | `/api/mantenimientos/reporte?mes=AAAA-MM` | Admin |
| GET / POST | `/api/gastos-recurrentes` | Admin |
| GET | `/api/gastos-recurrentes/reporte?anio=AAAA` | Admin |
| GET / POST | `/api/clientes` | Admin |
| GET / PUT / DELETE | `/api/clientes/:id` | Admin |
| GET / POST | `/api/contratos` | Admin |
| GET / PUT / PATCH | `/api/contratos/:id` | Admin |
| POST | `/api/contratos/:id/firma` | Admin |
| POST | `/api/contratos/:id/pagos` | Admin |
| GET | `/api/contratos/:id/pdf` | Admin |
| GET / PUT | `/api/contratos/configuracion` | Admin |
| GET | `/api/vehiculos/:id/mantenimientos` | Admin |
| GET / POST | `/api/vehiculos/:id/gastos-recurrentes` | Admin |
| PUT / DELETE | `/api/vehiculos/:id/gastos-recurrentes/:gastoId` | Admin |
| POST | `/api/login` · `/api/logout` | — |

## 👤 Autor

**Danny Guerrero** — [@DannyG09](https://github.com/DannyG09)
