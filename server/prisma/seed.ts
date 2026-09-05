import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Priority, TicketStatus } from '../generated/prisma/client';

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

const requesters = [
  { name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', isActive: true },
  { name: 'Michael Brown', email: 'michael.brown@example.com', isActive: true },
  { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', isActive: true },
  { name: 'David Lee', email: 'david.lee@example.com', isActive: true },
  { name: 'Robert Taylor', email: 'robert.taylor@example.com', isActive: false },
];

async function main() {
  console.log('--- Seeding Database ---');

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

  // 3. Seed Development Requesters (Idempotent via upsert)
  console.log('Seeding Development Requesters...');
  const seededRequesters: Record<string, number> = {};
  for (const reqData of requesters) {
    const req = await prisma.developmentRequester.upsert({
      where: { email: reqData.email },
      update: { name: reqData.name, isActive: reqData.isActive },
      create: reqData,
    });
    seededRequesters[reqData.name] = req.id;
    console.log(`  - Requester: ${req.name} (${req.email}) [Active: ${req.isActive}] (ID: ${req.id})`);
  }

  // 4. Seed Sample Initial Tickets (Idempotent via upsert on ticketNumber)
  console.log('Seeding Sample Tickets...');
  const sampleTickets = [
    {
      ticketNumber: 'TKT-2025-001234',
      requesterId: seededRequesters['Jennifer Anderson'],
      categoryId: seededCategories['Hardware'],
      relatedSystemId: seededSystems['Corporate Laptop'],
      summary: 'Laptop battery drains quickly',
      description: 'My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week\'s Windows update.',
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      currentStatus: TicketStatus.IN_PROGRESS,
    },
    {
      ticketNumber: 'TKT-2025-001233',
      requesterId: seededRequesters['Sarah Johnson'],
      categoryId: seededCategories['Network'],
      relatedSystemId: seededSystems['VPN'],
      summary: 'Cannot connect to VPN',
      description: 'Receiving timeout error when attempting to connect to the campus VPN from off-campus network.',
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      currentStatus: TicketStatus.OPEN,
    },
    {
      ticketNumber: 'TKT-2025-001232',
      requesterId: seededRequesters['David Lee'],
      categoryId: seededCategories['Software'],
      relatedSystemId: seededSystems['Email'],
      summary: 'Email not syncing on mobile',
      description: 'Mobile email app stops syncing new emails since yesterday morning. Webmail is working fine.',
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      currentStatus: TicketStatus.IN_PROGRESS,
    },
    {
      ticketNumber: 'TKT-2025-001231',
      requesterId: seededRequesters['Jennifer Anderson'],
      categoryId: seededCategories['Account and Access'],
      relatedSystemId: seededSystems['LEB2 App'],
      summary: 'New employee setup request',
      description: 'Please grant LEB2 teacher assistant access for the new semester course CPE334.',
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      currentStatus: TicketStatus.RESOLVED,
    },
    {
      ticketNumber: 'TKT-2025-001230',
      requesterId: seededRequesters['Michael Brown'],
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
      },
      create: tData,
    });
    console.log(`  - Ticket: ${ticket.ticketNumber} - ${ticket.summary} (ID: ${ticket.id})`);
  }

  // 5. Seed Sample Attachment
  console.log('Seeding Sample Attachments...');
  const t1234 = await prisma.ticket.findUnique({ where: { ticketNumber: 'TKT-2025-001234' } });
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
    console.log('  - Attachment sample-battery-report-uuid-0001.pdf seeded for TKT-2025-001234');
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

