# m2.nmsdev.tech — Guía para Claude Code

> Este archivo se carga automáticamente en cada sesión de Claude Code.
> Contiene todas las reglas, arquitectura y contexto del proyecto.

---

## Rol esperado

Actúa siempre como **Lead Fullstack Engineer + Principal Data Scientist** de este proyecto.
Conoces el stack completo: Next.js 15, FastAPI, PostgreSQL/PostGIS, ML con scikit-learn.

---

## Arquitectura del sistema

```
m2.nmsdev.tech  (SaaS análisis inmobiliario · Gran Santiago)
│
├── web/                  → Next.js 15 · App Router · TypeScript
│   ├── src/app/          → Rutas (dashboard, admin, auth, api)
│   ├── src/components/   → UI (map/, dashboard/, admin/, ui/)
│   └── Dockerfile        → Build standalone · Puerto 3080
│
├── data-engine/          → FastAPI · Python 3.11
│   ├── app/api/routes/   → properties, valuations, scraper, health
│   ├── app/ml/model.py   → GradientBoostingRegressor
│   ├── app/scraper/      → portal_inmobiliario.py, seed_data.py
│   └── Dockerfile        → Puerto 3050
│
├── docker-compose.yml    → Servicios: db, data-engine, web, nginx
└── AI_CONTEXT.md         → Contexto universal (también léelo)
```

### Contenedores en producción (192.168.1.22)

| Nombre | Imagen | Puerto externo |
|---|---|---|
| `m2_db` | postgis/postgis:16-3.4 | interno |
| `m2_engine` | m2-data-engine | 3050 |
| `m2_web` | m2-web | 3080 |
| `m2_nginx` | nginx:alpine | 80/443 |

---

## Stack tecnológico

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS dark (esmeralda), shadcn/ui, MapLibre GL / Leaflet, React Email
- **Auth**: NextAuth v5 — JWT + Credentials + Resend Magic Link. Prisma 6 ORM.
- **Backend**: FastAPI + SQLAlchemy + Alembic. APScheduler para CRON diario 04:00 AM.
- **DB**: PostgreSQL 16 + PostGIS. Tablas: `properties`, `valuations`, `alerts`, `users`.
- **ML**: `GradientBoostingRegressor` (scikit-learn). Salidas: `valor_justo_uf`, `opportunity_score` (0-100), `cap_rate`.
- **Scraping**: Playwright (Chromium) con fallback a httpx + BeautifulSoup. Fuentes: PortalInmobiliario, Toctoc, Yapo.

---

## Modelo de negocio (Freemium)

| Plan | Comunas | Features |
|---|---|---|
| `EXPLORADOR` (FREE) | 3 (elegidas en onboarding) | Acceso limitado por JWT `selectedCommunes` |
| `INVERSOR` | 32 (Gran Santiago) | Acceso completo |
| `ADMIN` | — | Panel admin, scraper manual |

**Regla crítica**: el filtro de `selectedCommunes` se aplica en el JWT y en CADA endpoint del engine. No lo elimines.

---

## Motor ML — reglas de negocio

```python
# Diamante: score > 80 AND cap_rate > 6%
# opportunity_score = 50 + 50 * tanh(ratio * 3.5)
# ratio = (valor_justo_uf - precio_actual) / valor_justo_uf

# Validación de datos de entrada (SIEMPRE aplicar):
# - precio_uf: 500 <= x <= 50.000 UF  (venta Santiago)
# - m2: 15 <= x <= 2.000
# - UF/m²: 20 <= precio_uf/m2 <= 400
# - URL: debe empezar con https://
```

---

## Endpoints clave del engine (puerto 3050)

```
GET  /api/properties/             ?comuna=&min_score=&limit=&offset=
GET  /api/properties/heatmap      → [{lat, lng, comuna, intensity}]
GET  /api/valuations/top-oportunidades  ?limit=
GET  /api/scraper/status
POST /api/scraper/run             → lanza scraping async (BackgroundTasks)
POST /api/scraper/purge           → elimina propiedades corruptas
POST /api/scraper/seed            → pobla con datos sintéticos
```

---

## Rutas del frontend

```
/                     → Landing (redirige a /dashboard si logueado)
/dashboard            → KPIs + mapa + tabla de oportunidades (filtro por comuna)
/dashboard/mapa       → Mapa de calor full-screen (MapLibre/Leaflet)
/dashboard/oportunidades
/dashboard/alertas
/dashboard/mercado
/admin/dashboard      → Panel admin: gestión usuarios, scraper, stats
/auth/login
/onboarding
```

---

## Archivos críticos — no tocar sin leer primero

| Archivo | Por qué es crítico |
|---|---|
| `data-engine/app/ml/model.py` | train_model_compat es el wrapper que cachea el pkl. No crear importaciones locales de train_model dentro de funciones. |
| `data-engine/app/api/routes/scraper.py` | _validate_property() debe ejecutarse antes de cada insert Y antes de entrenar el modelo |
| `web/src/lib/auth.ts` | JWT con selectedCommunes — toda la seguridad freemium depende de esto |
| `web/src/components/dashboard/DashboardInteractive.tsx` | Componente cliente con estado de filtros. El server page solo fetcha y delega aquí. |

---

## Comandos de despliegue (servidor: ssh nms@192.168.1.22)

```bash
cd /home/nms/proyectos/m2

# Rebuild selectivo (el más común)
docker compose build data-engine && docker compose up -d data-engine
docker compose build web && docker compose up -d web

# Rebuild completo sin caché
docker compose build --no-cache data-engine web && docker compose up -d

# Ver logs en tiempo real
docker compose logs -f data-engine
docker compose logs -f web

# Purgar datos corruptos (ejecutar tras cada scraping real)
curl -X POST http://localhost:3050/api/scraper/purge

# Estado actual
curl -s http://localhost:3050/api/scraper/status
```

---

## Reglas de desarrollo

1. **Commits**: usa siempre la skill `generar-mensajes-commit` antes de hacer commit.
2. **Datos corruptos**: después de cualquier scraping real, ejecutar `/purge` antes de analizar métricas.
3. **Filtros de validación**: toda propiedad nueva debe pasar `_validate_property()` antes de insertarse en BD y antes de entrenar el modelo.
4. **Dark mode**: todos los componentes UI deben funcionar en dark mode. Selectores: `bg-slate-900 border-white/10 text-slate-200`.
5. **Server vs Client**: las páginas del dashboard son Server Components que fetchan data y delegan a un Client Component `*Interactive.tsx` o `*Client.tsx` para interactividad.
6. **URLs**: el scraper SIEMPRE debe guardar URLs absolutas (`https://`). Nunca usar URLs inventadas como fallback.

---

## Estado actual de la BD (2026-03-25)

- 845 propiedades válidas (de 1.280 originales; 435 corruptas purgadas)
- 6 diamantes reales (score 80-87)
- 35 oportunidades activas (score ≥ 70)
- Playwright/Chromium: instalado en imagen pero falla en el contenedor → el scraper usa httpx como fallback

---

## Leer también

Para contexto completo de negocio, esquema de BD y ejemplos de datos reales:
→ [`AI_CONTEXT.md`](./AI_CONTEXT.md)
