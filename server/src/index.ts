import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 统一错误处理（必须在路由之后注册，signature 四参数触发 Express 错误处理）
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
);

runMigrations();
seedDatabase();

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
