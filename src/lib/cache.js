import { prisma } from './prisma';

const cacheStore = new Map();

export function getCached(key) {
  const cached = cacheStore.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  
  return cached.value;
}

export function setCached(key, value, ttlMs = 30000) {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

export async function getCachedSettings() {
  const cacheKey = 'system_settings';
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  try {
    const settings = await prisma.setting.findUnique({
      where: { id: 'system' }
    });
    setCached(cacheKey, settings, 60000); // Cache settings for 60 seconds
    return settings;
  } catch (err) {
    console.error('Error fetching settings for cache:', err);
    return null;
  }
}

export async function getCachedActiveFlows() {
  const cacheKey = 'active_flows';
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  try {
    const activeFlows = await prisma.flow.findMany({
      where: { isActive: true }
    });
    setCached(cacheKey, activeFlows, 30000); // Cache active flows list for 30 seconds
    return activeFlows;
  } catch (err) {
    console.error('Error fetching active flows for cache:', err);
    return [];
  }
}
