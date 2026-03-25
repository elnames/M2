# m2.nmsdev.tech — Contexto Universal del Proyecto

> **Para cualquier IA**: Este archivo contiene todo el contexto necesario para trabajar en este proyecto.
> Léelo completo antes de hacer cualquier modificación de código.
> Complementa con `CLAUDE.md` si estás usando Claude Code.

---

## ¿Qué es este proyecto?

**m2.nmsdev.tech** es una plataforma SaaS B2C de análisis inmobiliario para **inversores en el Gran Santiago, Chile**.

El sistema raspa propiedades en venta de portales chilenos (PortalInmobiliario, Toctoc, Yapo), aplica un modelo de Machine Learning para estimar el **valor justo en UF** de cada propiedad, y calcula:

- **`opportunity_score`** (0-100): qué tan subvalorada está la propiedad vs. el mercado
- **`cap_rate`** (%): rentabilidad bruta anual proyectada si se arrienda
- **`is_diamond`**: `score > 80 AND cap_rate > 6%` → oportunidad de inversión excepcional

Los usuarios pagan suscripción para ver oportunidades en más comunas y recibir alertas de "diamantes" por email.

---

## Infraestructura

```
Servidor:     192.168.1.22  (Ubuntu, Docker Compose)
Dominio:      m2.nmsdev.tech
SSH:          ssh nms@192.168.1.22
Proyecto:     /home/nms/proyectos/m2/
```

### Contenedores Docker

| Contenedor | Tecnología | Puerto | Descripción |
|---|---|---|---|
| `m2_db` | PostgreSQL 16 + PostGIS | 5432 (interno) | Base de datos principal |
| `m2_engine` | FastAPI + Python 3.11 | 3050 | API de datos + ML + scraper |
| `m2_web` | Next.js 15 | 3080 | Frontend SaaS |
| `m2_nginx` | Nginx | 80/443 | Reverse proxy + SSL |

---

## Estructura de archivos

```
m2/
├── CLAUDE.md                    ← Reglas para Claude Code (léelo también)
├── AI_CONTEXT.md                ← Este archivo
├── docker-compose.yml
│
├── data-engine/                 ← FastAPI (Python)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              ← Entrypoint FastAPI, APScheduler CRON 04:00
│       ├── core/
│       │   ├── database.py      ← SQLAlchemy engine + SessionLocal
│       │   └── models.py        ← ORM: Property, Valuation, Alert
│       ├── ml/
│       │   └── model.py         ← GradientBoostingRegressor + scoring
│       ├── scraper/
│       │   ├── portal_inmobiliario.py  ← Playwright/httpx scraper
│       │   └── seed_data.py     ← Datos sintéticos para desarrollo
│       └── api/routes/
│           ├── properties.py    ← GET /api/properties/ y /heatmap
│           ├── valuations.py    ← GET /api/valuations/top-oportunidades
│           ├── scraper.py       ← POST /run /purge /seed · GET /status
│           └── health.py
│
└── web/                         ← Next.js 15 (TypeScript)
    ├── Dockerfile
    ├── prisma/schema.prisma     ← Modelos User, Account, Session
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx         ← Landing (redirige si logueado)
        │   ├── dashboard/
        │   │   ├── page.tsx     ← Server Component: fetcha y delega
        │   │   ├── mapa/page.tsx
        │   │   ├── oportunidades/page.tsx
        │   │   └── layout.tsx
        │   ├── admin/dashboard/page.tsx
        │   ├── auth/
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   ├── onboarding/page.tsx
        │   └── api/
        │       ├── auth/[...nextauth]/route.ts
        │       ├── admin/users/route.ts   ← PATCH plan/rol/pwd, DELETE
        │       ├── heatmap/route.ts
        │       ├── properties/route.ts
        │       └── scraper/status/route.ts
        ├── components/
        │   ├── dashboard/
        │   │   ├── DashboardInteractive.tsx  ← Cliente: filtros + tabla + mapa
        │   │   └── DashboardClient.tsx       ← Botón scraper (solo admin)
        │   ├── map/
        │   │   ├── MapLeaflet.tsx   ← Mapa principal con flyTo por comuna
        │   │   └── MapWrapper.tsx   ← Dynamic import (evita SSR)
        │   ├── admin/
        │   │   └── AdminUsersTable.tsx  ← Tabla editable plan/rol/pwd
        │   ├── landing/
        │   └── ui/                  ← Button, Card, Badge, etc.
        └── lib/
            ├── auth.ts              ← NextAuth config + JWT selectedCommunes
            └── prisma.ts
```

---

## Esquema de base de datos

### PostgreSQL (motor: data-engine via SQLAlchemy)

```sql
-- Propiedades scrapeadas
CREATE TABLE properties (
    id              SERIAL PRIMARY KEY,
    url             VARCHAR(500) UNIQUE,   -- URL absoluta obligatoria
    titulo          VARCHAR(300),
    precio_uf       FLOAT,                 -- Precio de venta en UF (500-50.000)
    m2              FLOAT,                 -- m² construidos (15-2000)
    m2_terreno      FLOAT,
    comuna          VARCHAR(100),          -- Nombre de comuna (normalizado)
    region          VARCHAR(100),
    tipo            VARCHAR(50),           -- 'departamento' | 'casa'
    habitaciones    INTEGER,
    banos           INTEGER,
    antiguedad      INTEGER,
    lat             FLOAT,                 -- Coordenada WGS84
    lng             FLOAT,
    fuente          VARCHAR(50),           -- 'portalinmobiliario' | 'toctoc' | 'yapo'
    fecha_scraping  TIMESTAMP,
    activo          BOOLEAN DEFAULT TRUE
);

-- Valuaciones ML
CREATE TABLE valuations (
    id              SERIAL PRIMARY KEY,
    property_id     INTEGER REFERENCES properties(id),
    valor_justo_uf  FLOAT,           -- Predicción del modelo
    opportunity_score FLOAT,          -- 0-100
    precio_lista_uf FLOAT,
    diferencia_pct  FLOAT,           -- (valor_justo - precio_lista) / precio_lista * 100
    fecha_calculo   TIMESTAMP
);

-- Alertas enviadas
CREATE TABLE alerts (
    id              SERIAL PRIMARY KEY,
    user_email      VARCHAR(200),
    property_id     INTEGER REFERENCES properties(id),
    opportunity_score FLOAT,
    enviada_at      TIMESTAMP,
    enviada         BOOLEAN DEFAULT FALSE
);
```

### PostgreSQL (usuarios: web via Prisma)

```prisma
model User {
  id               String   @id @default(cuid())
  email            String   @unique
  name             String?
  password         String?
  role             String   @default("USER")  // "USER" | "ADMIN"
  plan             String   @default("EXPLORADOR")  // "EXPLORADOR" | "INVERSOR"
  onboardingDone   Boolean  @default(false)
  selectedCommunes String[]  // máx 3 para EXPLORADOR
  createdAt        DateTime @default(now())
  // + Account, Session (NextAuth)
}
```

---

## Modelo ML — detalle técnico

**Algoritmo**: `GradientBoostingRegressor` (scikit-learn)
**Target**: `precio_uf` (valor de mercado en UF)
**Features** (7):

| # | Feature | Descripción |
|---|---|---|
| 0 | `m2` | Metros cuadrados construidos |
| 1 | `m2_terreno` | Terreno (0 para deptos) |
| 2 | `habitaciones` | Número de dormitorios |
| 3 | `banos` | Número de baños |
| 4 | `antiguedad` | Años desde construcción |
| 5 | `tipo_num` | 0=depto, 1=casa |
| 6 | `comuna_score` | Score de ubicación 50-95 (ver tabla en model.py) |

**Fórmulas de scoring**:

```python
# Predicción valor justo
valor_justo_uf = model.predict(scaler.transform(features))

# Opportunity Score (0-100)
ratio = (valor_justo_uf - precio_actual) / valor_justo_uf
opportunity_score = 50 + 50 * tanh(ratio * 3.5)
# ratio=0 → score=50 (precio justo), ratio=0.30+ → score≈95

# Cap Rate (rentabilidad bruta anual)
arriendo_mensual = avg_arriendo_m2 * m2  # UF/m²/mes * m²
cap_rate = (arriendo_mensual * 12) / precio_venta * 100

# Diamante
is_diamond = opportunity_score > 80 AND cap_rate > 6.0
```

**Validación de entrada** (reglas duras, no negociables):
```python
500 <= precio_uf <= 50000      # Rango real venta Santiago
15 <= m2 <= 2000               # m² plausibles
20 <= precio_uf/m2 <= 400      # UF/m² plausible Gran Santiago
url.startswith('https://')     # URL absoluta válida
```

---

## API del engine — referencia completa

Base URL: `http://localhost:3050` (o `http://data-engine:3050` desde web container)

```
GET  /api/properties/
     ?comuna=Providencia
     &min_score=70
     &limit=50
     &offset=0
     → [{id, titulo, precio_uf, m2, comuna, lat, lng, tipo, fuente,
         opportunity_score, valor_justo_uf, diferencia_pct, url}]

GET  /api/properties/heatmap
     → [{lat, lng, comuna, intensity}]  (intensity = opportunity_score)

GET  /api/valuations/top-oportunidades
     ?limit=20
     → [{id, titulo, comuna, precio_uf, valor_justo_uf, opportunity_score, url, lat, lng}]

GET  /api/scraper/status
     → {running: bool, total_properties: int, oportunidades: int, diamantes: int}

POST /api/scraper/run
     → Inicia scraping async (BackgroundTasks). CRON automático 04:00 AM.

POST /api/scraper/purge
     → Elimina propiedades con datos inválidos. Ejecutar tras scraping real.
     → {ok, propiedades_eliminadas, valuations_absurdas_eliminadas, mensaje}

POST /api/scraper/seed
     ?n_per_comuna=60
     → Pobla BD con datos sintéticos para desarrollo/testing.
```

---

## Flujo de datos: scraping → ML → almacenamiento

```
1. Playwright/httpx raspa PortalInmobiliario/Toctoc/Yapo
2. _parse_html() extrae: titulo, precio_uf, m2, url (ABSOLUTA), tipo
3. _validate_property() verifica rangos:
   - precio_uf 500-50.000 UF
   - m2 15-2000
   - UF/m² 20-400
   - URL https://...
4. Si hay ≥10 props válidas → train_model_compat() re-entrena GBR
5. Por cada prop válida nueva (url no existe en BD):
   - INSERT properties
   - predict_fair_value_compat() → {valor_justo_uf, opportunity_score, diferencia_pct}
   - INSERT valuations
6. Si opportunity_score ≥ 80 → alerta email (Resend)
```

---

## Seguridad y autenticación

```typescript
// JWT payload incluye:
{
  sub: userId,
  email: userEmail,
  role: "USER" | "ADMIN",
  plan: "EXPLORADOR" | "INVERSOR",
  selectedCommunes: ["Providencia", "Ñuñoa", "Macul"]  // solo EXPLORADOR
}

// Middleware: si plan === "EXPLORADOR", filtrar por selectedCommunes en TODOS los endpoints
// Si plan === "INVERSOR", acceso a las 32 comunas del Gran Santiago
```

---

## Comunas del Gran Santiago (32)

Santiago, Providencia, Las Condes, Vitacura, Ñuñoa, La Reina, Macul, San Miguel,
La Florida, Puente Alto, Maipú, La Pintana, El Bosque, Lo Espejo, Pedro Aguirre Cerda,
Lo Prado, Cerrillos, Estación Central, Quinta Normal, Independencia, Recoleta, Conchalí,
Quilicura, Pudahuel, Lo Barnechea, Huechuraba, Renca, Cerro Navia, La Cisterna,
San Joaquín, Peñalolén, Las Condes Alto

---

## Variables de entorno necesarias

```env
# data-engine
DATABASE_URL=postgresql://user:pass@db:5432/clave_inmo
RESEND_API_KEY=re_...
RESEND_FROM=alertas@nmsdev.tech

# web
DATABASE_URL=postgresql://user:pass@db:5432/clave_inmo
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://m2.nmsdev.tech
DATA_ENGINE_URL=http://data-engine:3050
RESEND_API_KEY=re_...
```

---

## Problemas conocidos / deuda técnica

| Problema | Estado | Workaround |
|---|---|---|
| Playwright/Chromium falla en contenedor | Pendiente | httpx fallback activo |
| Scrapers Toctoc/Yapo no implementados | Pendiente | Solo seed data los simula |
| lat/lng de seed data son aproximados por comuna | Aceptable | Datos reales del scraper tendrán coords exactas |
| Re-entrenamiento ML con pocos datos reales | Pendiente | Model.pkl generado con seed data |

---

## Comandos frecuentes

```bash
# Ver estado del sistema
ssh nms@192.168.1.22 "curl -s http://localhost:3050/api/scraper/status"

# Ver logs del engine en vivo
ssh nms@192.168.1.22 "docker compose -f /home/nms/proyectos/m2/docker-compose.yml logs -f data-engine"

# Purgar datos corruptos
ssh nms@192.168.1.22 "curl -X POST http://localhost:3050/api/scraper/purge"

# Lanzar scraping manual
ssh nms@192.168.1.22 "curl -X POST http://localhost:3050/api/scraper/run"

# Re-sembrar BD con datos sintéticos (desarrollo)
ssh nms@192.168.1.22 "curl -X POST http://localhost:3050/api/scraper/seed"

# Rebuild y restart
ssh nms@192.168.1.22 "cd /home/nms/proyectos/m2 && docker compose build data-engine web && docker compose up -d"
```

---

## Historial de bugs resueltos importantes

| Bug | Causa raíz | Solución |
|---|---|---|
| Score siempre = 53 | Importación local de `train_model` en `seed_database()` sobreescribía el alias que apuntaba a `train_model_compat` | Eliminar importación local; el alias de nivel módulo ya apunta al wrapper correcto |
| Score siempre = 100 | Scraper guardaba CLP como UF (precio 12.57 UF en lugar de 12.570.000 CLP) → ratio ≈ 1 → tanh saturation | Filtros estrictos: min 500 UF, validación UF/m², purge de datos corruptos |
| URLs rotas en popup mapa | `title_tag.get('href')` capturaba anchor relativo o el home del portal | Iterar todos los `<a>` buscando patrón `/MLC-\d+` o dominio del portal |
| Dropdown admin invisible | `<select>` sin clases dark mode → fondo blanco heredado del browser | `bg-slate-900 text-slate-200 border-white/10` |
| Filtros dashboard no funcionaban | `<select>` en Server Component sin estado | Extraer a `DashboardInteractive.tsx` (Client Component con `useState`) |
