import { prisma } from './prisma';

/**
 * Persists a system log entry into the database asynchronously.
 * @param {string} level - Log level ('INFO', 'WARN', 'ERROR')
 * @param {string} category - Log category ('WEBHOOK', 'FLOW', 'API', 'DATABASE', 'AI', 'SYSTEM')
 * @param {string} message - Primary log message
 * @param {any} details - Optional object or string trace with details
 */
export async function logToDb(level, category, message, details = '') {
  try {
    const detailStr = typeof details === 'object' 
      ? JSON.stringify(details, null, 2) 
      : String(details);
      
    // Output to stdout as well
    console.log(`[${level}] [${category}] ${message} ${detailStr ? '- details available' : ''}`);

    // Fire-and-forget: do not await so it does not block execution threads
    prisma.log.create({
      data: {
        level,
        category,
        message,
        details: detailStr
      }
    }).catch(err => {
      console.error('Prisma failed to write log to Database:', err);
    });
  } catch (err) {
    console.error('Error in logToDb utility:', err);
  }
}
