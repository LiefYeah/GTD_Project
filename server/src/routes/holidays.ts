import { Router } from 'express';
import { sqlite } from '../lib/db';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const { year } = req.query as { year?: string };
    const y = year ? Number(year) : new Date().getFullYear();
    const rows = sqlite.prepare('SELECT * FROM public_holidays WHERE year = ? ORDER BY date ASC').all(y);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const { date, name } = req.body as { date?: string; name?: string };
    if (!date || !name) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'date and name are required' } });
    }
    const year = new Date(date + 'T00:00:00').getFullYear();
    const result = sqlite.prepare('INSERT INTO public_holidays (date, name, year) VALUES (?, ?, ?)').run(date, name, year);
    const row = sqlite.prepare('SELECT * FROM public_holidays WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try {
    sqlite.prepare('DELETE FROM public_holidays WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
