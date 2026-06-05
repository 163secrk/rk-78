import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import getDb from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-secret-key-2024';

export interface AuthUser {
  id: number;
  username: string;
  role: 'hq' | 'store';
  storeId?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ code: 1, message: '未提供认证令牌' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as AuthUser;
    const db = getDb();
    const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    
    if (!dbUser) {
      return res.status(401).json({ code: 1, message: '用户不存在' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ code: 1, message: '认证令牌无效或已过期' });
  }
}

export function requireHq(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ code: 1, message: '未登录' });
  }
  if (req.user.role !== 'hq') {
    return res.status(403).json({ code: 1, message: '需要总部管理员权限' });
  }
  next();
}

export function requireStore(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ code: 1, message: '未登录' });
  }
  if (req.user.role !== 'store') {
    return res.status(403).json({ code: 1, message: '需要门店权限' });
  }
  next();
}

export function requireHqOrOwnStore(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ code: 1, message: '未登录' });
  }
  if (req.user.role === 'hq') {
    return next();
  }
  const storeId = req.query.store_id || req.body.store_id;
  if (storeId && Number(storeId) === req.user.storeId) {
    return next();
  }
  return res.status(403).json({ code: 1, message: '只能访问本店数据' });
}
