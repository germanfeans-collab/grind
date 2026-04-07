// cuotas.js
const express = require('express');
const router = express.Router();
const { query, run, get, lastInsertId } = require('../db/database');

router.get('/', (req, res) => {
  const { socio_id } = req.query;
  let sql = `SELECT c.*, s.nombre, s.apellido, p.nombre as plan_nombre
    FROM cuotas c LEFT JOIN socios s ON c.socio_id=s.id LEFT JOIN planes p ON c.plan_id=p.id`;
  const params = [];
  if (socio_id) { sql += ' WHERE c.socio_id=?'; params.push(socio_id); }
  sql += ' ORDER BY c.fecha_pago DESC LIMIT 200';
  res.json(query(sql, params));
});

router.post('/', (req, res) => {
  const { socio_id, plan_id, monto, metodo_pago, notas, fecha_vencimiento } = req.body;
  if (!socio_id || !plan_id) return res.status(400).json({ error: 'socio_id y plan_id requeridos' });
  const plan = get('SELECT * FROM planes WHERE id=?', [plan_id]);
  let venc = fecha_vencimiento;
  if (!venc) {
    const dias = plan?.tipo === 'mensual' ? 30 : 1;
    venc = new Date(Date.now() + dias * 86400000).toISOString().slice(0,10);
  }
  run(`INSERT INTO cuotas (socio_id,plan_id,monto,fecha_vencimiento,metodo_pago,notas) VALUES (?,?,?,?,?,?)`,
    [socio_id, plan_id, monto || plan?.precio || 0, venc, metodo_pago || 'efectivo', notas || '']);
  res.json({ ok: true, id: lastInsertId(), fecha_vencimiento: venc });
});

router.delete('/:id', (req, res) => {
  run('DELETE FROM cuotas WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
