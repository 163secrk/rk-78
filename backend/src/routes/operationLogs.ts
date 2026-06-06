import express from 'express';
import getDb from '../db';
import { requireHq } from '../middleware/auth';
import { operationTypeLabels, OperationType } from '../utils/operationLog';

const router = express.Router();

router.get('/', requireHq, (req, res) => {
  const db = getDb();
  const {
    page = 1,
    pageSize = 20,
    operation_type,
    operator_id,
    start_date,
    end_date,
    keyword,
  } = req.query;

  const offset = (Number(page) - 1) * Number(pageSize);

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (operation_type) {
    whereClauses.push('ol.operation_type = ?');
    params.push(operation_type);
  }

  if (operator_id) {
    whereClauses.push('ol.operator_id = ?');
    params.push(operator_id);
  }

  if (start_date) {
    whereClauses.push('ol.created_at >= ?');
    params.push(start_date);
  }

  if (end_date) {
    whereClauses.push('ol.created_at <= ?');
    params.push(end_date + ' 23:59:59');
  }

  if (keyword) {
    whereClauses.push('(ol.operator_name LIKE ? OR ol.detail LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereClause = whereClauses.length > 0
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';

  const totalSql = `SELECT COUNT(*) as count FROM operation_logs ol ${whereClause}`;
  const total = db.prepare(totalSql).get(...params) as { count: number };

  const listSql = `
    SELECT ol.*, s.name as store_name
    FROM operation_logs ol
    LEFT JOIN stores s ON ol.store_id = s.id
    ${whereClause}
    ORDER BY ol.created_at DESC LIMIT ? OFFSET ?
  `;
  const list = db.prepare(listSql).all(...params, Number(pageSize), offset) as any[];

  const result = list.map(item => ({
    ...item,
    operation_type_label: operationTypeLabels[item.operation_type as OperationType] || item.operation_type,
  }));

  res.json({
    code: 0,
    data: {
      list: result,
      total: total.count,
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
});

router.get('/operation-types', requireHq, (req, res) => {
  const types = Object.entries(operationTypeLabels).map(([value, label]) => ({
    value,
    label,
  }));
  res.json({ code: 0, data: types });
});

router.get('/operators', requireHq, (req, res) => {
  const db = getDb();
  const operators = db.prepare(`
    SELECT DISTINCT operator_id as id, operator_name as name
    FROM operation_logs
    ORDER BY operator_name
  `).all();
  res.json({ code: 0, data: operators });
});

export default router;
