const express = require('express');
const router = express.Router();
const { query, run, get, lastInsertId } = require('../db/database');

router.get('/',    (req, res) => res.json(query('SELECT * FROM planes WHERE activo=1 ORDER BY tipo,precio')));
router.get('/all', (req, res) => res.json(query('SELECT * FROM planes ORDER BY tipo,precio')));

router.post('/', (req, res) => {
  const { nombre, descripcion, precio, tipo } = req.body;
  if (!nombre || !precio) return res.status(400).json({ error: 'nombre y precio requeridos' });
  run(`INSERT INTO planes (nombre,descripcion,precio,tipo) VALUES (?,?,?,?)`,
    [nombre, descripcion || '', precio, tipo || 'mensual']);
  res.json({ ok: true, id: lastInsertId() });
});

router.put('/:id', (req, res) => {
  const { nombre, descripcion, precio, tipo, activo } = req.body;
  run(`UPDATE planes SET nombre=?,descripcion=?,precio=?,tipo=?,activo=? WHERE id=?`,
    [nombre, descripcion, precio, tipo, activo ?? 1, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  run('UPDATE planes SET activo=0 WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
