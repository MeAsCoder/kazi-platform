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
    "plumber": [
        "leaking pipe", "fix the tap", "blocked drainage", "burst pipe", "fix my shower head",
        "shower not working", "no water in the house", "toilet repair", "unblock the toilet",
        "broken flush", "water heater not working", "install water tank", "sink not draining",
        "pipe replacement", "geyser leaking", "leaking toilet", "drain unblocking",
        "sewer backup", "faucet replacement", "low water pressure", "overflowing tank",
        "kitchen sink leaking", "bathroom flooding",
    ],
    "electrician": [
        "electrical wiring", "fix the power", "install sockets", "rewire the house",
        "fix my electrical wiring", "lights keep tripping", "no electricity", "install ceiling fan",
        "faulty switch", "circuit breaker tripping", "electrical fault finding", "power surge",
        "install security lights", "stove wiring", "meter installation", "earth leakage problem",
        "wiring fault", "power keeps going off", "install chandelier", "fix the fuse box",
    ],
    "mason": [
        "build a wall", "plastering", "bricklaying", "lay foundation", "tile the floor",
        "wall crack repair", "fix my house foundation", "construct pillars", "floor screeding",
        "install concrete slab", "build a fence", "stone cladding", "bathroom tiling",
        "kitchen wall tiling", "pavement laying", "waterproof the basement", "repair collapsed wall",
        "cabro paving", "septic tank", "skim the wall", "fix cracked plaster", "grout the tiles",
    ],
    "painter": [
        "paint the house", "repaint walls", "exterior painting", "ceiling painting",
        "spray painting", "wallpaper installation", "remove old paint", "paint my fence",
        "textured wall finish", "epoxy floor coating", "paint metal gates", "touch up the paint",
        "colour consultation", "paint my office", "stain wooden doors", "skim coat the walls",
    ],
    "welder": [
        "weld a gate", "make window grills", "metal fabrication", "fix the mabati roof",
        "repair metal door", "weld broken railing", "construct steel shed", "fabricate metal shelves",
        "make security grills", "weld a water tank stand", "metal cutting", "weld a staircase railing",
        "repair farm gates", "iron sheet roof leaking", "fix the gate hinge", "make a steel door",
    ],
    "carpenter": [
        "make furniture", "fix the door", "build cabinets", "kitchen cabinets", "repair wooden bed",
        "install wooden flooring", "build a wardrobe", "make a bookshelf", "repair broken chair",
        "door hanging", "fix squeaky stairs", "wood polishing", "repair window frames",
        "make a dining table", "roof timber and trusses", "install gypsum ceiling", "fit the door frame",
    ],
    "cleaner": [
        "house cleaning", "deep clean", "office cleaning", "carpet shampooing", "window cleaning",
        "move out cleaning", "post construction cleaning", "sofa cleaning", "mattress cleaning",
        "pressure wash the driveway", "gutter cleaning", "kitchen degreasing", "bathroom scrubbing",
        "dusting and vacuuming", "trash removal", "laundry and ironing",
    ],
    "driver": [
        "need a driver", "delivery within town", "airport pickup", "transport goods",
        "personal driver for a day", "drive my car", "school run driver", "rental car driver",
        "pick and drop service", "driver for a wedding", "long distance driver", "drive my truck",
        "taxi service", "motorbike rider for errands",
    ],
    "mechanic": [
        "fix my car", "car engine repair", "brake pad replacement", "oil change",
        "car not starting", "overheating engine", "check engine light", "transmission repair",
        "clutch replacement", "tyre puncture", "suspension repair", "car battery dead",
        "car ac not cold", "alternator repair", "exhaust leak", "wheel alignment", "car service",
        "diagnose car problem", "fix my motorcycle", "car breakdown assistance", "engine tune up",
        "spark plug replacement", "repair my truck",
    ],
    "beautician": [
        "haircut", "blow dry", "hair coloring", "hair styling", "hair braiding", "bridal hair",
        "keratin treatment", "hair straightening", "hair extensions", "beard trim", "kids haircut",
        "manicure", "pedicure", "nail painting", "facial treatment", "makeup application",
        "waxing", "eyebrow threading", "eyelash extension", "bridal makeup", "skin care",
        "men grooming", "hair weaving",
    ],
    "chef": [
        "cook for an event", "private chef", "meal preparation", "catering service",
        "birthday party chef", "wedding catering", "cook traditional food", "baking services",
        "cake maker", "pastry chef", "prepare lunch daily", "cook for my family",
        "continental dishes", "menu planning", "home cook", "cook nyama choma",
    ],
    "gardener": [
        "lawn mowing", "trim the hedges", "plant flowers", "garden cleanup", "tree pruning",
        "weed removal", "install irrigation", "landscaping", "spray pesticide on plants",
        "shrub trimming", "rake the leaves", "plant vegetables", "design my garden",
        "maintain my lawn", "remove dead plants", "fell a tree",
    ],
    "tutor": [
        "home tuition", "math tutor", "english teacher", "science tutor", "online tutor",
        "primary school lessons", "high school lessons", "exam preparation", "coding tutor",
        "language lessons", "swahili tutor", "piano lessons", "homework help", "reading tutor",
        "physics and chemistry tutor", "group tutoring",
    ],
    "nanny": [
        "babysitter", "childcare", "look after my baby", "after school nanny", "live in nanny",
        "part time nanny", "toddler care", "newborn care", "help kids with homework",
        "play with children", "take care of elderly", "nurse for aged parent", "special needs care",
        "daycare assistant", "house help for childcare",
    ],
    "security_guard": [
        "night guard", "protect my property", "security patrol", "gated community guard",
        "watchman", "event security", "mall security", "store watchman", "construction site guard",
        "personal bodyguard", "cctv monitoring", "day guard", "gate security",
    ],
    "pest_control": [
        "exterminate rats", "cockroach treatment", "mosquito fumigation", "termite removal",
        "bed bugs spray", "ants control", "get rid of mice", "flea treatment", "bird control",
        "snake catcher", "pest inspection", "fumigate my house", "spray for pests",
    ],
    "locksmith": [
        "unlock my door", "broken key extraction", "change the locks", "install a padlock",
        "car lockout", "home lockout", "safe unlocking", "rekey the locks", "fix the door latch",
        "security lock installation", "broken lock repair", "duplicate keys",
    ],
    "mover": [
        "relocate my house", "move office furniture", "loading and unloading", "packing service",
        "transport my goods", "shifting services", "move my fridge", "piano movers",
        "household shifting", "cheap movers", "intercity moving", "help me move", "office relocation",
    ],
    "photographer": [
        "wedding photography", "passport photo", "event photographer", "portrait shoot",
        "product photography", "real estate photos", "birthday party photographer", "video coverage",
        "drone photography", "corporate event shoot", "graduation photos", "photo studio session",
    ],
    "tailor": [
        "stitch a dress", "alter my clothes", "repair torn shirt", "make a suit", "uniform sewing",
        "traditional wear", "wedding gown fitting", "hem my pants", "adjust the waist", "replace a zipper",
        "make curtains", "costume design", "mend my trousers", "design an outfit",
    ],
    "appliance_repair": [
        "fix my fridge", "repair the washing machine", "oven not heating", "dryer not working",
        "microwave repair", "dishwasher not draining", "water dispenser repair", "iron box repair",
        "vacuum cleaner service", "tv screen broken", "tv no picture", "repair led tv",
        "television not switching on", "decoder repair", "blender not working", "cooker repair",
    ],
    "computer_technician": [
        "laptop repair", "virus removal", "install windows", "data recovery", "computer not booting",
        "fix my printer", "network setup", "wifi installation", "replace laptop screen", "upgrade the ram",
        "hard drive replacement", "software installation", "slow computer fix", "set up cctv network",
    ],
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


app = FastAPI(title="Kazi Connect Model Service", version="2.1.0")
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
