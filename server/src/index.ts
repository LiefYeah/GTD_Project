import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import pomodorosRouter from './routes/pomodoros';
import calendarRouter from './routes/calendar';
import importRouter from './routes/import';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/pomodoros', pomodorosRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/import', importRouter);

// Error handler MUST be last — 4-arg signature is what Express uses to identify error middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
});

runMigrations();
seedDatabase();

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
