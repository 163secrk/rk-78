import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import { initDatabase, getDb } from './db';
import { authenticateToken, generateToken, requireHq } from './middleware/auth';
import membersRouter from './routes/members';
import couponsRouter from './routes/coupons';
import transactionsRouter from './routes/transactions';
import storesRouter from './routes/stores';
import pointsRouter from './routes/points';
import operationLogsRouter from './routes/operationLogs';
import { markExpiredCoupons } from './utils/couponExpiration';
import { logOperation } from './utils/operationLog';

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

app.post('/api/login', (req, res) => {
  const { username, password, role, storeId } = req.body;
  
  if (!username || !password || !role) {
    return res.json({ code: 1, message: '请填写完整信息' });
  }
  
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?').get(username, role);
  
  if (!user) {
    return res.json({ code: 1, message: '用户名或密码错误' });
  }
  
  const userData = user as any;
  
  if (role === 'store' && storeId && Number(storeId) !== userData.store_id) {
    return res.json({ code: 1, message: '该账号不属于所选门店' });
  }
  
  const isValid = bcrypt.compareSync(password, userData.password_hash);
  
  if (!isValid) {
    return res.json({ code: 1, message: '用户名或密码错误' });
  }
  
  const tokenUser = {
    id: userData.id,
    username: userData.username,
    role: userData.role,
    storeId: userData.store_id
  };
  
  const token = generateToken(tokenUser);
  
  res.json({
    code: 0,
    message: '登录成功',
    data: {
      token,
      user: tokenUser
    }
  });
});

app.get('/api/stores', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM stores ORDER BY id').all();
  res.json({ code: 0, data: list });
});

app.use('/api/members', authenticateToken, membersRouter);
app.use('/api/coupons', authenticateToken, couponsRouter);
app.use('/api/transactions', authenticateToken, transactionsRouter);
app.use('/api/stores', authenticateToken, storesRouter);
app.use('/api/points', authenticateToken, pointsRouter);
app.use('/api/operation-logs', authenticateToken, operationLogsRouter);

app.post('/api/coupons/expire', authenticateToken, requireHq, (req, res) => {
  const count = markExpiredCoupons();

  logOperation({
    operatorId: req.user!.id,
    operatorName: req.user!.username,
    operationType: 'coupon_expire',
    targetType: 'coupon',
    detail: `手动标记 ${count} 张过期优惠券`,
  });

  res.json({ code: 0, message: `已标记 ${count} 张过期优惠券`, data: { count } });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ code: 1, message: '服务器内部错误', error: err.message });
});

process.nextTick(() => {
  try {
    const count = markExpiredCoupons();
    if (count > 0) {
      console.log(`服务启动时检测到并标记 ${count} 张过期优惠券`);
    }
  } catch (e) {
    console.error('启动时标记过期优惠券失败:', e);
  }
});

cron.schedule('0 0 0 * * *', () => {
  console.log('执行每日优惠券过期检查任务...');
  try {
    const count = markExpiredCoupons();
    console.log(`每日过期检查完成，共标记 ${count} 张过期优惠券`);
  } catch (e) {
    console.error('每日优惠券过期检查失败:', e);
  }
}, {
  timezone: 'Asia/Shanghai'
} as any);

app.listen(PORT, () => {
  console.log(`🚀 药店会员管理系统后端服务已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
});
