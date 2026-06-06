import express from 'express';
import getDb from '../db';
import { requireHq } from '../middleware/auth';

const router = express.Router();

function insertPointRecord(
  db: any,
  memberId: number,
  type: 'earn' | 'spend' | 'adjust',
  change: number,
  sourceType: 'transaction' | 'exchange' | 'manual',
  sourceId?: number,
  remark?: string,
  operatorId?: number
) {
  const member = db.prepare('SELECT points FROM members WHERE id = ?').get(memberId);
  if (!member) {
    throw new Error('会员不存在');
  }

  const balanceBefore = member.points;
  const balanceAfter = balanceBefore + change;

  if (balanceAfter < 0) {
    throw new Error('积分不足');
  }

  db.prepare(`
    INSERT INTO point_records (member_id, type, change, balance_before, balance_after, source_type, source_id, remark, operator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(memberId, type, change, balanceBefore, balanceAfter, sourceType, sourceId, remark, operatorId);

  db.prepare('UPDATE members SET points = ? WHERE id = ?').run(balanceAfter, memberId);

  return { balance_before: balanceBefore, balance_after: balanceAfter };
}

router.get('/member/:memberId', (req, res) => {
  const db = getDb();
  const { memberId } = req.params;
  const { page = 1, pageSize = 10, type } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);

  const whereClauses: string[] = ['pr.member_id = ?'];
  const params: any[] = [memberId];

  if (req.user!.role === 'store') {
  }

  if (type) {
    whereClauses.push('pr.type = ?');
    params.push(type);
  }

  const whereClause = 'WHERE ' + whereClauses.join(' AND ');

  const totalSql = `SELECT COUNT(*) as count FROM point_records pr ${whereClause}`;
  const total = db.prepare(totalSql).get(...params) as { count: number };

  const listSql = `
    SELECT pr.*, u.username as operator_name
    FROM point_records pr
    LEFT JOIN users u ON pr.operator_id = u.id
    ${whereClause}
    ORDER BY pr.created_at DESC LIMIT ? OFFSET ?
  `;
  const list = db.prepare(listSql).all(...params, Number(pageSize), offset);

  res.json({
    code: 0,
    data: {
      list,
      total: total.count,
      page: Number(page),
      pageSize: Number(pageSize)
    }
  });
});

router.post('/adjust', requireHq, (req, res) => {
  const db = getDb();
  const { member_id, change, remark } = req.body;

  if (!member_id || change === undefined || change === null) {
    return res.json({ code: 1, message: '请填写完整信息' });
  }

  if (change === 0) {
    return res.json({ code: 1, message: '调整积分数不能为0' });
  }

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
  if (!member) {
    return res.json({ code: 1, message: '会员不存在' });
  }

  const type = change > 0 ? 'earn' : 'spend';

  try {
    const result = db.transaction(() => {
      return insertPointRecord(
        db,
        Number(member_id),
        type,
        Number(change),
        'manual',
        undefined,
        remark,
        req.user!.id
      );
    })();

    res.json({
      code: 0,
      message: '积分调整成功',
      data: result
    });
  } catch (err: any) {
    res.json({ code: 1, message: err.message });
  }
});

export { insertPointRecord };
export default router;
