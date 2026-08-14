import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

const app = express();

app.use(cors());
app.use(express.json());

// Health Check Endpoint (Issue 2)
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'TokTickIT API',
  });
});

// Category List Endpoint (Issue 4)
app.get('/api/categories', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default app;
