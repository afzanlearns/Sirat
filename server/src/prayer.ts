import type { PrayerTimesResult, PrayerTimings } from "./types.js";

/**
 * Real prayer times from the Aladhan API (https://aladhan.com/prayer-times-api).
 * Free, no key required. This is genuine time-sensitive data — never mocked.
 *
 * Results are cached per city+country+method for the current day so we don't
 * hammer the upstream API on every page view.
 */

interface CacheEntry {
  dayKey: string;
  data: PrayerTimesResult;
}
const cache = new Map<string, CacheEntry>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC) — good enough for a daily cache bust
}

/** Aladhan sometimes appends a timezone suffix like "13:07 (BST)" — strip it. */
function clean(time: string): string {
  return (time ?? "").split(" ")[0];
}

export async function getPrayerTimes(
  city: string,
  country: string,
  method = 2
): Promise<PrayerTimesResult | null> {
  const key = `${city.toLowerCase()}|${country.toLowerCase()}|${method}`;
  const cached = cache.get(key);
  const day = todayKey();
  if (cached && cached.dayKey === day) return cached.data;

  if (typeof fetch !== "function") {
    console.error("[prayer] global fetch unavailable — needs Node 18+");
    return null;
  }

  const url =
    `https://api.aladhan.com/v1/timingsByCity` +
    `?city=${encodeURIComponent(city)}` +
    `&country=${encodeURIComponent(country)}` +
    `&method=${method}`;

  try {
    const res = await fetch(url); // fetch follows Aladhan's 302 to the dated URL
    if (!res.ok) {
      console.error(`[prayer] Aladhan returned HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      code: number;
      data?: {
        timings: Record<string, string>;
        date: { readable: string; hijri: { date: string } };
        meta: { timezone: string; method?: { name?: string } };
      };
    };

    if (json.code !== 200 || !json.data) {
      console.error("[prayer] Aladhan payload not OK:", json.code);
      return null;
    }

    const t = json.data.timings;
    const timings: PrayerTimings = {
      Fajr: clean(t.Fajr),
      Sunrise: clean(t.Sunrise),
      Dhuhr: clean(t.Dhuhr),
      Asr: clean(t.Asr),
      Maghrib: clean(t.Maghrib),
      Isha: clean(t.Isha),
    };

    const data: PrayerTimesResult = {
      city,
      country,
      timezone: json.data.meta.timezone,
      gregorianDate: json.data.date.readable,
      hijriDate: json.data.date.hijri.date,
      method: json.data.meta.method?.name ?? `method ${method}`,
      timings,
    };

    cache.set(key, { dayKey: day, data });
    return data;
  } catch (err) {
    console.error("[prayer] fetch failed:", err);
    return null;
  }
}
