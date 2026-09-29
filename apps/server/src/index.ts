import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profiles.js';
import { tagRoutes } from './routes/tags.js';
import { checkInRoutes } from './routes/checkins.js';
import { beanRoutes } from './routes/beans.js';
import { rewardRoutes } from './routes/rewards.js';
import { summaryRoutes } from './routes/summary.js';
import { uploadRoutes } from './routes/uploads.js';
import { questRoutes } from './routes/quests.js';
import { settingsRoutes } from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = Fastify({ logger: true });

  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5180',
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    cookie: { cookieName: 'token', signed: false },
  });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  app.get('/api/health', async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(profileRoutes, { prefix: '/api/profiles' });
  await app.register(tagRoutes, { prefix: '/api/tags' });
  await app.register(checkInRoutes, { prefix: '/api/checkins' });
  await app.register(beanRoutes, { prefix: '/api/beans' });
  await app.register(rewardRoutes, { prefix: '/api/rewards' });
  await app.register(summaryRoutes, { prefix: '/api/summary' });
  await app.register(uploadRoutes, { prefix: '/api/uploads' });
  await app.register(questRoutes, { prefix: '/api/quests' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });

  // Serve web build in production
  const webDist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDist)) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: '/',
      wildcard: false,
    });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html', webDist);
    });
  }

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ port, host });
  console.log(`Server listening on http://${host}:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
