import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../lib/db';
import { projects } from '../db/schema';

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    const result = db.select().from(projects).all();
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const { name, description, color } = req.body as {
      name?: string; description?: string; color?: string;
    };
    if (!name) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'name is required' } });
    }
    const now = Date.now();
    const [project] = db
      .insert(projects)
      .values({ id: randomUUID(), name, description, color, createdAt: now, updatedAt: now, archived: 0 })
      .returning()
      .all();
    res.status(201).json(project);
  } catch (e) { next(e); }
});

router.patch('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body as { name?: string; description?: string; color?: string };
    const set: Partial<typeof projects.$inferInsert> = { updatedAt: Date.now() };
    if (body.name !== undefined) set.name = body.name;
    if (body.description !== undefined) set.description = body.description;
    if (body.color !== undefined) set.color = body.color;
    db.update(projects).set(set).where(eq(projects.id, id)).run();
    const project = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }
    res.json(project);
  } catch (e) { next(e); }
});

// Soft-archive: sets archived=1, does NOT hard-delete
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    db.update(projects).set({ archived: 1, updatedAt: Date.now() }).where(eq(projects.id, id)).run();
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
