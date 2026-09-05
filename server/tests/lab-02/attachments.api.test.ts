import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Attachment Lifecycle & Soft Removal API (Lab 2 - Issue 8)', () => {
  let createdAttachmentId: number;

  it('API-08: POST /api/tickets/:id/attachments should upload valid PDF file attachment', async () => {
    // Attach buffer representing a PDF file to ticket 1 (owned by requester 1)
    const pdfBuffer = Buffer.from('%PDF-1.4 sample PDF file content');

    const res = await request(app)
      .post('/api/tickets/1/attachments')
      .set('X-Dev-Requester-Id', '1')
      .attach('file', pdfBuffer, 'system_log.pdf');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('originalName', 'system_log.pdf');
    expect(res.body.data).toHaveProperty('mimeType', 'application/pdf');
    expect(res.body.data).toHaveProperty('isRemoved', false);

    createdAttachmentId = res.body.data.id;
  });

  it('API-09: POST /api/tickets/:id/attachments should reject unsupported file type (.exe)', async () => {
    const exeBuffer = Buffer.from('MZ executable file data');

    const res = await request(app)
      .post('/api/tickets/1/attachments')
      .set('X-Dev-Requester-Id', '1')
      .attach('file', exeBuffer, 'malware.exe');

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error.message).toMatch(/Only JPG, PNG, WEBP, and PDF/i);
  });

  it('API-10: PATCH /api/attachments/:id/remove should soft-remove attachment with removalReason', async () => {
    expect(createdAttachmentId).toBeDefined();

    const res = await request(app)
      .patch(`/api/attachments/${createdAttachmentId}/remove`)
      .set('X-Dev-Requester-Id', '1')
      .send({ removalReason: 'Uploaded outdated system log file by mistake' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('isRemoved', true);
    expect(res.body.data).toHaveProperty('removalReason', 'Uploaded outdated system log file by mistake');
    expect(res.body.data).toHaveProperty('removedAt');
  });

  it('API-11: GET /api/attachments/:id/download should block download for soft-removed attachment', async () => {
    expect(createdAttachmentId).toBeDefined();

    const res = await request(app)
      .get(`/api/attachments/${createdAttachmentId}/download`)
      .set('X-Dev-Requester-Id', '1');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error.message).toMatch(/soft-removed and cannot be downloaded/i);
  });
});
