import express from 'express';
import getDb from '../db';
import { requireHq } from '../middleware/auth';

const router = express.Router();

router.get('/stats/member-count', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT 
      s.id,
      s.name,
      COUNT(DISTINCT t.member_id) as member_count
    FROM stores s
    LEFT JOIN transactions t ON s.id = t.store_id
    GROUP BY s.id, s.name
    ORDER BY member_count DESC
  `).all() as { id: number; name: string; member_count: number }[];

  const allStores = db.prepare('SELECT id, name FROM stores ORDER BY id').all() as { id: number; name: string }[];

  const result = allStores.map(store => {
    const found = stats.find(s => s.id === store.id);
    return {
      store_id: store.id,
      store_name: store.name,
      member_count: found?.member_count || 0
    };
  });

  res.json({ code: 0, data: result });
});

router.get('/stats/consumption', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT 
      s.id,
      s.name,
      COALESCE(SUM(t.amount), 0) as total_amount,
      COALESCE(SUM(t.amount - t.discount_amount), 0) as final_amount,
      COUNT(t.id) as transaction_count
    FROM stores s
    LEFT JOIN transactions t ON s.id = t.store_id
    GROUP BY s.id, s.name
    ORDER BY total_amount DESC
  `).all() as { id: number; name: string; total_amount: number; final_amount: number; transaction_count: number }[];

  const allStores = db.prepare('SELECT id, name FROM stores ORDER BY id').all() as { id: number; name: string }[];

  const result = allStores.map(store => {
    const found = stats.find(s => s.id === store.id);
    return {
      store_id: store.id,
      store_name: store.name,
      total_amount: found?.total_amount || 0,
      final_amount: found?.final_amount || 0,
      transaction_count: found?.transaction_count || 0
    };
  });

  res.json({ code: 0, data: result });
});

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
