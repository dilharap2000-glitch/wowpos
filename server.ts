import 'dotenv/config';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import express from 'express';
import { app } from './src/server/app.ts';
import { ensureMongoSeeded } from './src/db/gym-service-mongo.ts';

const PORT = Number(process.env.PORT) || 3000;

// Vite Middleware & Static Serving Setup for local development & standalone server
async function startServer() {
  await ensureMongoSeeded().catch((err) => console.warn('Seeding check note:', err?.message));

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen when running as a standalone node server (container or dev mode)
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Gym SaaS Server running on http://0.0.0.0:${PORT}`);
    });

    // Persistent in-server scheduler for standalone Node.js environments
    import('./src/lib/sms/reminder-service.ts').then(({ ReminderService }) => {
      ReminderService.setupIndexes().catch((err) => console.warn('Reminder indexes setup warning:', err));
      
      // Initial reminder check 15 seconds after startup
      setTimeout(() => {
        ReminderService.processDueReminders().catch((err) => {
          console.warn('Scheduled reminder startup run notice:', err?.message || err);
        });
      }, 15000);

      // Hourly persistent check
      setInterval(() => {
        ReminderService.processDueReminders().catch((err) => {
          console.warn('Scheduled reminder periodic run notice:', err?.message || err);
        });
      }, 60 * 60 * 1000);
    }).catch((e) => console.warn('Reminder service scheduler load note:', e));
  }
}

// In standard dev/production, start server
if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
