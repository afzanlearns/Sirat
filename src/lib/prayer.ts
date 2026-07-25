import { useState, useEffect } from "react";

import { API_BASE as API } from "./api";

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface PrayerTimesData {
  city: string;
  country: string;
  timezone: string;
  gregorianDate: string;
  hijriDate: string;
  method: string;
  timings: PrayerTimings;
}

export interface NextPrayer {
  name: keyof PrayerTimings;
  time: string;
  secondsUntil: number;
}

/** The five daily prayers, in order (Sunrise is shown but not a prayer). */
export const PRAYER_ORDER: (keyof PrayerTimings)[] = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

export interface StoredLocation {
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

// ── Location persistence ───────────────────────────────────────────────────────
export function getStoredLocation(): StoredLocation {
  const latStr = localStorage.getItem("sirat_lat");
  const lngStr = localStorage.getItem("sirat_lng");
  return {
    city: localStorage.getItem("sirat_city") || "Mumbai",
    country: localStorage.getItem("sirat_country") || "India",
    latitude: latStr ? Number(latStr) : null,
    longitude: lngStr ? Number(lngStr) : null,
  };
}

export function storeLocation(
  city: string,
  country: string,
  latitude?: number | null,
  longitude?: number | null
): void {
  localStorage.setItem("sirat_city", city);
  localStorage.setItem("sirat_country", country);
  if (latitude !== undefined && latitude !== null) {
    localStorage.setItem("sirat_lat", String(latitude));
  } else {
    localStorage.removeItem("sirat_lat");
  }
  if (longitude !== undefined && longitude !== null) {
    localStorage.setItem("sirat_lng", String(longitude));
  } else {
    localStorage.removeItem("sirat_lng");
  }
}

// ── Fetch ──────────────────────────────────────────────────────────────────────
export async function fetchPrayerTimes(
  city?: string,
  country?: string,
  latitude?: number | null,
  longitude?: number | null
): Promise<PrayerTimesData | null> {
  try {
    let url = `${API}/prayer-times`;
    if (typeof latitude === "number" && typeof longitude === "number") {
      url += `?latitude=${latitude}&longitude=${longitude}`;
    } else {
      url += `?city=${encodeURIComponent(city || "Mumbai")}&country=${encodeURIComponent(country || "India")}`;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as PrayerTimesData;
  } catch {
    return null;
  }
}

// ── Next-prayer computation (timezone-correct) ─────────────────────────────────
function hmToSec(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 3600 + m * 60;
}

/** Current seconds-since-midnight in the timings' own timezone (not the device's). */
function nowSecondsInTz(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return get("hour") * 3600 + get("minute") * 60 + get("second");
}

export function computeNextPrayer(
  timings: PrayerTimings,
  timezone: string
): NextPrayer {
  const now = nowSecondsInTz(timezone);
  for (const name of PRAYER_ORDER) {
    const sec = hmToSec(timings[name]);
    if (sec > now) return { name, time: timings[name], secondsUntil: sec - now };
  }
  // Past Isha → next is Fajr tomorrow
  return {
    name: "Fajr",
    time: timings.Fajr,
    secondsUntil: 24 * 3600 - now + hmToSec(timings.Fajr),
  };
}

export function formatCountdown(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** Ticks every second, recomputing the next prayer from the live clock. */
export function useNextPrayer(data: PrayerTimesData | null): NextPrayer | null {
  const [next, setNext] = useState<NextPrayer | null>(null);
  useEffect(() => {
    if (!data) {
      setNext(null);
      return;
    }
    const update = () => setNext(computeNextPrayer(data.timings, data.timezone));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [data]);
  return next;
}
