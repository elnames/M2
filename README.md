# m2 — Plataforma de Análisis Inmobiliario

> Detecta oportunidades de inversión en el mercado inmobiliario del Gran Santiago mediante Machine Learning.

**m2** es un SaaS B2C que raspa propiedades en venta de los principales portales chilenos, aplica un modelo predictivo para estimar el valor justo de cada propiedad y calcula un *opportunity score* que permite a inversores identificar propiedades subvaloradas antes de que el mercado las corrija.

---

## Características principales

- **Motor ML** — `GradientBoostingRegressor` que predice `valor_justo_uf`, calcula `opportunity_score` (0–100) y `cap_rate` para detectar *diamantes* (score > 80 y cap_rate > 6%)
- **Scraper** — Playwright + BeautifulSoup contra PortalInmobiliario, Toctoc y Yapo con validación estricta de datos (rango UF/m², URLs absolutas)
- **Mapa interactivo** — Leaflet con heatmap de oportunidades, filtro por comuna y flyTo animado
- **Modelo freemium** — Plan Explorador (3 comunas) y Plan Inversor (32 comunas del Gran Santiago)
- **Alertas automáticas** — Email con React Email + Resend cuando aparecen nuevos *diamantes*
- **CRON diario** — Scraping automático a las 04:00 AM via APScheduler
- **Panel admin** — Gestión de usuarios, edición de plan/rol, scraping manual

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| Mapa | Leaflet · MapLibre GL |
| Auth | NextAuth v5 · JWT · Magic Link (Resend) · Prisma 6 |
| Backend | FastAPI · Python 3.11 · SQLAlchemy · Alembic |
| ML | scikit-learn · GradientBoostingRegressor |
| Scraping | Playwright · httpx · BeautifulSoup4 |
| Base de datos | PostgreSQL 16 + PostGIS |
| Infra | Docker Compose · Nginx · Certbot (Let's Encrypt) |
| Emails | React Email · Resend |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   m2.nmsdev.tech                     │
│              Nginx (puerto 80/443)                   │
└─────────────────┬───────────────────────────────────┘
                  │
     ┌────────────▼────────────┐
     │     m2_web              │  Next.js 15
     │     Puerto 3080         │  Dashboard · Auth · Admin
     └────────────┬────────────┘
                  │ DATA_ENGINE_URL (interno)
     ┌────────────▼────────────┐
     │     m2_engine           │  FastAPI + ML
     │     Puerto 3050         │  Scraper · Valuaciones · API
     └────────────┬────────────┘
                  │
     ┌────────────▼────────────┐
     │     m2_db               │  PostgreSQL 16 + PostGIS
     │     Puerto 5432         │  properties · valuations · alerts
     └─────────────────────────┘
```

---

## Estructura del proyecto

```
m2/
├── web/                          # Next.js 15
│   ├── src/
│   │   ├── app/                  # App Router (dashboard, admin, auth, api)
│   │   ├── components/
│   │   │   ├── dashboard/        # DashboardInteractive (filtros cliente)
│   │   │   ├── map/              # MapLeaflet + MapWrapper
│   │   │   ├── admin/            # AdminUsersTable (edición inline)
│   │   │   └── ui/               # Button, Card, Badge...
│   │   └── lib/                  # auth.ts (NextAuth + JWT), prisma.ts
│   └── prisma/schema.prisma
│
├── data-engine/                  # FastAPI
│   └── app/
│       ├── api/routes/           # properties, valuations, scraper, health
│       ├── ml/model.py           # GradientBoostingRegressor + scoring
│       ├── scraper/              # portal_inmobiliario.py, seed_data.py
│       └── core/                 # database.py, models.py (SQLAlchemy)
│
├── db/migrations/                # SQL migrations
├── nginx/nginx.conf              # Reverse proxy config
├── docker-compose.yml
├── .env.example                  # Variables de entorno (plantilla)
├── CLAUDE.md                     # Contexto para Claude Code
├── AI_CONTEXT.md                 # Contexto universal para cualquier IA
└── README.md
```

---

## Puesta en marcha local

### Requisitos

- Docker 24+ y Docker Compose v2
- (Opcional) Node.js 20+ y Python 3.11+ para desarrollo local sin Docker

### 1. Clonar y configurar entorno

```bash
git clone https://github.com/elnames/M2.git
cd M2
cp .env.example .env
# Editar .env con tus valores reales
```

### 2. Levantar con Docker Compose

```bash
docker compose up -d
```

Los servicios quedan disponibles en:

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3080 |
| Data Engine API | http://localhost:3050 |
| API Docs (Swagger) | http://localhost:3050/docs |

### 3. Poblar la base de datos (primer uso)

```bash
# Datos sintéticos para desarrollo (~1.200 propiedades)
curl -X POST http://localhost:3050/api/scraper/seed

# O iniciar scraping real (requiere conexión a internet)
curl -X POST http://localhost:3050/api/scraper/run
```

### 4. Crear usuario admin (primera vez)

En `web/prisma/seed.ts` o directamente via Prisma Studio:

```bash
cd web
npx prisma studio
```

---

## API del motor de datos

### Propiedades

```http
GET /api/properties/?comuna=Providencia&min_score=70&limit=50
GET /api/properties/heatmap
```

### Valuaciones

```http
GET /api/valuations/top-oportunidades?limit=20
```

### Scraper

```http
GET  /api/scraper/status
POST /api/scraper/run      # Inicia scraping en background
POST /api/scraper/purge    # Elimina datos corruptos
POST /api/scraper/seed     # Pobla con datos sintéticos
```

Documentación interactiva completa: `http://localhost:3050/docs`

---

## Modelo ML — cómo funciona

El `GradientBoostingRegressor` se entrena con las propiedades scrapeadas y genera tres métricas por propiedad:

```
valor_justo_uf   = predicción del modelo en UF
opportunity_score = 50 + 50 × tanh(ratio × 3.5)   [0-100]
  donde ratio = (valor_justo_uf - precio_actual) / valor_justo_uf

cap_rate = (arriendo_mensual_estimado × 12) / precio_venta × 100  [%]

is_diamond = opportunity_score > 80  AND  cap_rate > 6%
```

**Validación de datos de entrada** (reglas duras):
- Precio de venta: 500 – 50.000 UF
- Superficie: 15 – 2.000 m²
- Densidad: 20 – 400 UF/m²
- URL: debe ser absoluta (`https://`)

---

## Planes y seguridad

| Plan | Comunas | Alertas |
|------|---------|---------|
| Explorador (gratis) | 3 (elegidas en onboarding) | No |
| Inversor | 32 comunas del Gran Santiago | Sí (diamantes) |

El filtro de comunas se aplica en el JWT y se valida en cada endpoint del engine. No es bypasseable desde el cliente.

---

## Despliegue en producción

### Variables de entorno requeridas

Copia `.env.example` a `.env` y completa:

```env
DB_USER=                  # Usuario PostgreSQL
DB_PASSWORD=              # Contraseña segura
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=             # https://tu-dominio.com
RESEND_API_KEY=           # Desde resend.com
RESEND_FROM=              # email verificado en Resend
```

### Comandos de operación

```bash
# Rebuild selectivo
docker compose build data-engine && docker compose up -d data-engine
docker compose build web && docker compose up -d web

# Ver logs
docker compose logs -f data-engine
docker compose logs -f web

# Purgar datos corruptos tras scraping
curl -X POST http://localhost:3050/api/scraper/purge

# Estado actual
curl -s http://localhost:3050/api/scraper/status
```

---

## Variables de entorno — referencia completa

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DB_USER` | Usuario PostgreSQL | Sí |
| `DB_PASSWORD` | Contraseña PostgreSQL | Sí |
| `DATABASE_URL` | URL de conexión completa | Sí |
| `NEXTAUTH_SECRET` | Secret para firmar JWT | Sí |
| `NEXTAUTH_URL` | URL pública del frontend | Sí |
| `GOOGLE_CLIENT_ID` | OAuth Google (opcional) | No |
| `GOOGLE_CLIENT_SECRET` | OAuth Google (opcional) | No |
| `RESEND_API_KEY` | API key de Resend | Sí (emails) |
| `RESEND_FROM` | Dirección de envío | Sí (emails) |
| `DATA_ENGINE_URL` | URL interna del engine | Sí |

---

## Contribuir

1. Fork del repositorio
2. Crea una rama: `git checkout -b feature/nombre-feature`
3. Commit con mensaje descriptivo (ver convención en `CLAUDE.md`)
4. Pull Request con descripción del cambio

---

## Licencia

MIT © [elnames](https://github.com/elnames)
