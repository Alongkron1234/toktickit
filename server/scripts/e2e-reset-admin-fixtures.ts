// Invoked by e2e/lab-03/user-administration.spec.ts, both before the suite
// runs and after the BR-14 (last-Administrator) guard scenario:
//
// 1. Restores john.smith to sole-active-Administrator via a direct DB write,
//    not the app API. That guard scenario temporarily makes a second admin
//    fixture the sole active one; if the guard itself doesn't fire (e.g.
//    because an earlier failed run left another fixture admin active), the
//    app-level restore in the test's `finally` fails silently too —
//    deactivating an account invalidates every token for it, including the
//    one the test would otherwise use to restore it. A direct DB write can't
//    be defeated by that.
// 2. Hard-deletes every non-seed user this spec file's own runs have left
//    behind. The admin list is explicitly unpaginated per the lab spec, so
//    every leftover fixture row (Create/Edit/Reset-Password/BR-14 fixtures,
//    one or more per run) permanently grows every test's render/fetch cost.
//    Deleting is safe here specifically because these are throwaway rows
//    created only for this spec's own CRUD assertions, never referenced by
//    a ticket; it does not contradict BR-12 (no hard delete), which governs
//    what the *application* lets a user do, not this out-of-band DB cleanup.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEEDED_EMAILS = new Set([
  'jennifer.anderson@example.com',
  'michael.brown@example.com',
  'sarah.johnson@example.com',
  'david.lee@example.com',
  'robert.taylor@example.com',
  'alex.thompson@toktickit.com',
  'kevin.patel@toktickit.com',
  'lisa.martinez@toktickit.com',
  'emily.davis@toktickit.com',
  'john.smith@toktickit.com',
]);

async function main() {
  await prisma.user.update({
    where: { email: 'john.smith@toktickit.com' },
    data: { isActive: true, role: 'ADMINISTRATOR' },
  });

  const all = await prisma.user.findMany();
  const fixtureIds = all.filter((u) => !SEEDED_EMAILS.has(u.email)).map((u) => u.id);

  if (fixtureIds.length > 0) {
    try {
      await prisma.user.deleteMany({ where: { id: { in: fixtureIds } } });
    } catch {
      // Fallback if any fixture ended up referenced elsewhere (e.g. FK from
      // a comment/note): deactivating at least keeps it out of active-admin
      // counts, even though it still occupies a row in the unpaginated list.
      await prisma.user.updateMany({ where: { id: { in: fixtureIds } }, data: { isActive: false } });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
