import { TripHistory } from '@/models';

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function historicalAvg(routeId: string, fromStop: string, toStop: string, hourOfDay: number) {
  const docs = await TripHistory.find({
    routeId, fromStop, toStop,
    hourOfDay: { $gte: Math.max(0, hourOfDay - 2), $lte: Math.min(23, hourOfDay + 2) },
  }).sort({ recordedAt: -1 }).limit(50).lean();
  if (!docs.length) return null;
  let wSum = 0, wTotal = 0;
  docs.forEach((d: any, i: number) => {
    const w = Math.exp(-i * 0.05);
    wSum += d.actualMinutes * w;
    wTotal += w;
  });
  return { avg: wSum / wTotal, sampleSize: docs.length };
}

export async function predictETA(
  bus: { latitude: number; longitude: number; speed: number },
  targetStop: { latitude: number; longitude: number; name: string },
  routeId: string,
  fromStopName: string,
) {
  const dist = haversine(bus.latitude, bus.longitude, targetStop.latitude, targetStop.longitude);
  const physETA = (dist / Math.max(bus.speed || 0, 5)) * 60;
  const hourOfDay = new Date().getHours();
  const hist = await historicalAvg(routeId, fromStopName, targetStop.name, hourOfDay);

  let etaMinutes: number, confidence: string, method: string;
  if (!hist || hist.sampleSize < 3) {
    etaMinutes = physETA; confidence = 'low'; method = 'physics';
  } else {
    const hw = Math.min(0.8, 0.3 + hist.sampleSize * 0.01);
    etaMinutes = hw * hist.avg + (1 - hw) * physETA;
    confidence = hist.sampleSize >= 20 ? 'high' : 'medium';
    method = 'ml+physics';
  }
  etaMinutes = Math.max(0, Math.round(etaMinutes));
  const arrival = new Date(Date.now() + etaMinutes * 60000);
  return {
    etaMinutes,
    etaFormatted: etaMinutes <= 0 ? 'Arriving now' : etaMinutes < 60 ? `${etaMinutes} min` : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`,
    arrivalTime: arrival.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    confidence, method,
    distanceKm: parseFloat(dist.toFixed(2)),
  };
}

export async function recordSegment(routeId: string, fromStop: string, toStop: string, actualMinutes: number) {
  if (actualMinutes <= 0 || actualMinutes > 300) return;
  const now = new Date();
  await TripHistory.create({ routeId, fromStop, toStop, dayOfWeek: now.getDay(), hourOfDay: now.getHours(), actualMinutes });
}
