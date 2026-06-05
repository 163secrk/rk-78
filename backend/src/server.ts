import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { initDatabase } from './db';
import membersRouter from './routes/members';
import couponsRouter from './routes/coupons';
import transactionsRouter from './routes/transactions';
import storesRouter from './routes/stores';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

initDatabase();

const app = express();
const PORT = 8078;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: '服务运行正常', time: new Date().toISOString() });
});

app.use('/api/members', membersRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/stores', storesRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ code: 1, message: '服务器内部错误', error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 药店会员管理系统后端服务已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
});
