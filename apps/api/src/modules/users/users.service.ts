import type { Role } from '@prisma/client';
import type {
  ChangePasswordInput,
  CreateStaffInput,
  PaginationMeta,
  SessionInfo,
  UpdateProfileInput,
  UpdateUserInput,
  UserListItem,
  UserListQuery,
} from '@fixmycity/shared';
import { prisma, type Prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/crypto.js';
import { AppError, conflict, forbidden, notFound, validationError } from '../../lib/errors.js';
import { pageMeta } from '../../lib/http.js';
import { sessionUserDto } from '../../lib/mappers.js';
import type { AuthUser } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import { refreshUserRooms } from '../../sockets/index.js';

const userInclude = {
  memberships: { select: { departmentId: true, department: { select: { id: true, code: true, name: true } } } },
} as const;

/* ------------------------------------------------------------------ */
/* Self-service                                                        */
/* ------------------------------------------------------------------ */

export async function updateProfile(user: AuthUser, input: UpdateProfileInput, ip: string | null) {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: input.name, phone: input.phone || null, ward: input.ward || null },
    include: userInclude,
  });
  await audit({ actorId: user.id, action: 'user.profile_updated', entityType: 'user', entityId: user.id, ipAddress: ip });
  return sessionUserDto(updated);
}

export async function changePassword(user: AuthUser, currentSessionId: string | undefined, input: ChangePasswordInput, ip: string | null) {
  const valid = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!valid) throw validationError('Your current password is incorrect.', { currentPassword: 'Your current password is incorrect.' });
  if (input.currentPassword === input.newPassword) {
    throw validationError('Choose a password different from the current one.', { newPassword: 'Choose a different password.' });
  }
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Keep this device signed in, sign out every other session.
    prisma.session.deleteMany({ where: { userId: user.id, ...(currentSessionId ? { id: { not: currentSessionId } } : {}) } }),
  ]);
  await audit({ actorId: user.id, action: 'user.password_changed', entityType: 'user', entityId: user.id, ipAddress: ip });
}

export async function listSessions(user: AuthUser, currentSessionId: string | undefined): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
  });
  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    current: s.id === currentSessionId,
  }));
}

export async function revokeSession(user: AuthUser, sessionId: string, ip: string | null) {
  const result = await prisma.session.deleteMany({ where: { id: sessionId, userId: user.id } });
  if (result.count === 0) throw notFound('Session');
  await audit({ actorId: user.id, action: 'user.session_revoked', entityType: 'session', entityId: sessionId, ipAddress: ip });
}

/* ------------------------------------------------------------------ */
/* Administration                                                      */
/* ------------------------------------------------------------------ */

export async function listUsers(query: UserListQuery): Promise<{ data: UserListItem[]; meta: PaginationMeta }> {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }] }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { ...userInclude, _count: { select: { complaints: true } } },
      orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    data: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      isActive: u.isActive,
      departments: u.memberships.map((m) => m.department),
      complaintCount: u._count.complaints,
      createdAt: u.createdAt.toISOString(),
    })),
    meta: pageMeta(query.page, query.pageSize, total),
  };
}

/** Only super admins may create or promote administrators. */
function assertCanGrant(actor: AuthUser, role: Role) {
  if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && actor.role !== 'SUPER_ADMIN') {
    throw forbidden('Only a super admin can grant administrator access.');
  }
  if (role === 'SUPER_ADMIN') throw forbidden('Super admin accounts cannot be created through the application.');
}

export async function createStaff(actor: AuthUser, input: CreateStaffInput, ip: string | null) {
  assertCanGrant(actor, input.role);
  if (input.role === 'DEPARTMENT_OFFICER' && !input.departmentId) {
    throw validationError('Choose a department for the officer.', { departmentId: 'Choose a department for the officer.' });
  }
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw conflict('An account with this email already exists.', 'EMAIL_TAKEN');
  if (input.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!dept) throw validationError('Department not found.', { departmentId: 'Department not found.' });
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        ...(input.role === 'DEPARTMENT_OFFICER' && input.departmentId
          ? { memberships: { create: { departmentId: input.departmentId } } }
          : {}),
      },
      include: userInclude,
    });
    await audit(
      { actorId: actor.id, action: 'user.staff_created', entityType: 'user', entityId: created.id, metadata: { role: created.role, email: created.email }, ipAddress: ip },
      tx,
    );
    return created;
  });
  return sessionUserDto(user);
}

export async function updateUser(actor: AuthUser, id: string, input: UpdateUserInput, ip: string | null) {
  if (id === actor.id && (input.role !== undefined || input.isActive === false)) {
    throw new AppError(422, 'SELF_MODIFICATION', 'You cannot change your own role or deactivate your own account.');
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound('User');
  if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') throw forbidden();
  if ((target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') && actor.role !== 'SUPER_ADMIN') {
    throw forbidden('Only a super admin can modify administrator accounts.');
  }
  if (input.role) assertCanGrant(actor, input.role);

  const nextRole = input.role ?? target.role;
  if (input.departmentIds && nextRole !== 'DEPARTMENT_OFFICER' && input.departmentIds.length > 0) {
    throw validationError('Only department officers can belong to departments.', { departmentIds: 'Only officers belong to departments.' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.departmentIds || (input.role && input.role !== 'DEPARTMENT_OFFICER')) {
      await tx.departmentMembership.deleteMany({ where: { userId: id } });
      if (nextRole === 'DEPARTMENT_OFFICER' && input.departmentIds?.length) {
        await tx.departmentMembership.createMany({ data: input.departmentIds.map((departmentId) => ({ userId: id, departmentId })) });
      }
    }
    const user = await tx.user.update({
      where: { id },
      data: { ...(input.role ? { role: input.role } : {}), ...(input.isActive !== undefined ? { isActive: input.isActive } : {}) },
      include: userInclude,
    });
    // Deactivation and role changes end existing sessions immediately.
    if (input.isActive === false || (input.role && input.role !== target.role)) {
      await tx.session.deleteMany({ where: { userId: id } });
    }
    await audit(
      {
        actorId: actor.id,
        action: 'user.updated',
        entityType: 'user',
        entityId: id,
        metadata: { from: { role: target.role, isActive: target.isActive }, to: { role: user.role, isActive: user.isActive }, departmentIds: input.departmentIds ?? null },
        ipAddress: ip,
      },
      tx,
    );
    return user;
  });
  await refreshUserRooms(id);
  return sessionUserDto(updated);
}
