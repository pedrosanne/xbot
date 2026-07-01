const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Enabling pg_cron...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_cron;');
    
    console.log('Enabling pg_net...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_net;');
    
    console.log('Unscheduling existing cron...');
    try {
      await prisma.$executeRawUnsafe("SELECT cron.unschedule('xbot-flow-timeout');");
    } catch (e) {
      console.log('No existing cron to unschedule.');
    }
    
    console.log('Scheduling new cron...');
    const url = 'https://xbotting.com.br/api/cron/flow-timeout';
    const authHeader = 'Bearer xbot_supabase_cron_5599';
    
    const query = `
      SELECT cron.schedule(
        'xbot-flow-timeout',
        '*/5 * * * *',
        $$
        SELECT net.http_get(
          url := '${url}',
          headers := '{"Authorization": "${authHeader}"}'
        );
        $$
      );
    `;
    
    await prisma.$executeRawUnsafe(query);
    console.log('Cron configured successfully with authentication!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
