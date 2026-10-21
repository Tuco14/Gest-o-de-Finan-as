import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import healthHandler from './api/health.ts';
import chatHandler from './api/chat.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint (reutiliza o handler serverless)
  app.get('/api/health', (req, res) => {
    return healthHandler(req, res);
  });

  // Financial Chatbot endpoint powered by Gemini (reutiliza o handler serverless)
  app.post('/api/chat', (req, res) => {
    return chatHandler(req, res);
  });

  // Mount Vite middleware in dev or serve dist in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

async function startServer() {
  // Evita inicializar listener em ambientes serverless (como Vercel)
  if (process.env.VERCEL) {
    return;
  }

  const PORT = Number(process.env.PORT) || 3000;
  const app = await createApp();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinControl Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
