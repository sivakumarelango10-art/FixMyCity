import type { CreateDepartmentInput, DepartmentDto, UpdateDepartmentInput } from '@fixmycity/shared';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound } from '../../lib/errors.js';
import { audit } from '../../services/audit.js';

export async function listPublicDepartments() {
  const rows = await prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  return rows.map((d) => ({ id: d.id, code: d.code, name: d.name, description: d.description, contactEmail: d.contactEmail }));
}

export async function listDepartmentsWithStats(): Promise<DepartmentDto[]> {
  const [departments, grouped] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        memberships: {
          where: { user: { role: 'DEPARTMENT_OFFICER' } },
          include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
        },
      },
    }),
    prisma.complaint.groupBy({ by: ['assignedDepartmentId', 'currentStatus'], where: { assignedDepartmentId: { not: null } }, _count: { _all: true } }),
  ]);

  return departments.map((d) => {
    const mine = grouped.filter((g) => g.assignedDepartmentId === d.id);
    const count = (...statuses: string[]) => mine.filter((g) => statuses.includes(g.currentStatus)).reduce((s, g) => s + g._count._all, 0);
    return {
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      contactEmail: d.contactEmail,
      active: d.active,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      stats: {
        open: count('ASSIGNED', 'IN_PROGRESS', 'REOPENED'),
        inProgress: count('IN_PROGRESS'),
        resolved: count('RESOLVED'),
        officers: d.memberships.filter((m) => m.user.isActive).length,
      },
      officers: d.memberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email })),
    };
  });
}

export async function createDepartment(actorId: string, input: CreateDepartmentInput, ip: string | null) {
  const clash = await prisma.department.findFirst({ where: { OR: [{ code: input.code }, { name: input.name }] } });
  if (clash) throw conflict('A department with this name or code already exists.');
  return prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({
      data: { name: input.name, code: input.code, description: input.description, contactEmail: input.contactEmail || null, active: input.active },
    });
    await audit({ actorId, action: 'department.created', entityType: 'department', entityId: dept.id, metadata: { name: dept.name, code: dept.code }, ipAddress: ip }, tx);
    return dept;
  });
}

export async function updateDepartment(actorId: string, id: string, input: UpdateDepartmentInput, ip: string | null) {
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throw notFound('Department');
  if (input.name || input.code) {
    const clash = await prisma.department.findFirst({
      where: { id: { not: id }, OR: [...(input.code ? [{ code: input.code }] : []), ...(input.name ? [{ name: input.name }] : [])] },
    });
    if (clash) throw conflict('A department with this name or code already exists.');
  }
  return prisma.$transaction(async (tx) => {
    const dept = await tx.department.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail || null } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    await audit(
      { actorId, action: 'department.updated', entityType: 'department', entityId: id, metadata: { changes: Object.keys(input) }, ipAddress: ip },
      tx,
    );
    return dept;
  });
}
