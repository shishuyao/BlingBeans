import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { authenticate, requireParent } from '../auth.js';

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post('/', { preHandler: requireParent }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: '请选择图片' });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(data.mimetype)) {
      return reply.status(400).send({ error: '仅支持 JPG/PNG/WebP/GIF' });
    }

    const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
    fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(data.filename) || '.jpg';
    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    const buffer = await data.toBuffer();
    if (buffer.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ error: '图片不能超过 5MB' });
    }
    fs.writeFileSync(filepath, buffer);

    return { url: `/uploads/${filename}` };
  });
}
