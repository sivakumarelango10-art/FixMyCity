/**
 * FixMyCity seed. Idempotent and non-destructive.
 *
 * Creates only what is missing, matched by natural keys:
 *   departments by code, users by email, demo complaints and demo
 *   announcements by title (isDemo = true), utility accounts per citizen
 *   and service. Nothing is ever deleted, overwritten or renumbered, and
 *   the tracking-number sequence only moves forward.
 *
 * Profiles (SEED_PROFILE):
 *   reference  departments only (safe for any environment)
 *   demo       reference + demo accounts, complaints, bills, notices (default locally)
 *
 * Safety:
 *   - APP_ENV=production refuses to run unless SEED_ALLOW_PRODUCTION=true,
 *     and then only the reference profile is allowed.
 *   - A non-local database host (for example Supabase) refuses to run unless
 *     SEED_ALLOW_REMOTE=true; remote demo data also needs SEED_PROFILE=demo.
 *
 * Demo passwords are for local development and demos only.
 */
import { hash } from '@node-rs/argon2';
import { PrismaClient, type ComplaintCategory, type ComplaintStatus, type Priority, type Role } from '@prisma/client';
import {
  CATEGORY_META,
  DEPARTMENT_CODES,
  DEPARTMENT_DEFAULTS,
  classifyWithRules,
  formatTrackingId,
  type DepartmentCode,
} from '@fixmycity/shared';

/* ------------------------------------------------------------------ */
/* Environment guard                                                   */
/* ------------------------------------------------------------------ */

function databaseHost(url: string | undefined): string {
  try {
    return new URL(url ?? '').hostname;
  } catch {
    return '';
  }
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const appEnv = process.env.APP_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'local');
const host = databaseHost(process.env.DATABASE_URL);
const remote = !LOCAL_HOSTS.has(host);
const requestedProfile = process.env.SEED_PROFILE;

function decideProfile(): 'reference' | 'demo' {
  if (appEnv === 'production') {
    if (process.env.SEED_ALLOW_PRODUCTION !== 'true') {
      console.error('Refusing to seed: APP_ENV=production. Set SEED_ALLOW_PRODUCTION=true to seed reference data (departments) only.');
      process.exit(1);
    }
    if (requestedProfile === 'demo') {
      console.error('Refusing to seed demo accounts with known passwords into a production environment.');
      process.exit(1);
    }
    return 'reference';
  }
  if (remote) {
    if (process.env.SEED_ALLOW_REMOTE !== 'true') {
      console.error(`Refusing to seed remote database host "${host}". Set SEED_ALLOW_REMOTE=true if this is a disposable staging database.`);
      process.exit(1);
    }
    return requestedProfile === 'demo' ? 'demo' : 'reference';
  }
  return requestedProfile === 'reference' ? 'reference' : 'demo';
}

const profile = decideProfile();

const prisma = new PrismaClient();
const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = Date.now();
const ago = (days: number, hours = 0) => new Date(now - days * DAY - hours * HOUR);

const passwordHash = (pw: string) => hash(pw, { algorithm: 2 /* Argon2id */, memoryCost: 19456, timeCost: 2, parallelism: 1 });

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

interface SeedUser {
  key: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  ward?: string;
  department?: DepartmentCode;
}

export const DEMO_USERS: SeedUser[] = [
  { key: 'asha', name: 'Asha Raghavan', email: 'citizen@demo.fixmycity.local', password: 'Citizen@2026', role: 'CITIZEN', phone: '+91 98450 31742', ward: 'Indiranagar' },
  { key: 'imran', name: 'Imran Sheikh', email: 'imran@demo.fixmycity.local', password: 'Citizen@2026', role: 'CITIZEN', ward: 'Shivajinagar' },
  { key: 'lakshmi', name: 'Lakshmi Narayan', email: 'lakshmi@demo.fixmycity.local', password: 'Citizen@2026', role: 'CITIZEN', ward: 'Jayanagar' },
  { key: 'admin', name: 'Meera Kulkarni', email: 'admin@demo.fixmycity.local', password: 'Admin@2026', role: 'ADMIN' },
  { key: 'super', name: 'Arvind Rao', email: 'superadmin@demo.fixmycity.local', password: 'SuperAdmin@2026', role: 'SUPER_ADMIN' },
  { key: 'roads', name: 'Ravi Gowda', email: 'roads.officer@demo.fixmycity.local', password: 'Officer@2026', role: 'DEPARTMENT_OFFICER', department: 'ROADS' },
  { key: 'water', name: 'Farah Khan', email: 'water.officer@demo.fixmycity.local', password: 'Officer@2026', role: 'DEPARTMENT_OFFICER', department: 'WATER' },
  { key: 'sanitation', name: 'Suresh Babu', email: 'sanitation.officer@demo.fixmycity.local', password: 'Officer@2026', role: 'DEPARTMENT_OFFICER', department: 'SANITATION' },
  { key: 'lighting', name: 'Divya Menon', email: 'lighting.officer@demo.fixmycity.local', password: 'Officer@2026', role: 'DEPARTMENT_OFFICER', department: 'LIGHTING' },
  { key: 'drainage', name: 'Kiran Shetty', email: 'drainage.officer@demo.fixmycity.local', password: 'Officer@2026', role: 'DEPARTMENT_OFFICER', department: 'DRAINAGE' },
  { key: 'general', name: 'Anil Joseph', email: 'general.officer@demo.fixmycity.local', password: 'Officer@2026', role: 'DEPARTMENT_OFFICER', department: 'GENERAL' },
];

/* ------------------------------------------------------------------ */
/* Complaints                                                          */
/* ------------------------------------------------------------------ */

type Step =
  | { at: Date; status: ComplaintStatus; by: string; reason?: string }
  | { at: Date; assign: DepartmentCode; by: string; notes?: string }
  | { at: Date; note: string; by: string; internal?: boolean };

interface SeedComplaint {
  citizen: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: Priority;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: Date;
  steps: Step[];
  resolution?: string;
  feedback?: { rating: number; comment?: string };
}

function complaints(): SeedComplaint[] {
  return [
    {
      citizen: 'asha',
      title: 'Large pothole near MG Road metro station',
      description: 'Large pothole near MG Road affecting daily commuters. Two-wheelers swerve into the next lane to avoid it, especially at night.',
      category: 'POTHOLES',
      priority: 'HIGH',
      latitude: 12.97555,
      longitude: 77.60685,
      address: 'MG Road, near MG Road metro station exit B',
      createdAt: ago(6, 3),
      steps: [
        { at: ago(5, 22), status: 'UNDER_REVIEW', by: 'admin', reason: 'Verified with photo; high traffic stretch.' },
        { at: ago(5, 20), assign: 'ROADS', by: 'admin', notes: 'Busy junction. Please prioritise barricading before repair.' },
        { at: ago(4, 6), status: 'IN_PROGRESS', by: 'roads' },
        { at: ago(4, 5), note: 'Site inspected. Area barricaded; cold-mix patching scheduled for the night shift.', by: 'roads' },
        { at: ago(2, 2), note: 'Asphalt supply delayed by a day. Barricades remain in place.', by: 'roads' },
      ],
    },
    {
      citizen: 'asha',
      title: 'Water pipeline leaking on 12th Main, Indiranagar',
      description: 'Water pipeline burst near our street. Water has been leaking continuously since yesterday morning and the road is slippery.',
      category: 'WATER_LEAKAGE',
      priority: 'HIGH',
      latitude: 12.97192,
      longitude: 77.64115,
      address: '12th Main Road, HAL 2nd Stage, Indiranagar',
      createdAt: ago(2, 5),
      steps: [{ at: ago(1, 20), assign: 'WATER', by: 'admin', notes: 'Continuous leak reported. Check the valve chamber first.' }],
    },
    {
      citizen: 'imran',
      title: 'Uncollected garbage near KR Market',
      description: 'Garbage has not been collected for 4 days near the KR Market flower section. Bins are overflowing onto the footpath and attracting stray dogs.',
      category: 'GARBAGE_COLLECTION',
      priority: 'MEDIUM',
      latitude: 12.96472,
      longitude: 77.57741,
      address: 'KR Market, near the flower market entrance',
      createdAt: ago(1, 6),
      steps: [{ at: ago(0, 20), status: 'UNDER_REVIEW', by: 'admin', reason: 'Checking the ward collection schedule.' }],
    },
    {
      citizen: 'asha',
      title: 'Broken streetlight on Bannerghatta Road',
      description: 'Streetlight not working for a week on Bannerghatta Road opposite the bus stop. The stretch is pitch dark after 7 pm.',
      category: 'STREETLIGHT_FAILURE',
      priority: 'HIGH',
      latitude: 12.91046,
      longitude: 77.59951,
      address: 'Bannerghatta Road, opposite Arekere bus stop',
      createdAt: ago(10, 4),
      steps: [
        { at: ago(10, 1), assign: 'LIGHTING', by: 'admin' },
        { at: ago(8, 5), status: 'IN_PROGRESS', by: 'lighting' },
        { at: ago(8, 4), note: 'Faulty LED driver identified. Replacement requested from stores.', by: 'lighting' },
        { at: ago(3, 2), status: 'RESOLVED', by: 'lighting', reason: 'LED fixture and driver replaced. Light tested at dusk and working.' },
      ],
      resolution: 'LED fixture and driver replaced. Light tested at dusk and working.',
      feedback: { rating: 4, comment: 'Fixed within a week. Thank you!' },
    },
    {
      citizen: 'asha',
      title: 'Blocked drain flooding 5th Cross after heavy rain',
      description: 'The drain on 5th Cross is blocked and water stagnates knee-deep after heavy rainfall. Sewage smell is spreading to nearby houses.',
      category: 'DRAINAGE',
      priority: 'HIGH',
      latitude: 12.93519,
      longitude: 77.62445,
      address: '5th Cross, Koramangala 6th Block',
      createdAt: ago(0, 5),
      steps: [],
    },
    {
      citizen: 'lakshmi',
      title: 'Damaged footpath slabs near Jayanagar 4th Block',
      description: 'Several footpath slabs are broken and tilted near the shopping complex. Elderly residents have tripped here.',
      category: 'ROAD_DAMAGE',
      priority: 'HIGH',
      latitude: 12.92933,
      longitude: 77.58263,
      address: '11th Main, Jayanagar 4th Block, near the shopping complex',
      createdAt: ago(19, 2),
      steps: [
        { at: ago(18, 20), status: 'UNDER_REVIEW', by: 'admin' },
        { at: ago(18, 18), assign: 'ROADS', by: 'admin' },
        { at: ago(16, 3), status: 'IN_PROGRESS', by: 'roads' },
        { at: ago(13, 1), status: 'RESOLVED', by: 'roads', reason: 'Twelve slabs replaced and the kerb edge re-levelled.' },
      ],
      resolution: 'Twelve slabs replaced and the kerb edge re-levelled.',
      feedback: { rating: 5 },
    },
    {
      citizen: 'imran',
      title: 'Traffic signal stuck on red at Richmond Circle',
      description: 'The traffic signal at the Richmond Circle junction stays red for all directions, causing heavy traffic and confusion.',
      category: 'TRAFFIC_INFRASTRUCTURE',
      priority: 'HIGH',
      latitude: 12.96422,
      longitude: 77.59705,
      address: 'Richmond Circle junction',
      createdAt: ago(25, 6),
      steps: [
        { at: ago(25, 4), assign: 'ROADS', by: 'admin' },
        { at: ago(25, 1), status: 'IN_PROGRESS', by: 'roads' },
        { at: ago(24, 18), status: 'RESOLVED', by: 'roads', reason: 'Controller reset and timing plan restored.' },
      ],
      resolution: 'Controller reset and timing plan restored.',
    },
    {
      citizen: 'lakshmi',
      title: 'Overflowing public toilet near Lalbagh west gate',
      description: 'The public toilet near the west gate is unhygienic, water supply is cut and there is a strong stench.',
      category: 'PUBLIC_SANITATION',
      priority: 'MEDIUM',
      latitude: 12.94888,
      longitude: 77.58137,
      address: 'Lalbagh West Gate, RV Road',
      createdAt: ago(9, 7),
      steps: [
        { at: ago(9, 2), assign: 'SANITATION', by: 'admin' },
        { at: ago(7, 6), status: 'IN_PROGRESS', by: 'sanitation' },
        { at: ago(7, 5), note: 'Cleaning crew deployed. Plumber visit booked for the water line.', by: 'sanitation' },
      ],
    },
    {
      citizen: 'imran',
      title: 'Broken bench and bus shelter roof at Shivajinagar',
      description: 'The bus shelter roof sheet is hanging loose and one bench is broken. It looks vandalised.',
      category: 'PUBLIC_PROPERTY_DAMAGE',
      priority: 'MEDIUM',
      latitude: 12.98466,
      longitude: 77.60558,
      address: 'Shivajinagar bus stand, platform 3',
      createdAt: ago(14, 3),
      steps: [
        { at: ago(13, 22), assign: 'GENERAL', by: 'admin' },
        { at: ago(11, 4), status: 'IN_PROGRESS', by: 'general' },
        { at: ago(6, 5), status: 'RESOLVED', by: 'general', reason: 'Roof sheet re-fixed and bench replaced.' },
        { at: ago(4, 3), status: 'REOPENED', by: 'imran', reason: 'The roof sheet came loose again after the storm.' },
      ],
    },
    {
      citizen: 'lakshmi',
      title: 'Second pothole report near MG Road metro',
      description: 'Pothole near MG Road metro, same spot reported earlier by others.',
      category: 'POTHOLES',
      priority: 'MEDIUM',
      latitude: 12.97561,
      longitude: 77.60702,
      address: 'MG Road, near the metro station',
      createdAt: ago(5, 1),
      steps: [{ at: ago(4, 22), status: 'REJECTED', by: 'admin', reason: 'Duplicate of an existing complaint at the same location, which is already in progress.' }],
    },
    {
      citizen: 'imran',
      title: 'Sewage overflowing from manhole on Commercial Street',
      description: 'Sewage is overflowing from a manhole on Commercial Street near the textile shops. The road is flooded with dirty water.',
      category: 'DRAINAGE',
      priority: 'HIGH',
      latitude: 12.98213,
      longitude: 77.60836,
      address: 'Commercial Street, near Kamaraj Road junction',
      createdAt: ago(33, 4),
      steps: [
        { at: ago(33, 2), assign: 'DRAINAGE', by: 'admin' },
        { at: ago(32, 20), status: 'IN_PROGRESS', by: 'drainage' },
        { at: ago(31, 6), status: 'RESOLVED', by: 'drainage', reason: 'Desilted the line using a jetting machine; manhole cover reseated.' },
      ],
      resolution: 'Desilted the line using a jetting machine; manhole cover reseated.',
      feedback: { rating: 3, comment: 'Took two days but it is clear now.' },
    },
    {
      citizen: 'lakshmi',
      title: 'Streetlights flickering along 9th Main',
      description: 'Three streetlights flickering on 9th Main for several days. Women walking home feel unsafe.',
      category: 'STREETLIGHT_FAILURE',
      priority: 'HIGH',
      latitude: 12.92612,
      longitude: 77.58507,
      address: '9th Main, Jayanagar 3rd Block',
      createdAt: ago(3, 8),
      steps: [{ at: ago(3, 2), assign: 'LIGHTING', by: 'admin' }],
    },
    {
      citizen: 'asha',
      title: 'Garbage dumped on vacant plot, 100 Feet Road',
      description: 'Construction waste and household garbage are being dumped on the vacant plot beside 100 Feet Road.',
      category: 'GARBAGE_COLLECTION',
      priority: 'MEDIUM',
      latitude: 12.97842,
      longitude: 77.64071,
      address: '100 Feet Road, Indiranagar, next to the petrol bunk',
      createdAt: ago(41, 5),
      steps: [
        { at: ago(41, 1), assign: 'SANITATION', by: 'admin' },
        { at: ago(39, 3), status: 'IN_PROGRESS', by: 'sanitation' },
        { at: ago(36, 2), status: 'RESOLVED', by: 'sanitation', reason: 'Plot cleared (two truckloads). Warning board installed.' },
      ],
      resolution: 'Plot cleared (two truckloads). Warning board installed.',
    },
    {
      citizen: 'imran',
      title: 'Low water pressure and leaking valve, Frazer Town',
      description: 'A valve near Mosque Road is leaking and houses at the end of the line get almost no water.',
      category: 'WATER_LEAKAGE',
      priority: 'MEDIUM',
      latitude: 12.99725,
      longitude: 77.61391,
      address: 'Mosque Road, Frazer Town',
      createdAt: ago(21, 3),
      steps: [
        { at: ago(21, 1), assign: 'WATER', by: 'admin' },
        { at: ago(19, 6), status: 'IN_PROGRESS', by: 'water' },
        { at: ago(17, 4), status: 'RESOLVED', by: 'water', reason: 'Valve gland replaced; supply pressure normal at the tail end.' },
      ],
      resolution: 'Valve gland replaced; supply pressure normal at the tail end.',
      feedback: { rating: 4 },
    },
    {
      citizen: 'lakshmi',
      title: 'Caved-in road edge near Basavanagudi bull temple',
      description: 'The road edge has caved in after the drain work and is dangerous for two-wheelers at the turn.',
      category: 'ROAD_DAMAGE',
      priority: 'HIGH',
      latitude: 12.94257,
      longitude: 77.56767,
      address: 'Bull Temple Road, Basavanagudi',
      createdAt: ago(1, 2),
      steps: [],
    },
    {
      citizen: 'asha',
      title: 'Faded zebra crossing outside school on CMH Road',
      description: 'The zebra crossing outside the school on CMH Road has faded completely. Children cross here every morning.',
      category: 'TRAFFIC_INFRASTRUCTURE',
      priority: 'HIGH',
      latitude: 12.97837,
      longitude: 77.63809,
      address: 'CMH Road, Indiranagar, outside the school gate',
      createdAt: ago(16, 5),
      steps: [
        { at: ago(16, 2), assign: 'ROADS', by: 'admin' },
        { at: ago(12, 6), status: 'IN_PROGRESS', by: 'roads' },
        { at: ago(9, 3), status: 'RESOLVED', by: 'roads', reason: 'Crossing repainted with thermoplastic paint; school notified.' },
      ],
      resolution: 'Crossing repainted with thermoplastic paint; school notified.',
      feedback: { rating: 5, comment: 'Quick and neat work.' },
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

const ANNOUNCEMENTS = [
  {
    title: 'Scheduled water supply interruption in Indiranagar (demo notice)',
    summary: 'Supply to HAL 2nd Stage will be paused for pipeline maintenance on Saturday from 10 am to 4 pm.',
    content:
      'This is a demonstration notice. The Water Supply Department will carry out valve replacement on the 12th Main trunk line. Residents of HAL 2nd Stage are advised to store water in advance. Supply will resume by 4 pm. Track related complaints from your dashboard.',
    category: 'MAINTENANCE' as const,
    pinned: true,
    publishedAt: ago(1, 3),
    expiresAt: new Date(now + 6 * DAY),
  },
  {
    title: 'Monsoon readiness: report blocked drains early (demo notice)',
    summary: 'Help crews clear drains before the next heavy spell by reporting blockages with a photo and map pin.',
    content:
      'This is a demonstration notice. Drainage crews are desilting stormwater drains ward by ward. If you see a blocked drain or an open manhole, report it through FixMyCity with a photo. Open manholes are treated as critical and routed immediately.',
    category: 'ADVISORY' as const,
    pinned: false,
    publishedAt: ago(4, 6),
    expiresAt: new Date(now + 20 * DAY),
  },
  {
    title: 'Ward-level waste segregation drive this weekend (demo notice)',
    summary: 'Sanitation volunteers will visit apartments in Jayanagar and Basavanagudi to explain dry, wet and sanitary waste segregation.',
    content:
      'This is a demonstration notice. The Sanitation Department is running a segregation awareness drive. Missed pickups during the drive can be reported under Garbage Collection.',
    category: 'EVENT' as const,
    pinned: false,
    publishedAt: ago(6, 2),
    expiresAt: new Date(now + 4 * DAY),
  },
  {
    title: 'FixMyCity utility hub now shows simulated bills (demo notice)',
    summary: 'Electricity, water, property tax and waste management bills appear in one place. All payments in this prototype are simulated.',
    content:
      'This is a demonstration notice. The utility hub shows how a unified billing experience could work. No real biller is connected, no payment details are collected and no money is transferred.',
    category: 'SERVICE_UPDATE' as const,
    pinned: false,
    publishedAt: ago(12, 1),
    expiresAt: null,
  },
  {
    title: 'Streetlight audit on arterial roads (draft)',
    summary: 'Night audit of streetlights on Bannerghatta Road and Hosur Road.',
    content: 'Draft announcement used to demonstrate the publishing workflow. Not visible to citizens until published.',
    category: 'GENERAL' as const,
    pinned: false,
    publishedAt: null,
    expiresAt: null,
    status: 'DRAFT' as const,
  },
  {
    title: 'Road resurfacing on Old Airport Road completed (demo notice)',
    summary: 'This notice has expired and is hidden from citizens automatically.',
    content: 'Demonstration of announcement expiry. Citizens no longer see this notice.',
    category: 'SERVICE_UPDATE' as const,
    pinned: false,
    publishedAt: ago(30),
    expiresAt: ago(10),
  },
];

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

const summary = { departments: 0, users: 0, memberships: 0, complaints: 0, announcements: 0, utilityCitizens: 0, skipped: 0 };

async function ensureDepartments(): Promise<Map<DepartmentCode, string>> {
  const ids = new Map<DepartmentCode, string>();
  for (const code of DEPARTMENT_CODES) {
    const existing = await prisma.department.findUnique({ where: { code } });
    if (existing) {
      ids.set(code, existing.id);
      summary.skipped += 1;
      continue;
    }
    // A department may exist under the same name with a different code; never create a clash.
    const byName = await prisma.department.findUnique({ where: { name: DEPARTMENT_DEFAULTS[code].name } });
    if (byName) {
      ids.set(code, byName.id);
      summary.skipped += 1;
      continue;
    }
    const created = await prisma.department.create({
      data: { code, name: DEPARTMENT_DEFAULTS[code].name, description: DEPARTMENT_DEFAULTS[code].description, contactEmail: `${code.toLowerCase()}@demo.fixmycity.local` },
    });
    ids.set(code, created.id);
    summary.departments += 1;
  }
  return ids;
}

async function ensureUsers(departments: Map<DepartmentCode, string>) {
  const users = new Map<string, { id: string; created: boolean }>();
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    // Existing accounts keep their password, profile and role untouched.
    const user =
      existing ??
      (await prisma.user.create({
        data: { name: u.name, email: u.email, passwordHash: await passwordHash(u.password), role: u.role, phone: u.phone ?? null, ward: u.ward ?? null, createdAt: ago(60) },
      }));
    if (existing) summary.skipped += 1;
    else summary.users += 1;
    if (u.department && user.role === 'DEPARTMENT_OFFICER') {
      const departmentId = departments.get(u.department)!;
      const membership = await prisma.departmentMembership.findUnique({ where: { userId_departmentId: { userId: user.id, departmentId } } });
      if (!membership) {
        await prisma.departmentMembership.create({ data: { userId: user.id, departmentId, role: 'OFFICER' } });
        summary.memberships += 1;
      }
    }
    users.set(u.key, { id: user.id, created: !existing });
  }
  return users;
}

async function createDemoComplaint(seed: SeedComplaint, uid: (key: string) => string, departments: Map<DepartmentCode, string>) {
  const classification = classifyWithRules({ title: seed.title, description: seed.description, category: seed.category });

  await prisma.$transaction(async (tx) => {
    // Reserve the next number from the live sequence; never reuses or restarts numbering.
    const [{ value }] = await tx.$queryRaw<{ value: bigint }[]>`SELECT nextval(pg_get_serial_sequence('complaints', 'trackingNumber')) AS value`;
    const trackingNumber = Number(value);

    let status: ComplaintStatus = 'SUBMITTED';
    let departmentId: string | null = null;
    let resolvedAt: Date | null = null;
    let resolvedById: string | null = null;
    let updatedAt = seed.createdAt;
    let reviewOutcome: 'PENDING' | 'ACCEPTED' | 'OVERRIDDEN' = 'PENDING';

    const complaint = await tx.complaint.create({
      data: {
        trackingNumber,
        trackingId: formatTrackingId(seed.createdAt.getFullYear(), trackingNumber),
        citizenId: uid(seed.citizen),
        title: seed.title,
        description: seed.description,
        category: seed.category,
        priority: seed.priority,
        latitude: seed.latitude,
        longitude: seed.longitude,
        address: seed.address,
        isDemo: true,
        createdAt: seed.createdAt,
      },
    });

    await tx.complaintStatusHistory.create({
      data: { complaintId: complaint.id, previousStatus: null, newStatus: 'SUBMITTED', changedById: uid(seed.citizen), reason: 'Complaint submitted by citizen.', createdAt: seed.createdAt },
    });
    await tx.notification.create({
      data: {
        userId: uid(seed.citizen),
        type: 'COMPLAINT_RECEIVED',
        title: `Complaint received: ${complaint.trackingId}`,
        message: `"${complaint.title}" was saved and is waiting for review.`,
        link: `/dashboard/complaints/${complaint.id}`,
        isRead: true,
        createdAt: seed.createdAt,
      },
    });

    for (const step of seed.steps) {
      updatedAt = step.at;
      if ('assign' in step) {
        const target = departments.get(step.assign)!;
        await tx.complaintAssignment.create({
          data: { complaintId: complaint.id, departmentId: target, previousDepartmentId: departmentId, assignedById: uid(step.by), assignedAt: step.at, notes: step.notes ?? null },
        });
        await tx.complaintStatusHistory.create({
          data: { complaintId: complaint.id, previousStatus: status, newStatus: 'ASSIGNED', changedById: uid(step.by), reason: `Assigned to ${DEPARTMENT_DEFAULTS[step.assign].name}.`, createdAt: step.at },
        });
        reviewOutcome = classification.suggestedDepartmentCode === step.assign ? 'ACCEPTED' : 'OVERRIDDEN';
        departmentId = target;
        status = 'ASSIGNED';
        await tx.notification.create({
          data: {
            userId: uid(seed.citizen),
            type: 'COMPLAINT_ASSIGNED',
            title: `${complaint.trackingId} assigned to ${DEPARTMENT_DEFAULTS[step.assign].name}`,
            message: `Your complaint "${complaint.title}" is now with the ${DEPARTMENT_DEFAULTS[step.assign].name}.`,
            link: `/dashboard/complaints/${complaint.id}`,
            isRead: step.at.getTime() < now - 2 * DAY,
            createdAt: step.at,
          },
        });
        await tx.auditLog.create({
          data: { actorId: uid(step.by), action: 'complaint.assigned', entityType: 'complaint', entityId: complaint.id, metadata: { trackingId: complaint.trackingId, department: DEPARTMENT_DEFAULTS[step.assign].name, seeded: true }, createdAt: step.at },
        });
      } else if ('status' in step) {
        await tx.complaintStatusHistory.create({
          data: { complaintId: complaint.id, previousStatus: status, newStatus: step.status, changedById: uid(step.by), reason: step.reason ?? null, createdAt: step.at },
        });
        if (step.status === 'RESOLVED') {
          resolvedAt = step.at;
          resolvedById = uid(step.by);
        }
        if (step.status === 'REOPENED') {
          resolvedAt = null;
          resolvedById = null;
        }
        if (step.status === 'REJECTED') reviewOutcome = 'OVERRIDDEN';
        await tx.notification.create({
          data: {
            userId: uid(seed.citizen),
            type: step.status === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : 'COMPLAINT_STATUS',
            title: `${complaint.trackingId}: ${step.status.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}`,
            message: step.reason ?? `Status changed for "${complaint.title}".`,
            link: `/dashboard/complaints/${complaint.id}`,
            isRead: step.at.getTime() < now - 2 * DAY,
            createdAt: step.at,
          },
        });
        await tx.auditLog.create({
          data: { actorId: uid(step.by), action: 'complaint.status_changed', entityType: 'complaint', entityId: complaint.id, metadata: { trackingId: complaint.trackingId, from: status, to: step.status, seeded: true }, createdAt: step.at },
        });
        status = step.status;
      } else {
        await tx.complaintNote.create({
          data: { complaintId: complaint.id, authorId: uid(step.by), body: step.note, visibility: step.internal ? 'INTERNAL' : 'PUBLIC', createdAt: step.at },
        });
      }
    }

    await tx.aIClassification.create({
      data: {
        complaintId: complaint.id,
        suggestedCategory: classification.suggestedCategory,
        suggestedDepartmentCode: classification.suggestedDepartmentCode,
        suggestedDepartmentId: departments.get(classification.suggestedDepartmentCode) ?? null,
        suggestedPriority: classification.suggestedPriority,
        explanation: classification.explanation,
        classificationSource: 'RULE_BASED',
        signals: classification.signals,
        reviewOutcome,
        reviewedById: reviewOutcome === 'PENDING' ? null : uid('admin'),
        reviewedAt: reviewOutcome === 'PENDING' ? null : updatedAt,
        createdAt: seed.createdAt,
      },
    });

    await tx.complaint.update({
      where: { id: complaint.id },
      data: {
        currentStatus: status,
        assignedDepartmentId: departmentId,
        resolvedAt,
        resolvedById,
        resolutionSummary: status === 'RESOLVED' ? (seed.resolution ?? null) : null,
        updatedAt,
      },
    });

    if (seed.feedback && status === 'RESOLVED' && resolvedAt) {
      await tx.complaintFeedback.create({
        data: { complaintId: complaint.id, citizenId: uid(seed.citizen), rating: seed.feedback.rating, comment: seed.feedback.comment ?? null, createdAt: new Date(resolvedAt.getTime() + 5 * HOUR) },
      });
    }
    console.log(`  + ${complaint.trackingId}  ${status.padEnd(12)} ${CATEGORY_META[seed.category].label}`);
  });
}

async function main() {
  console.log(`Seeding (${profile} profile, APP_ENV=${appEnv}, database host ${host || 'unknown'})`);

  const departments = await ensureDepartments();
  if (profile === 'reference') {
    console.log(`Done. Departments created: ${summary.departments}, already present: ${summary.skipped}.`);
    return;
  }

  const users = await ensureUsers(departments);
  const uid = (key: string) => users.get(key)!.id;

  // Demo complaints are matched by title among demo records only, so real complaints are never touched.
  for (const seed of complaints().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const existing = await prisma.complaint.findFirst({ where: { isDemo: true, title: seed.title }, select: { id: true } });
    if (existing) {
      summary.skipped += 1;
      continue;
    }
    await createDemoComplaint(seed, uid, departments);
    summary.complaints += 1;
  }

  for (const a of ANNOUNCEMENTS) {
    const existing = await prisma.announcement.findFirst({ where: { isDemo: true, title: a.title }, select: { id: true } });
    if (existing) {
      summary.skipped += 1;
      continue;
    }
    await prisma.announcement.create({
      data: {
        title: a.title,
        summary: a.summary,
        content: a.content,
        category: a.category,
        status: 'status' in a ? a.status : 'PUBLISHED',
        pinned: a.pinned,
        isDemo: true,
        publishedAt: a.publishedAt,
        expiresAt: a.expiresAt,
        createdById: uid('admin'),
        createdAt: a.publishedAt ?? ago(0, 2),
      },
    });
    summary.announcements += 1;
  }

  // Simulated bills: one account per service per citizen, created only if missing.
  const { provisionDemoUtilities } = await import('../apps/api/src/modules/utilities/utilities.service');
  for (const key of ['asha', 'imran', 'lakshmi']) {
    const before = await prisma.utilityAccount.count({ where: { citizenId: uid(key) } });
    await provisionDemoUtilities(uid(key));
    if (before === 0) summary.utilityCitizens += 1;
  }

  const asha = users.get('asha')!;
  if (asha.created) {
    await prisma.notification.create({
      data: { userId: asha.id, type: 'SYSTEM', title: 'Welcome to FixMyCity', message: 'This is a demo account. All complaints, bills and notices are demonstration data.', link: '/dashboard', isRead: false },
    });
  }

  console.log(
    `Done. Created: ${summary.departments} departments, ${summary.users} users, ${summary.memberships} memberships, ${summary.complaints} complaints, ${summary.announcements} announcements, utilities for ${summary.utilityCitizens} citizens. Already present (skipped): ${summary.skipped}.`,
  );
  console.log('\nDemo accounts (development data only):');
  for (const u of DEMO_USERS.filter((x) => ['asha', 'admin', 'super', 'roads', 'water'].includes(x.key))) {
    console.log(`  ${u.role.padEnd(19)} ${u.email.padEnd(40)} ${u.password}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (profile === 'demo') {
      const { prisma: apiPrisma } = await import('../apps/api/src/lib/prisma');
      await apiPrisma.$disconnect();
    }
  });
