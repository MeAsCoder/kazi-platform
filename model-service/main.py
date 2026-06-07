"""Kazi Connect — model service.

The ONLY Python component in production. Exposes the trained trade classifier over
HTTP so the Next.js app can predict a trade from a free-text job request. All data,
ranking and business logic live in the Next.js app; this service does ML only.

Endpoints:
  GET  /health         -> liveness + which model is loaded
  POST /predict-trade  -> {text} -> {trade, confidence, ambiguous, alternatives, ranked}
"""
import os
import random
import re

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------- vocabulary
# Single source of truth for the synthetic trades corpus (mirrors train.py).
TRADE_VOCAB = {
    "plumber": ["leaking pipe", "fix the tap", "blocked drainage", "burst pipe",
                "install water tank", "sink not draining", "toilet repair", "no water",
                "water heater not working", "shower not working", "sewer blockage",
                "fix the cistern", "kitchen sink leaking", "water meter leaking"],
    "electrician": ["electrical wiring", "fix the power", "install sockets",
                    "rewire the house", "circuit breaker tripping", "solar installation",
                    "no electricity", "fix the lights", "install security lights",
                    "power keeps going off", "fix the electricity meter",
                    "install ceiling fan", "wiring fault", "install water heater wiring"],
    "mason": ["build a wall", "plastering", "bricklaying", "lay foundation",
              "concrete slab", "perimeter wall", "construction work", "fix the roof",
              "leaking roof", "roof repair", "waterproof the roof", "ceiling leaking",
              "fix cracked wall", "tiling the floor", "cabro paving", "septic tank",
              "concrete roof leaking"],
    "painter": ["paint the house", "repaint walls", "wall finishing", "exterior painting",
                "waterproof coating", "decorate the room", "paint the gate",
                "ceiling painting", "skim coat the walls", "repaint the office"],
    "welder": ["weld a gate", "make window grills", "metal fabrication", "steel door",
               "repair the gate", "fabricate a staircase", "mabati roofing",
               "iron sheet roof leaking", "fix the gate hinge", "make a metal door",
               "welding the fence", "fix the mabati roof"],
    "carpenter": ["make furniture", "fix the door", "build cabinets", "wood finishing",
                  "kitchen cabinets", "repair the wardrobe", "roof timber", "roof trusses",
                  "fix the ceiling boards", "install gypsum ceiling", "make a bed",
                  "fix wooden floor", "fit the door frame", "wooden roof leaking"],
    "cleaner": ["house cleaning", "deep clean", "office cleaning", "laundry and ironing",
                "post construction cleaning", "fumigation", "sofa cleaning",
                "carpet cleaning", "move out cleaning", "garden cleaning"],
    "driver": ["need a driver", "delivery within town", "school run", "airport pickup",
               "moving house items", "transport goods", "personal driver",
               "pick up luggage", "moving to a new house"],
}

AMBIGUITY_GAP = 0.6
AMBIGUITY_CONF = 0.6
_MODEL = None


def _clean(t: str) -> str:
    t = str(t).lower()
    t = re.sub(r"http\S+|www\.\S+", " ", t)
    t = re.sub(r"<.*?>", " ", t)
    t = re.sub(r"[^a-z\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _train_fallback():
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import Pipeline
    from sklearn.svm import LinearSVC
    locs = ["Kasarani", "Umoja", "Westlands", "Embakasi", "Kibera", "Donholm"]
    times = ["tomorrow morning", "this weekend", "today", "next week", "urgently"]
    rng = random.Random(42)
    X, y = [], []
    for trade, phrases in TRADE_VOCAB.items():
        for _ in range(180):
            p, loc, t = rng.choice(phrases), rng.choice(locs), rng.choice(times)
            post = rng.choice([f"Need a {trade} in {loc} to {p} {t}.",
                               f"Looking for someone to {p} in {loc} {t}.",
                               f"{p} {t} in {loc}, who can help?",
                               f"my {p} please come to {loc} {t}"])
            X.append(_clean(post)); y.append(trade)
    pipe = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2,
                                               sublinear_tf=True, stop_words="english")),
                     ("clf", LinearSVC(class_weight="balanced"))])
    pipe.fit(X, y)
    return pipe


def _load_model():
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    path = os.environ.get("TRADE_MODEL_PATH", "trade_classifier.joblib")
    if os.path.exists(path):
        _MODEL = joblib.load(path)
    else:
        _MODEL = _train_fallback()
    return _MODEL


# ---------------------------------------------------------------- API
class PredictIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


app = FastAPI(title="Kazi Connect Model Service", version="1.0.0")

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
    using_artifact = os.path.exists(os.environ.get("TRADE_MODEL_PATH",
                                                    "trade_classifier.joblib"))
    return {"status": "ok", "model": "artifact" if using_artifact else "synthetic-fallback"}


@app.post("/predict-trade")
def predict_trade(payload: PredictIn):
    model = _load_model()
    cleaned = _clean(payload.text)
    pred = str(model.predict([cleaned])[0])
    scores = model.decision_function([cleaned])[0]
    classes = model.named_steps["clf"].classes_
    order = np.argsort(scores)[::-1]
    conf = float(1 / (1 + np.exp(-scores[order[0]])))
    ranked = [{"trade": str(classes[i]), "score": round(float(scores[i]), 3)} for i in order]
    gap = float(scores[order[0]] - scores[order[1]]) if len(order) > 1 else 99.0
    ambiguous = bool(conf < AMBIGUITY_CONF or gap < AMBIGUITY_GAP)
    return {"trade": pred, "confidence": round(conf, 3), "ambiguous": ambiguous,
            "gap": round(gap, 3), "alternatives": [r["trade"] for r in ranked[1:3]],
            "ranked": ranked}
