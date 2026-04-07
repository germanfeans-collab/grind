const express = require('express');
const router = express.Router();
const { query, run, get, lastInsertId } = require('../db/database');

// List all (admin ve todas, alumno ve las activas)
router.get('/', (req, res) => {
  const { categoria } = req.query;
  const isAdmin = req.session.user?.rol === 'admin';
  let sql = `SELECT c.*,
    (SELECT COUNT(*) FROM inscripciones i WHERE i.clase_id=c.id AND i.estado='activa') as inscriptos
    FROM clases c WHERE ${isAdmin ? '1=1' : 'c.activa=1'}`;
  const params = [];
  if (categoria) { sql += ' AND c.categoria=?'; params.push(categoria); }
  sql += ' ORDER BY CASE c.dia_semana WHEN "Lunes" THEN 1 WHEN "Martes" THEN 2 WHEN "Miércoles" THEN 3 WHEN "Jueves" THEN 4 WHEN "Viernes" THEN 5 WHEN "Sábado" THEN 6 ELSE 7 END, c.hora_inicio';
  res.json(query(sql, params));
});

router.get('/:id', (req, res) => {
  const c = get(`SELECT c.*, (SELECT COUNT(*) FROM inscripciones i WHERE i.clase_id=c.id AND i.estado='activa') as inscriptos FROM clases c WHERE c.id=?`, [req.params.id]);
  if (!c) return res.status(404).json({ error: 'No encontrada' });
  c.alumnos = query(`SELECT s.nombre, s.apellido, s.telefono FROM inscripciones i JOIN socios s ON i.socio_id=s.id WHERE i.clase_id=? AND i.estado='activa'`, [req.params.id]);
  res.json(c);
});

router.post('/', (req, res) => {
  if (req.session.user?.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const { nombre, categoria, descripcion, instructor, dia_semana, hora_inicio, hora_fin, capacidad } = req.body;
  if (!nombre || !categoria || !dia_semana) return res.status(400).json({ error: 'Campos requeridos' });
  run(`INSERT INTO clases (nombre,categoria,descripcion,instructor,dia_semana,hora_inicio,hora_fin,capacidad) VALUES (?,?,?,?,?,?,?,?)`,
    [nombre, categoria, descripcion||'', instructor||'', dia_semana, hora_inicio||'09:00', hora_fin||'10:00', capacidad||10]);
  res.json({ ok: true, id: lastInsertId() });
});

router.put('/:id', (req, res) => {
  if (req.session.user?.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const { nombre, categoria, descripcion, instructor, dia_semana, hora_inicio, hora_fin, capacidad, activa } = req.body;
  run(`UPDATE clases SET nombre=?,categoria=?,descripcion=?,instructor=?,dia_semana=?,hora_inicio=?,hora_fin=?,capacidad=?,activa=? WHERE id=?`,
    [nombre, categoria, descripcion, instructor, dia_semana, hora_inicio, hora_fin, capacidad, activa??1, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  if (req.session.user?.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  run('UPDATE clases SET activa=0 WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
