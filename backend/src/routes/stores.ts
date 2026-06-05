import express from 'express';
import getDb from '../db';
import { requireHq } from '../middleware/auth';

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM stores ORDER BY id').all();
  res.json({ code: 0, data: list });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) {
    return res.json({ code: 1, message: '门店不存在' });
  }
  res.json({ code: 0, data: store });
});

router.post('/', requireHq, (req, res) => {
  const db = getDb();
  const { name, address } = req.body;
  
  if (!name) {
    return res.json({ code: 1, message: '门店名称不能为空' });
  }
  
  const info = db.prepare(`
    INSERT INTO stores (name, address) VALUES (?, ?)
  `).run(name, address);
  
  res.json({ code: 0, data: { id: info.lastInsertRowid } });
});

router.put('/:id', requireHq, (req, res) => {
  const db = getDb();
  const { name, address } = req.body;
  
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) {
    return res.json({ code: 1, message: '门店不存在' });
  }
  
  db.prepare(`
    UPDATE stores SET name = COALESCE(?, name), address = COALESCE(?, address)
    WHERE id = ?
  `).run(name, address, req.params.id);
  
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', requireHq, (req, res) => {
  const db = getDb();
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) {
    return res.json({ code: 1, message: '门店不存在' });
  }
  
  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '删除成功' });
});

export default router;
