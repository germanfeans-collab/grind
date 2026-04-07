const express = require('express');
const router = express.Router();
const { query, run } = require('../db/database');

router.get('/', (req, res) => {
  const { fecha } = req.query;
  let sql = `SELECT a.*, s.nombre, s.apellido FROM accesos a LEFT JOIN socios s ON a.socio_id=s.id`;
  const params = [];
  if (fecha) { sql += ' WHERE date(a.fecha_hora)=?'; params.push(fecha); }
  sql += ' ORDER BY a.fecha_hora DESC LIMIT 300';
  res.json(query(sql, params));
});

router.post('/', (req, res) => {
  run('INSERT INTO accesos (socio_id) VALUES (?)', [req.body.socio_id]);
  res.json({ ok: true });
});

module.exports = router;
