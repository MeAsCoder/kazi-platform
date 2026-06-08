"""Kazi Connect — model service.

The ONLY Python component in production. Exposes the trained trade classifier over
HTTP so the Next.js app can predict the trade(s) from a free-text job request. All
data, ranking and business logic live in the Next.js app; this service does ML only.

Endpoints:
  GET  /health         -> liveness + which model is loaded
  POST /predict-trade  -> {text} -> {trade, trades, confidence, ambiguous, alternatives, ranked}

Model formats supported
-----------------------
1. MULTI-LABEL (current): artifact is a dict
     {"pipeline": <Pipeline with predict_proba>, "labels": [...], "multilabel": True}
   A request can map to several trades (e.g. "fix my appliances and my shower head" ->
   electrician + plumber). We return the primary trade plus any co-trades above
   threshold. Probabilities are calibrated, so confidence is meaningful.
2. LEGACY single-label: artifact is a bare fitted Pipeline (LinearSVC). Kept working
   so an old joblib still loads; uses a softmax over margins and a closeness filter.
"""
import os
import random
import re

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------- vocabulary (fallback only)
TRADE_VOCAB = {
    "plumber": ["leaking pipe", "fix the tap", "blocked drainage", "burst pipe",
                "fix my shower head", "shower not working", "no water", "toilet repair"],
    "electrician": ["electrical wiring", "fix the power", "install sockets", "rewire the house",
                    "fix my electrical appliances", "lights keep tripping", "no electricity"],
    "mason": ["build a wall", "plastering", "bricklaying", "lay foundation", "tiling the floor"],
    "painter": ["paint the house", "repaint walls", "exterior painting", "ceiling painting"],
    "welder": ["weld a gate", "make window grills", "metal fabrication", "fix the mabati roof"],
    "carpenter": ["make furniture", "fix the door", "build cabinets", "kitchen cabinets"],
    "cleaner": ["house cleaning", "deep clean", "office cleaning", "fumigation"],
    "driver": ["need a driver", "delivery within town", "airport pickup", "transport goods"],
}

# ---------------------------------------------------------------- tunables
PRIMARY_THRESHOLD = 0.45   # a trade is "matched" if its calibrated probability >= this
CO_TRADE_THRESHOLD = 0.40  # a secondary trade is surfaced as an alternative if >= this
# legacy (bare LinearSVC) closeness controls
ALT_MARGIN = 0.8
AMBIGUITY_GAP = 0.8

_MODEL = None


def _clean(t: str) -> str:
    t = str(t).lower()
    t = re.sub(r"http\S+|www\.\S+", " ", t)
    t = re.sub(r"<.*?>", " ", t)
    t = re.sub(r"[^a-z\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _train_fallback():
    """Tiny multi-label fallback if no artifact is present (keeps the service alive)."""
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.multiclass import OneVsRestClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import MultiLabelBinarizer
    from sklearn.svm import LinearSVC

    locs = ["Kasarani", "Umoja", "Westlands", "Embakasi", "Kibera", "Donholm"]
    rng = random.Random(42)
    trades = list(TRADE_VOCAB)
    X, Y = [], []
    for trade, phrases in TRADE_VOCAB.items():
        for _ in range(120):
            p, loc = rng.choice(phrases), rng.choice(locs)
            X.append(_clean(rng.choice([f"need someone to {p} in {loc}",
                                        f"{p} in {loc} who can help", f"please {p}"])))
            Y.append([trade])
    for _ in range(400):
        ta, tb = rng.sample(trades, 2)
        pa, pb = rng.choice(TRADE_VOCAB[ta]), rng.choice(TRADE_VOCAB[tb])
        X.append(_clean(f"need someone to {pa} and also {pb}"))
        Y.append([ta, tb])

    mlb = MultiLabelBinarizer()
    Ybin = mlb.fit_transform(Y)
    pipe = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2,
                                               sublinear_tf=True, stop_words="english")),
                     ("clf", OneVsRestClassifier(CalibratedClassifierCV(
                         LinearSVC(class_weight="balanced"), cv=3)))])
    pipe.fit(X, Ybin)
    return {"pipeline": pipe, "labels": list(mlb.classes_), "multilabel": True}


def _load_model():
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    path = os.environ.get("TRADE_MODEL_PATH", "trade_classifier.joblib")
    _MODEL = joblib.load(path) if os.path.exists(path) else _train_fallback()
    return _MODEL


def _predict_multilabel(artifact, cleaned):
    pipe, labels = artifact["pipeline"], artifact["labels"]
    proba = np.asarray(pipe.predict_proba([cleaned])[0], dtype=float)
    order = np.argsort(proba)[::-1]
    ranked = [{"trade": str(labels[i]), "score": round(float(proba[i]), 3)} for i in order]

    primary = str(labels[order[0]])
    top = float(proba[order[0]])
    # all trades clearly matched (multi-trade requests light up >1)
    matched = [str(labels[i]) for i in order if float(proba[i]) >= PRIMARY_THRESHOLD]
    if not matched:
        matched = [primary]
    # co-trades = matched trades other than the primary, or near-miss runners-up
    alternatives = [t for t in matched if t != primary]
    if not alternatives and len(order) > 1 and float(proba[order[1]]) >= CO_TRADE_THRESHOLD:
        alternatives = [str(labels[order[1]])]

    ambiguous = bool(len(alternatives) > 0)
    return {"trade": primary, "trades": matched, "confidence": round(top, 3),
            "ambiguous": ambiguous, "alternatives": alternatives[:2], "ranked": ranked}


def _predict_legacy(model, cleaned):
    pred = str(model.predict([cleaned])[0])
    scores = np.asarray(model.decision_function([cleaned])[0], dtype=float)
    try:
        labels = model.named_steps["clf"].classes_
    except (KeyError, AttributeError):
        labels = model.classes_
    order = np.argsort(scores)[::-1]
    top = float(scores[order[0]])
    gap = top - (float(scores[order[1]]) if len(order) > 1 else top - 99.0)
    exp = np.exp(scores - np.max(scores))
    probs = exp / exp.sum()
    conf = float(probs[order[0]])
    ranked = [{"trade": str(labels[i]), "score": round(float(scores[i]), 3)} for i in order]
    alternatives = [str(labels[i]) for i in order[1:] if (top - float(scores[i])) <= ALT_MARGIN][:1]
    ambiguous = bool(gap < AMBIGUITY_GAP and len(alternatives) > 0)
    return {"trade": pred, "trades": [pred] + alternatives, "confidence": round(conf, 3),
            "ambiguous": ambiguous, "alternatives": alternatives, "ranked": ranked}


# ---------------------------------------------------------------- API
class PredictIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


app = FastAPI(title="Kazi Connect Model Service", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get(
        "ALLOWED_ORIGINS", "http://localhost:3000").split(",")],
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
def _warm():
    _load_model()


@app.get("/health")
def health():
    art = _load_model()
    multilabel = isinstance(art, dict) and art.get("multilabel")
    using_artifact = os.path.exists(os.environ.get("TRADE_MODEL_PATH", "trade_classifier.joblib"))
    return {"status": "ok",
            "model": "artifact" if using_artifact else "synthetic-fallback",
            "mode": "multi-label" if multilabel else "single-label"}


@app.post("/predict-trade")
def predict_trade(payload: PredictIn):
    art = _load_model()
    cleaned = _clean(payload.text)
    if isinstance(art, dict) and art.get("multilabel"):
        return _predict_multilabel(art, cleaned)
    return _predict_legacy(art, cleaned)
