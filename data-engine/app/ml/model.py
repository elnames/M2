"""
model.py — ML model for Clave Inmobiliaria fair-value estimation
Server path: /home/nms/proyectos/clave-inmobiliaria/data-engine/app/ml/model.py

Model: GradientBoostingRegressor
Outputs:
  - valor_justo_uf      : estimated fair market value in UF
  - opportunity_score   : 0-100 score (higher = bigger undervaluation opportunity)
  - cap_rate            : annualised cap rate % (ventas only, requires avg arriendo data)
  - is_diamond          : True when score > 80 AND cap_rate > 6.0
"""

import logging
import math
import numpy as np
from typing import Optional
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Comuna quality scores (50 – 95)
# Reflects location desirability: access, services, safety, demand.
# ---------------------------------------------------------------------------
COMUNAS_SCORE: dict[str, int] = {
    "Santiago":            72,
    "Providencia":         88,
    "Las Condes":          92,
    "Vitacura":            95,
    "Nunoa":               82,
    "La Reina":            83,
    "Macul":               65,
    "San Miguel":          66,
    "La Florida":          60,
    "Puente Alto":         52,
    "Maipu":               55,
    "La Pintana":          50,
    "El Bosque":           51,
    "Lo Espejo":           50,
    "Pedro Aguirre Cerda": 51,
    "Lo Prado":            53,
    "Cerrillos":           56,
    "Estacion Central":    60,
    "Quinta Normal":       57,
    "Independencia":       64,
    "Recoleta":            63,
    "Conchali":            54,
    "Quilicura":           55,
    "Pudahuel":            52,
    "Lo Barnechea":        85,
    "Huechuraba":          58,
    "Renca":               51,
    "Cerro Navia":         50,
    "La Cisterna":         59,
    "San Joaquin":         61,
    "Penalolen":           68,
    "Las Condes Alto":     94,
}

DEFAULT_COMUNA_SCORE = 55  # fallback for unknown comunas

# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def _encode_features(property_data: dict) -> np.ndarray:
    """
    Encode a property dict into a 7-element feature vector:
      0  m2               — built area (sqm)
      1  m2_terreno       — land area  (sqm, 0 for apartments)
      2  habitaciones     — bedrooms
      3  banos            — bathrooms
      4  antiguedad       — age in years
      5  tipo_num         — 0 = departamento, 1 = casa
      6  comuna_score     — location quality score (50-95)
    """
    tipo_num = 1 if str(property_data.get("tipo", "departamento")).lower() == "casa" else 0
    comuna = str(property_data.get("comuna", ""))
    comuna_score = COMUNAS_SCORE.get(comuna, DEFAULT_COMUNA_SCORE)

    features = np.array([
        float(property_data.get("m2", 60)),
        float(property_data.get("m2_terreno", 0)),
        float(property_data.get("habitaciones", 2)),
        float(property_data.get("banos", 1)),
        float(property_data.get("antiguedad", 10)),
        float(tipo_num),
        float(comuna_score),
    ], dtype=np.float64)

    return features


# ---------------------------------------------------------------------------
# Model training
# ---------------------------------------------------------------------------

def train_model(
    properties: list[dict],
) -> tuple[GradientBoostingRegressor, StandardScaler]:
    """
    Train a GradientBoostingRegressor on the provided property list.

    Only "venta" properties with a valid precio_uf are used for training.

    Returns
    -------
    model   : fitted GradientBoostingRegressor
    scaler  : fitted StandardScaler (same feature order as _encode_features)
    """
    ventas = [
        p for p in properties
        if p.get("tipo_operacion", "venta") == "venta"
        and p.get("precio_uf") is not None
        and float(p.get("precio_uf", 0)) > 0
    ]

    if len(ventas) < 20:
        raise ValueError(
            f"Not enough venta samples to train (got {len(ventas)}, need >= 20)"
        )

    X_raw = np.array([_encode_features(p) for p in ventas], dtype=np.float64)
    y = np.array([float(p["precio_uf"]) for p in ventas], dtype=np.float64)

    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    model = GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        min_samples_leaf=5,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X, y)

    logger.info(
        "Model trained on %d samples. Train R²=%.4f",
        len(ventas),
        model.score(X, y),
    )

    return model, scaler


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

def predict_fair_value(
    property_data: dict,
    model: GradientBoostingRegressor,
    scaler: StandardScaler,
) -> tuple[float, float]:
    """
    Predict the fair market value and compute the opportunity score.

    Parameters
    ----------
    property_data : property dict (must include precio_uf for score computation)
    model         : fitted GradientBoostingRegressor
    scaler        : fitted StandardScaler

    Returns
    -------
    valor_justo_uf   : predicted fair value in UF (rounded to 2 dp)
    opportunity_score: 0-100 float score
    """
    features = _encode_features(property_data).reshape(1, -1)
    X = scaler.transform(features)
    valor_justo_uf = float(model.predict(X)[0])
    valor_justo_uf = round(max(valor_justo_uf, 1.0), 2)

    precio_actual = float(property_data.get("precio_uf", 0))
    if precio_actual > 0:
        # Upside ratio: how much cheaper the property is vs. fair value
        # Capped and scaled to 0-100.
        ratio = (valor_justo_uf - precio_actual) / valor_justo_uf
        # sigmoid-like scaling: ratio 0 → score 50, ratio 0.30+ → score ~95
        raw_score = 50 + 50 * math.tanh(ratio * 3.5)
        opportunity_score = round(max(0.0, min(100.0, raw_score)), 2)
    else:
        opportunity_score = 50.0

    return valor_justo_uf, opportunity_score


# ---------------------------------------------------------------------------
# Cap-rate calculation
# ---------------------------------------------------------------------------

def predict_cap_rate(
    property_data: dict,
    avg_arriendo_m2: float,
) -> float:
    """
    Estimate the gross annual cap rate for a venta property.

    Cap rate = (arriendo_mensual_uf * 12) / precio_venta_uf * 100

    If the property already carries an explicit avg_arriendo_m2 estimate the
    monthly rent is derived from that; otherwise the provided avg_arriendo_m2
    parameter (UF per sqm per month for the property's comuna) is used.

    Parameters
    ----------
    property_data  : property dict (tipo_operacion should be "venta")
    avg_arriendo_m2: average monthly UF/sqm for the property's comuna

    Returns
    -------
    cap_rate : float (percentage, e.g. 6.5 means 6.5 %)
               Returns 0.0 if the price is zero or unavailable.
    """
    precio_venta = float(property_data.get("precio_uf", 0))
    if precio_venta <= 0:
        return 0.0

    m2 = float(property_data.get("m2", 60))

    # Use the explicit monthly rent field if available (arriendo properties
    # cross-referenced to a venta comps table), otherwise estimate from m2.
    arriendo_mensual = property_data.get("arriendo_mensual_uf")
    if arriendo_mensual is None or float(arriendo_mensual) <= 0:
        arriendo_mensual = avg_arriendo_m2 * m2

    arriendo_mensual = float(arriendo_mensual)
    cap_rate = (arriendo_mensual * 12) / precio_venta * 100
    return round(cap_rate, 4)


# ---------------------------------------------------------------------------
# Diamond classification
# ---------------------------------------------------------------------------

def is_diamond(score: float, cap_rate: float) -> bool:
    """
    Return True when the property qualifies as a "Diamante" investment.

    Criteria (both must be met):
      - opportunity_score > 80  (significantly undervalued vs. fair value)
      - cap_rate > 6.0 %        (healthy rental yield if converted to arriendo)

    Parameters
    ----------
    score    : opportunity_score (0-100)
    cap_rate : gross annual cap rate in percent

    Returns
    -------
    bool
    """
    return score > 80.0 and cap_rate > 6.0


# ---------------------------------------------------------------------------
# Backwards-compatible wrappers (used by scraper.py)
# ---------------------------------------------------------------------------
import pickle as _pickle

_MODEL_PATH = '/app/ml_model.pkl'
_cached_model = None
_cached_scaler = None


def _load_or_train(properties=None):
    global _cached_model, _cached_scaler
    if _cached_model and _cached_scaler:
        return _cached_model, _cached_scaler
    try:
        with open(_MODEL_PATH, 'rb') as f:
            data = _pickle.load(f)
        _cached_model = data['model']
        _cached_scaler = data['scaler']
        return _cached_model, _cached_scaler
    except Exception:
        if properties:
            m, s = train_model(properties)
            return m, s
        raise


def train_model_compat(properties: list) -> bool:
    global _cached_model, _cached_scaler
    try:
        m, s = train_model(properties)
        _cached_model, _cached_scaler = m, s
        with open(_MODEL_PATH, 'wb') as f:
            _pickle.dump({'model': m, 'scaler': s}, f)
        return True
    except Exception as e:
        logger.warning('train_model_compat failed: %s', e)
        return False


def predict_fair_value_compat(property_data: dict) -> dict:
    precio_lista = float(property_data.get('precio_uf', 0) or 0)
    try:
        m, s = _load_or_train()
        vj, score = predict_fair_value(property_data, m, s)
    except Exception:
        # Heuristic fallback
        factor = 1.06
        vj = round(precio_lista * factor, 1)
        score = 53.0

    if precio_lista > 0:
        dif_pct = round((vj - precio_lista) / precio_lista * 100, 2)
    else:
        dif_pct = 0.0

    return {
        'valor_justo_uf': round(vj, 1),
        'opportunity_score': round(score, 1),
        'precio_lista_uf': round(precio_lista, 1),
        'diferencia_pct': dif_pct,
    }
