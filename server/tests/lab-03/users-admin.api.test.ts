import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../../src/app';

describe('Issue 6: Administrator User Management API Tests', () => {
  let adminToken: string;
  let adminId: number;
  let staffToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.smith@toktickit.com', password: 'InitialPassword123!' });
    adminToken = adminLogin.body.data.token;
    adminId = adminLogin.body.data.user.id;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex.thompson@toktickit.com', password: 'InitialPassword123!' });
    staffToken = staffLogin.body.data.token;

    const requesterLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jennifer.anderson@example.com', password: 'InitialPassword123!' });
    requesterToken = requesterLogin.body.data.token;
  });

  describe('GET /api/admin/users', () => {
    it('lists users for Administrator', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('filters by search (name or email)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .query({ search: 'alex.thompson' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const u of res.body.data) {
        expect(u.email.toLowerCase()).toContain('alex.thompson');
      }
    });

    it('filters by role', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .query({ role: 'IT_STAFF' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      for (const u of res.body.data) {
        expect(u.role).toBe('IT_STAFF');
      }
    });

    it('rejects IT Staff with 403', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects Requester with 403', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${requesterToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated access with 401', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/admin/users', () => {
    it('creates a user with a valid single role and forces password change', async () => {
      const email = `test.user.${Date.now()}@toktickit.com`;
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test User', email, role: 'IT_STAFF', isActive: true, initialPassword: 'InitialPassword123!' });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe(email.toLowerCase());
      expect(res.body.data.role).toBe('IT_STAFF');
      expect(res.body.data.requiresPasswordChange).toBe(true);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('rejects a duplicate email (BR-11)', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Duplicate', email: 'alex.thompson@toktickit.com', role: 'IT_STAFF', isActive: true, initialPassword: 'InitialPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('rejects a weak initial password', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Weak Pw', email: `weak.${Date.now()}@toktickit.com`, role: 'IT_STAFF', isActive: true, initialPassword: 'weak' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid role value', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad Role', email: `badrole.${Date.now()}@toktickit.com`, role: 'SUPERADMIN', isActive: true, initialPassword: 'InitialPassword123!' });

      expect(res.status).toBe(400);
    });

    it('rejects non-Administrator with 403', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Nope', email: `nope.${Date.now()}@toktickit.com`, role: 'REQUESTER', isActive: true, initialPassword: 'InitialPassword123!' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    let targetUserId: number;

    beforeAll(async () => {
      const created = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Edit Target', email: `edit.target.${Date.now()}@toktickit.com`, role: 'REQUESTER', isActive: true, initialPassword: 'InitialPassword123!' });
      targetUserId = created.body.data.id;
    });

    it('updates name, email, role, and active state', async () => {
      const newEmail = `edited.${Date.now()}@toktickit.com`;
      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Edited Name', email: newEmail, role: 'IT_STAFF', isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Edited Name');
      expect(res.body.data.email).toBe(newEmail.toLowerCase());
      expect(res.body.data.role).toBe('IT_STAFF');
      expect(res.body.data.isActive).toBe(false);
    });

    it('rejects editing to a duplicate email', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'alex.thompson@toktickit.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('BR-13: blocks an Administrator from deactivating their own account', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SELF_DEACTIVATION_FORBIDDEN');
    });

    it('BR-14: blocks deactivating the last active Administrator', async () => {
      // Other test runs may have left extra active Administrator fixtures behind
      // (BR-12 forbids hard delete, so nothing is ever cleaned up that way) — the
      // real system can never be trusted to have exactly one active admin. So this
      // test builds its own fully isolated scenario: create a brand-new admin,
      // deactivate every *other* currently-active admin (including the seeded
      // john.smith) through that new admin, confirm the guard fires against the
      // new admin (the actual last one standing), then restore everything via a
      // direct Prisma write in `finally` — never trusting the guarded API to undo
      // its own block, and never leaving a real fixture (john.smith) broken even
      // if an assertion throws partway through.
      const email = `br14.sole.admin.${Date.now()}@toktickit.com`;
      const created = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'BR14 Sole Admin', email, role: 'ADMINISTRATOR', isActive: true, initialPassword: 'InitialPassword123!' });
      const soleAdminId = created.body.data.id;
      // New accounts require a password change before they can call any other
      // endpoint (BR-02) — clear that flag directly for this throwaway fixture so
      // it can act as an admin immediately, same as reset-password's beforeAll does.
      await prisma.user.update({ where: { id: soleAdminId }, data: { requiresPasswordChange: false } });
      const soleAdminLogin = await request(app).post('/api/auth/login').send({ email, password: 'InitialPassword123!' });
      const soleAdminToken = soleAdminLogin.body.data.token;

      const otherActiveAdminsBefore = await prisma.user.findMany({
        where: { role: 'ADMINISTRATOR', isActive: true, id: { not: soleAdminId } },
      });

      try {
        // Deactivate every other currently-active admin (john.smith plus any stray
        // leftovers from earlier runs) so the new admin is genuinely the last one.
        for (const otherAdmin of otherActiveAdminsBefore) {
          const deactivateRes = await request(app)
            .patch(`/api/admin/users/${otherAdmin.id}`)
            .set('Authorization', `Bearer ${soleAdminToken}`)
            .send({ isActive: false });
          expect(deactivateRes.status).toBe(200);
        }

        // The sole remaining admin changing its own role (not deactivating itself,
        // which would trip BR-13 instead) should be blocked by BR-14.
        const res = await request(app)
          .patch(`/api/admin/users/${soleAdminId}`)
          .set('Authorization', `Bearer ${soleAdminToken}`)
          .send({ role: 'IT_STAFF' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('LAST_ADMIN_GUARD');
      } finally {
        // Restore every admin this test deactivated directly via Prisma, bypassing
        // the guarded API entirely so cleanup can never itself be blocked.
        await prisma.user.updateMany({
          where: { id: { in: otherActiveAdminsBefore.map((a) => a.id) } },
          data: { isActive: true },
        });
        // The new fixture admin is left active; it doesn't affect other tests
        // since none of them assume an exact admin count.
      }
    });

    it('allows deactivating an Administrator when another active Administrator exists', async () => {
      const email = `third.admin.${Date.now()}@toktickit.com`;
      const created = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Third Admin', email, role: 'ADMINISTRATOR', isActive: true, initialPassword: 'InitialPassword123!' });
      const thirdAdminId = created.body.data.id;

      const res = await request(app)
        .patch(`/api/admin/users/${thirdAdminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('rejects non-Administrator with 403', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/users/:id/reset-password', () => {
    let targetUserId: number;
    let targetUserEmail: string;

    beforeAll(async () => {
      targetUserEmail = `reset.target.${Date.now()}@toktickit.com`;
      const created = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Reset Target', email: targetUserEmail, role: 'REQUESTER', isActive: true, initialPassword: 'InitialPassword123!' });
      targetUserId = created.body.data.id;

      // Clear the initial requiresPasswordChange so we can prove reset sets it again.
      await prisma.user.update({ where: { id: targetUserId }, data: { requiresPasswordChange: false } });
    });

    it('sets a new password and forces change on next login (BR-15)', async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newInitialPassword: 'BrandNewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.data.requiresPasswordChange).toBe(true);

      // The old initial password no longer works.
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: targetUserEmail, password: 'InitialPassword123!' });
      expect(oldLoginRes.status).toBe(401);

      // The new password logs in and reports requiresPasswordChange: true.
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: targetUserEmail, password: 'BrandNewPassword123!' });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.data.user.requiresPasswordChange).toBe(true);
    });

    it('rejects a weak new password', async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newInitialPassword: 'weak' });

      expect(res.status).toBe(400);
    });

    it('rejects non-Administrator with 403', async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ newInitialPassword: 'BrandNewPassword123!' });

      expect(res.status).toBe(403);
    });
  });
});
