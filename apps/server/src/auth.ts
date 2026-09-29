import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { prisma } from './db.js';

export const PARENT_TTL_SEC = 5 * 60;

export type AuthUser = {
  id: string;
  email: string;
  familyId: string;
};

export type ParentPayload = {
  type: 'parent';
  familyId: string;
  userId: string;
  pinEpoch: number;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; familyId: string } | ParentPayload;
    user: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<{ id: string; email: string; familyId: string }>();
    if ('type' in decoded && (decoded as { type?: string }).type === 'parent') {
      return reply.status(401).send({ error: '未登录' });
    }
    request.user = {
      id: decoded.id,
      email: decoded.email,
      familyId: decoded.familyId,
    };
  } catch {
    return reply.status(401).send({ error: '未登录' });
  }
}

export async function assertProfileAccess(userId: string, profileId: string) {
  const profile = await prisma.profile.findFirst({
    where: {
      id: profileId,
      family: { members: { some: { userId } } },
    },
  });
  return profile;
}

export async function getParentStatus(app: FastifyInstance, request: FastifyRequest, familyId: string) {
  const family = await prisma.family.findUniqueOrThrow({ where: { id: familyId } });
  const hasPin = Boolean(family.pinHash);
  let unlocked = !hasPin;
  let expiresAt: string | null = null;

  const token = request.cookies.parentToken;
  if (hasPin && token) {
    try {
      const payload = app.jwt.verify<ParentPayload>(token);
      if (
        payload.type === 'parent' &&
        payload.familyId === familyId &&
        (payload.pinEpoch ?? 0) === family.pinEpoch
      ) {
        unlocked = true;
        const decoded = app.jwt.decode(token) as { exp?: number } | null;
        if (decoded?.exp) expiresAt = new Date(decoded.exp * 1000).toISOString();
      }
    } catch {
      unlocked = false;
    }
  }

  return { hasPin, unlocked, expiresAt };
}

/** Allow writes if family has no PIN yet, or a valid parentToken cookie is present. */
export async function requireParent(request: FastifyRequest, reply: FastifyReply) {
  const familyId = request.user?.familyId;
  if (!familyId) {
    return reply.status(401).send({ error: '未登录' });
  }

  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) {
    return reply.status(401).send({ error: '家庭不存在' });
  }

  // No PIN configured yet — allow (frontend will prompt setup)
  if (!family.pinHash) {
    return;
  }

  const token = request.cookies.parentToken;
  if (!token) {
    return reply.status(403).send({ error: '需要家长解锁', code: 'PARENT_LOCK' });
  }

  try {
    const app = request.server;
    const payload = app.jwt.verify<ParentPayload>(token);
    if (
      payload.type !== 'parent' ||
      payload.familyId !== familyId ||
      (payload.pinEpoch ?? 0) !== family.pinEpoch
    ) {
      return reply.status(403).send({ error: '需要家长解锁', code: 'PARENT_LOCK' });
    }
  } catch {
    return reply.status(403).send({ error: '家长解锁已过期', code: 'PARENT_LOCK' });
  }
}

export function setParentCookie(
  reply: FastifyReply,
  app: FastifyInstance,
  userId: string,
  familyId: string,
  pinEpoch: number
) {
  const token = app.jwt.sign(
    { type: 'parent', familyId, userId, pinEpoch } satisfies ParentPayload,
    { expiresIn: PARENT_TTL_SEC }
  );
  reply.setCookie('parentToken', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: PARENT_TTL_SEC,
  });
  return new Date(Date.now() + PARENT_TTL_SEC * 1000).toISOString();
}

export function clearParentCookie(reply: FastifyReply) {
  reply.clearCookie('parentToken', { path: '/' });
  reply.setCookie('parentToken', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    expires: new Date(0),
    maxAge: 0,
  });
}
