"""
seed_data.py — Gran Santiago 32 comunas seed for Clave Inmobiliaria
Server path: /home/nms/proyectos/clave-inmobiliaria/data-engine/app/scraper/seed_data.py

Generates 40 properties per comuna (70 % ventas, 30 % arriendos) for a total of 1 280 records.
"""

import random
import math
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Comuna reference data: (ventas_uf_m2, arriendo_mensual_uf_m2, lat, lng)
# ---------------------------------------------------------------------------
COMUNAS = {
    "Santiago":            (50,  0.22, -33.4569, -70.6483),
    "Providencia":         (72,  0.30, -33.4327, -70.6130),
    "Las Condes":          (88,  0.36, -33.4050, -70.5680),
    "Vitacura":            (95,  0.40, -33.3810, -70.5780),
    "Nunoa":               (60,  0.25, -33.4560, -70.5990),
    "La Reina":            (65,  0.27, -33.4490, -70.5510),
    "Macul":               (42,  0.18, -33.4930, -70.5970),
    "San Miguel":          (44,  0.19, -33.4970, -70.6480),
    "La Florida":          (36,  0.16, -33.5230, -70.5860),
    "Puente Alto":         (28,  0.13, -33.6100, -70.5760),
    "Maipu":               (32,  0.14, -33.5140, -70.7580),
    "La Pintana":          (22,  0.10, -33.5810, -70.6290),
    "El Bosque":           (24,  0.11, -33.5660, -70.6640),
    "Lo Espejo":           (20,  0.09, -33.5240, -70.6930),
    "Pedro Aguirre Cerda": (23,  0.10, -33.4920, -70.6730),
    "Lo Prado":            (26,  0.11, -33.4610, -70.7300),
    "Cerrillos":           (30,  0.13, -33.4950, -70.7210),
    "Estacion Central":    (35,  0.15, -33.4590, -70.6870),
    "Quinta Normal":       (32,  0.14, -33.4370, -70.6940),
    "Independencia":       (40,  0.17, -33.4200, -70.6500),
    "Recoleta":            (38,  0.17, -33.4090, -70.6380),
    "Conchali":            (27,  0.12, -33.3860, -70.6630),
    "Quilicura":           (29,  0.13, -33.3550, -70.7290),
    "Pudahuel":            (25,  0.11, -33.4430, -70.7620),
    "Lo Barnechea":        (70,  0.29, -33.3540, -70.5200),
    "Huechuraba":          (33,  0.14, -33.3720, -70.6450),
    "Renca":               (24,  0.11, -33.4020, -70.7140),
    "Cerro Navia":         (21,  0.09, -33.4200, -70.7390),
    "La Cisterna":         (34,  0.15, -33.5290, -70.6590),
    "San Joaquin":         (36,  0.16, -33.4960, -70.6260),
    "Penalolen":           (45,  0.20, -33.4860, -70.5380),
    "Las Condes Alto":     (92,  0.38, -33.3780, -70.5310),
}

TIPOS = ["departamento", "casa"]
FUENTES = ["portalinmobiliario", "toctoc", "yapo"]

TITULOS_DEPTO = [
    "Departamento moderno con balcon",
    "Depto amplio, luminoso, 1er piso",
    "Departamento ejecutivo con estacionamiento",
    "Depto 2D/2B con bodega incluida",
    "Departamento nuevo, entrega inmediata",
    "Depto acogedor en edificio con piscina",
    "Departamento con vistas panoramicas",
    "Depto reformado, cocina equipada",
    "Departamento seminuevo, buena ubicacion",
    "Depto amplio con terraza privada",
]

TITULOS_CASA = [
    "Casa con jardin y estacionamiento",
    "Casa amplia, 3 dorm, 2 banos",
    "Casa esquina con patio trasero",
    "Casa familiar bien ubicada",
    "Casa de 2 pisos, barrio tranquilo",
    "Casa con galeria y patio",
    "Casa remodelada, cocina abierta",
    "Casa nueva en proyecto cerrado",
    "Casa con quincho y piscina",
    "Casa de un piso, buen estado",
]

random.seed(42)


def _jitter(value: float, pct: float = 0.10) -> float:
    """Return value +/- pct noise."""
    return value * (1 + random.uniform(-pct, pct))


def _round2(x: float) -> float:
    return round(x, 2)


def _fake_url(fuente: str, idx: int) -> str:
    if fuente == "portalinmobiliario":
        return f"https://www.portalinmobiliario.com/MLC-{1000000 + idx}"
    if fuente == "toctoc":
        return f"https://www.toctoc.com/propiedades/{500000 + idx}"
    return f"https://www.yapo.cl/propiedades/{200000 + idx}"


def _antiguedad() -> int:
    return random.choices(
        [0, 2, 5, 10, 15, 20, 30],
        weights=[5, 10, 20, 25, 20, 12, 8],
    )[0]


def generate_property(
    idx: int,
    comuna: str,
    precio_m2: float,
    arriendo_m2: float,
    base_lat: float,
    base_lng: float,
    tipo_operacion: str,
) -> dict:
    tipo = random.choice(TIPOS)

    if tipo == "departamento":
        m2 = random.randint(40, 130)
        m2_terreno = 0
        habitaciones = random.randint(1, 4)
        banos = max(1, habitaciones - random.randint(0, 1))
        titulo_base = random.choice(TITULOS_DEPTO)
    else:
        m2 = random.randint(60, 200)
        m2_terreno = m2 + random.randint(20, 150)
        habitaciones = random.randint(2, 5)
        banos = max(1, habitaciones - random.randint(0, 1))
        titulo_base = random.choice(TITULOS_CASA)

    # Price variation: some properties are undervalued (opportunity)
    discount = random.choices(
        [0.75, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10],
        weights=[3, 7, 12, 20, 30, 18, 10],
    )[0]

    if tipo_operacion == "venta":
        precio_uf = _round2(_jitter(precio_m2, 0.08) * m2 * discount)
        arriendo_mensual_uf = None
    else:
        # Arriendo: price in UF/month
        precio_uf = _round2(_jitter(arriendo_m2, 0.08) * m2 * discount)
        arriendo_mensual_uf = precio_uf

    fuente = random.choice(FUENTES)
    antiguedad = _antiguedad()

    # Scatter coordinates within ~1.5 km radius
    lat = _round2(base_lat + random.uniform(-0.015, 0.015))
    lng = _round2(base_lng + random.uniform(-0.015, 0.015))

    hab_str = f"{habitaciones}D/{banos}B"
    titulo = f"{titulo_base} {hab_str} - {comuna}"

    prop = {
        "titulo": titulo,
        "precio_uf": precio_uf,
        "m2": m2,
        "m2_terreno": m2_terreno,
        "comuna": comuna,
        "tipo": tipo,
        "habitaciones": habitaciones,
        "banos": banos,
        "antiguedad": antiguedad,
        "lat": lat,
        "lng": lng,
        "url": _fake_url(fuente, idx),
        "fuente": fuente,
        "tipo_operacion": tipo_operacion,
    }

    if arriendo_mensual_uf is not None:
        prop["arriendo_mensual_uf"] = arriendo_mensual_uf

    return prop


def get_seed_properties() -> list[dict]:
    """Return 1 280 seed properties (40 per comuna, 70% ventas / 30% arriendos)."""
    properties = []
    idx = 1

    for comuna, (precio_m2, arriendo_m2, base_lat, base_lng) in COMUNAS.items():
        ventas_count = 28   # 70 % of 40
        arriendos_count = 12  # 30 % of 40

        for _ in range(ventas_count):
            properties.append(
                generate_property(
                    idx, comuna, precio_m2, arriendo_m2, base_lat, base_lng, "venta"
                )
            )
            idx += 1

        for _ in range(arriendos_count):
            properties.append(
                generate_property(
                    idx, comuna, precio_m2, arriendo_m2, base_lat, base_lng, "arriendo"
                )
            )
            idx += 1

    random.shuffle(properties)
    return properties


# Convenience alias used by the scraper router
SEED_PROPERTIES = get_seed_properties()


# ---------------------------------------------------------------------------
# Backwards-compatible aliases for the scraper router
# ---------------------------------------------------------------------------
def generate_seed_properties(n_per_comuna: int = 40):
    return get_seed_properties()

def generate_seed_with_bargains(n_per_comuna: int = 40):
    return get_seed_properties()
