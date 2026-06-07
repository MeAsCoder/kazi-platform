import { prisma } from "@/lib/prisma";

const WEIGHTS = { skill: 0.4, distance: 0.25, rating: 0.2, completion: 0.15 };

export type TradePrediction = {
  trade: string;
  confidence: number;
  ambiguous: boolean;
  alternatives: string[];
  ranked: { trade: string; score: number }[];
};

/** Ask the Python model service to predict the trade from free text. */
export async function predictTrade(text: string): Promise<TradePrediction> {
  const base = process.env.MODEL_SERVICE_URL ?? "http://localhost:8000";
  const res = await fetch(`${base}/predict-trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    // server-to-server; no caching of predictions
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Model service error: ${res.status}`);
  return res.json();
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Predict the trade, pull workers of that trade from Postgres, and rank them by a
 * transparent score (skill + distance + rating + job history). Returns the
 * prediction plus the top-N ranked workers with a per-factor breakdown.
 */
export async function matchWorkers(opts: {
  text: string;
  lat: number;
  lng: number;
  topN?: number;
}) {
  const { text, lat, lng, topN = 5 } = opts;
  const prediction = await predictTrade(text);

  const workers = await prisma.workerProfile.findMany({
    where: { trade: prediction.trade, isAvailable: true, user: { isBanned: false } },
    include: { user: { select: { name: true, phone: true, neighborhood: true, lat: true, lng: true } } },
  });

  const ranked = workers
    .map((w) => {
      const wlat = w.user.lat ?? lat;
      const wlng = w.user.lng ?? lng;
      const dist = haversineKm(lat, lng, wlat, wlng);
      const proximity = Math.exp(-dist / 8);
      const rating = w.ratingCount > 0 ? w.avgRating / 5 : 0.6;
      const completion = w.jobsAccepted > 0 ? w.jobsCompleted / w.jobsAccepted : 0.7;
      const skill = 1.0; // already filtered to the predicted trade

      const score =
        WEIGHTS.skill * skill +
        WEIGHTS.distance * proximity +
        WEIGHTS.rating * rating +
        WEIGHTS.completion * completion;

      return {
        workerId: w.id,
        name: w.user.name,
        phone: w.user.phone,
        trade: w.trade,
        skills: w.skills,
        neighborhood: w.user.neighborhood,
        hourlyRate: w.hourlyRate,
        experienceYears: w.experienceYears,
        avgRating: w.avgRating,
        ratingCount: w.ratingCount,
        availableDays: w.availableDays,
        distanceKm: Math.round(dist * 10) / 10,
        matchPercent: Math.round(score * 1000) / 10,
        breakdown: {
          skill: Math.round(WEIGHTS.skill * skill * 1000) / 1000,
          distance: Math.round(WEIGHTS.distance * proximity * 1000) / 1000,
          rating: Math.round(WEIGHTS.rating * rating * 1000) / 1000,
          completion: Math.round(WEIGHTS.completion * completion * 1000) / 1000,
        },
      };
    })
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, topN);

  return { prediction, workers: ranked };
}
