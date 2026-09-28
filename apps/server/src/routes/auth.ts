import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { DEFAULT_TAGS, TAG_COLORS } from '@guoguo/shared';
import { authenticate, getParentStatus, setParentCookie, clearParentCookie } from '../auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        familyName: z.string().min(1).optional(),
        profileName: z.string().min(1).optional(),
      })
      .parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(400).send({ error: '该邮箱已注册' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const familyName = body.familyName ?? `${body.name}的家庭`;
    const profileName = body.profileName ?? '孩子';

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: body.email, passwordHash, name: body.name },
      });
      const family = await tx.family.create({ data: { name: familyName } });
      await tx.familyMember.create({
        data: { userId: user.id, familyId: family.id, role: 'owner' },
      });
      const profile = await tx.profile.create({
        data: {
          familyId: family.id,
          name: profileName,
          avatarColor: TAG_COLORS[0],
          sortOrder: 0,
        },
      });
      await tx.beanBalance.create({ data: { profileId: profile.id } });
      await tx.behaviorTag.createMany({
        data: DEFAULT_TAGS.map((t, i) => ({
          profileId: profile.id,
          name: t.name,
          color: t.color,
          beansOnComplete: t.beansOnComplete,
          sortOrder: i,
        })),
      });
      return { user, family, profile };
    });

    const token = app.jwt.sign({
      id: result.user.id,
      email: result.user.email,
      familyId: result.family.id,
    });

    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    return {
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      familyId: result.family.id,
      profile: result.profile,
    };
  });

  app.post('/login', async (request, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { memberships: true },
    });
    if (!user) {
      return reply.status(401).send({ error: '邮箱或密码错误' });
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: '邮箱或密码错误' });
    }

    const familyId = user.memberships[0]?.familyId;
    if (!familyId) {
      return reply.status(500).send({ error: '账号未关联家庭' });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, familyId });
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      familyId,
    };
  });

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    reply.clearCookie('parentToken', { path: '/' });
    return { ok: true };
  });

  app.get('/me', { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.id },
      include: {
        memberships: {
          include: {
            family: {
              include: {
                profiles: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    });
    const membership = user.memberships[0];
    const pinStatus = membership
      ? await getParentStatus(app, request, membership.familyId)
      : { hasPin: false, unlocked: true, expiresAt: null };
    return {
      user: { id: user.id, email: user.email, name: user.name },
      familyId: membership?.familyId,
      familyName: membership?.family.name,
      profiles: membership?.family.profiles ?? [],
      pin: pinStatus,
    };
  });

  const pinSchema = z.string().regex(/^\d{4}$/, '请输入4位数字');

  app.get('/pin/status', { preHandler: authenticate }, async (request) => {
    return getParentStatus(app, request, request.user.familyId);
  });

  app.post('/pin/setup', { preHandler: authenticate }, async (request, reply) => {
    const body = z
      .object({
        pin: pinSchema,
        oldPin: z.string().regex(/^\d{4}$/).optional(),
      })
      .parse(request.body);

    const family = await prisma.family.findUniqueOrThrow({
      where: { id: request.user.familyId },
    });

    if (family.pinHash) {
      if (!body.oldPin) {
        return reply.status(400).send({ error: '请输入旧 PIN' });
      }
      const ok = await bcrypt.compare(body.oldPin, family.pinHash);
      if (!ok) {
        return reply.status(400).send({ error: '旧 PIN 不正确' });
      }
    }

    const pinHash = await bcrypt.hash(body.pin, 10);
    await prisma.family.update({
      where: { id: family.id },
      data: { pinHash },
    });

    const expiresAt = setParentCookie(reply, app, request.user.id, family.id);
    return { ok: true, hasPin: true, unlocked: true, expiresAt };
  });

  app.post('/pin/unlock', { preHandler: authenticate }, async (request, reply) => {
    const body = z.object({ pin: pinSchema }).parse(request.body);
    const family = await prisma.family.findUniqueOrThrow({
      where: { id: request.user.familyId },
    });

    if (!family.pinHash) {
      return reply.status(400).send({ error: '尚未设置家长 PIN', code: 'NO_PIN' });
    }

    const ok = await bcrypt.compare(body.pin, family.pinHash);
    if (!ok) {
      return reply.status(401).send({ error: 'PIN 不正确' });
    }

    const expiresAt = setParentCookie(reply, app, request.user.id, family.id);
    return { ok: true, hasPin: true, unlocked: true, expiresAt };
  });

  app.post('/pin/lock', { preHandler: authenticate }, async (_request, reply) => {
    clearParentCookie(reply);
    return { ok: true, unlocked: false };
  });
}
