import Redis from 'ioredis';

let redis = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
    redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  } catch (err) {
    console.error('Failed to initialize Redis:', err);
  }
} else {
  console.log('REDIS_URL is not set. Falling back to in-memory lock.');
}

export { redis };
