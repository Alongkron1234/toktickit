import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Priority, TicketStatus, Role } from '../generated/prisma/client';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categories = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
];

const relatedSystems = [
  'Email',
  'Campus Wi-Fi',
  'VPN',
  'LEB2 App',
  'Grade Submission App',
  'Printer',
  'Corporate Laptop',
];

// Seed password hash for all seed users: "InitialPassword123!"
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('InitialPassword123!', 10);

const seedUsers = [
  // Requesters (4 active, 1 inactive)
  { name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', role: Role.REQUESTER, isActive: true, requiresPasswordChange: false },
  { name: 'Michael Brown', email: 'michael.brown@example.com', role: Role.REQUESTER, isActive: true, requiresPasswordChange: false },
  { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', role: Role.REQUESTER, isActive: true, requiresPasswordChange: false },
  { name: 'David Lee', email: 'david.lee@example.com', role: Role.REQUESTER, isActive: true, requiresPasswordChange: false },
  { name: 'Robert Taylor', email: 'robert.taylor@example.com', role: Role.REQUESTER, isActive: false, requiresPasswordChange: false },

  // IT Staff (3 active, 1 inactive)
  { name: 'Alex Thompson', email: 'alex.thompson@toktickit.com', role: Role.IT_STAFF, isActive: true, requiresPasswordChange: false },
  { name: 'Kevin Patel', email: 'kevin.patel@toktickit.com', role: Role.IT_STAFF, isActive: true, requiresPasswordChange: false },
  { name: 'Lisa Martinez', email: 'lisa.martinez@toktickit.com', role: Role.IT_STAFF, isActive: true, requiresPasswordChange: false },
  { name: 'Emily Davis', email: 'emily.davis@toktickit.com', role: Role.IT_STAFF, isActive: false, requiresPasswordChange: false },

  // Administrator (1 active)
  { name: 'John Smith', email: 'john.smith@toktickit.com', role: Role.ADMINISTRATOR, isActive: true, requiresPasswordChange: false },
];

async function main() {
  console.log('--- Seeding Database for Lab 3 ---');

  // 1. Seed Categories (Idempotent via upsert)
  console.log('Seeding Categories...');
  const seededCategories: Record<string, number> = {};
  for (const name of categories) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    seededCategories[name] = cat.id;
    console.log(`  - Category: ${cat.name} (ID: ${cat.id})`);
  }

  // 2. Seed Related Systems (Idempotent via upsert)
  console.log('Seeding Related Systems...');
  const seededSystems: Record<string, number> = {};
  for (const name of relatedSystems) {
    const sys = await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    seededSystems[name] = sys.id;
    console.log(`  - Related System: ${sys.name} (ID: ${sys.id})`);
  }

  // 3. Seed Users (Idempotent via upsert)
  console.log('Seeding Users...');
  const seededUsers: Record<string, number> = {};
  for (const uData of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: uData.email },
      update: {
        name: uData.name,
        role: uData.role,
        isActive: uData.isActive,
        passwordHash: DEFAULT_PASSWORD_HASH,
        requiresPasswordChange: uData.requiresPasswordChange,
      },
      create: {
        ...uData,
        passwordHash: DEFAULT_PASSWORD_HASH,
      },
    });
    seededUsers[uData.name] = user.id;
    console.log(`  - User: ${user.name} (${user.email}) [Role: ${user.role}, Active: ${user.isActive}] (ID: ${user.id})`);
  }

  // 4. Seed Sample Tickets (Idempotent via upsert on ticketNumber)
  console.log('Seeding Sample Tickets...');
  const sampleTickets = [
    {
      ticketNumber: 'TKT-2026-001234',
      requesterId: seededUsers['Jennifer Anderson'],
      ownerId: seededUsers['Alex Thompson'],
      categoryId: seededCategories['Hardware'],
      relatedSystemId: seededSystems['Corporate Laptop'],
      summary: 'Laptop battery drains quickly',
      description: 'My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week\'s Windows update.',
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      currentStatus: TicketStatus.IN_PROGRESS,
    },
    {
      ticketNumber: 'TKT-2026-001233',
      requesterId: seededUsers['Sarah Johnson'],
      ownerId: null,
      categoryId: seededCategories['Network'],
      relatedSystemId: seededSystems['VPN'],
      summary: 'Cannot connect to VPN',
      description: 'Receiving timeout error when attempting to connect to the campus VPN from off-campus network.',
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      currentStatus: TicketStatus.OPEN,
    },
    {
      ticketNumber: 'TKT-2026-001232',
      requesterId: seededUsers['David Lee'],
      ownerId: seededUsers['Kevin Patel'],
      categoryId: seededCategories['Software'],
      relatedSystemId: seededSystems['Email'],
      summary: 'Email not syncing on mobile',
      description: 'Mobile email app stops syncing new emails since yesterday morning. Webmail is working fine.',
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      currentStatus: TicketStatus.IN_PROGRESS,
    },
    {
      ticketNumber: 'TKT-2026-001231',
      requesterId: seededUsers['Jennifer Anderson'],
      ownerId: seededUsers['Lisa Martinez'],
      categoryId: seededCategories['Account and Access'],
      relatedSystemId: seededSystems['LEB2 App'],
      summary: 'New employee setup request',
      description: 'Please grant LEB2 teacher assistant access for the new semester course CPE334.',
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      currentStatus: TicketStatus.RESOLVED,
    },
    {
      ticketNumber: 'TKT-2026-001230',
      requesterId: seededUsers['Michael Brown'],
      ownerId: null,
      categoryId: seededCategories['Hardware'],
      relatedSystemId: seededSystems['Printer'],
      summary: 'Printer keeps showing offline',
      description: 'The department printer on 4th floor is showing offline for all users in section 2.',
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.LOW,
      currentStatus: TicketStatus.OPEN,
    },
  ];

  for (const tData of sampleTickets) {
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: tData.ticketNumber },
      update: {
        summary: tData.summary,
        description: tData.description,
        requestedPriority: tData.requestedPriority,
        itPriority: tData.itPriority,
        currentStatus: tData.currentStatus,
        ownerId: tData.ownerId,
      },
      create: tData,
    });
    console.log(`  - Ticket: ${ticket.ticketNumber} - ${ticket.summary} (ID: ${ticket.id})`);
  }

  // 5. Seed Sample Attachment
  console.log('Seeding Sample Attachments...');
  const t1234 = await prisma.ticket.findUnique({ where: { ticketNumber: 'TKT-2026-001234' } });
  if (t1234) {
    await prisma.attachment.upsert({
      where: { storedName: 'sample-battery-report-uuid-0001.pdf' },
      update: {},
      create: {
        ticketId: t1234.id,
        originalName: 'battery_report.pdf',
        storedName: 'sample-battery-report-uuid-0001.pdf',
        mimeType: 'application/pdf',
        fileSize: 1048576,
        isRemoved: false,
      },
    });
    console.log('  - Attachment sample-battery-report-uuid-0001.pdf seeded for TKT-2026-001234');
  }

  // 6. Seed Sample Public Comments & Internal Notes
  if (t1234) {
    console.log('Seeding Sample Comments and Notes...');
    await prisma.publicComment.create({
      data: {
        ticketId: t1234.id,
        authorId: seededUsers['Jennifer Anderson'],
        content: 'Just adding that this issue occurs even when I close all applications.',
        createdAt: new Date('2026-05-12T09:20:00Z'),
      },
    });
    await prisma.publicComment.create({
      data: {
        ticketId: t1234.id,
        authorId: seededUsers['Alex Thompson'],
        content: 'We are investigating the issue on your device. We will update you shortly.',
        createdAt: new Date('2026-05-13T10:30:00Z'),
      },
    });
    await prisma.internalNote.create({
      data: {
        ticketId: t1234.id,
        authorId: seededUsers['Alex Thompson'],
        content: 'Ran battery health check. Health capacity is at 45%. Recommended replacement battery part #BAT-994.',
        createdAt: new Date('2026-05-13T10:45:00Z'),
      },
    });
    console.log('  - Public Comments and Internal Note seeded for TKT-2026-001234');
  }

  console.log('--- Seeding completed successfully ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
