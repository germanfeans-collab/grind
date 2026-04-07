const express = require('express');
const router = express.Router();
const { query, run, get, lastInsertId } = require('../db/database');

// Mis inscripciones (alumno) o todas (admin)
router.get('/', (req, res) => {
  const { socio_id } = req.query;
  const id = socio_id || (req.session.user?.rol === 'alumno' ? req.session.user?.socio_id : null);
  let sql = `SELECT i.*, c.nombre as clase_nombre, c.categoria, c.dia_semana, c.hora_inicio, c.hora_fin, c.instructor, s.nombre as socio_nombre, s.apellido as socio_apellido
    FROM inscripciones i JOIN clases c ON i.clase_id=c.id JOIN socios s ON i.socio_id=s.id WHERE i.estado='activa'`;
  const params = [];
  if (id) { sql += ' AND i.socio_id=?'; params.push(id); }
  res.json(query(sql, params));
});

// Inscribirse a una clase
router.post('/', (req, res) => {
  const user = req.session.user;
  const clase_id = req.body.clase_id;
  // admin puede inscribir a cualquier socio, alumno solo a sí mismo
  const socio_id = user.rol === 'admin' ? req.body.socio_id : user.socio_id;
  if (!socio_id) return res.status(400).json({ error: 'socio_id requerido' });

  // Check capacidad
  const clase = get(`SELECT c.*, (SELECT COUNT(*) FROM inscripciones i WHERE i.clase_id=c.id AND i.estado='activa') as inscriptos FROM clases c WHERE c.id=?`, [clase_id]);
  if (!clase) return res.status(404).json({ error: 'Clase no encontrada' });
  if (clase.inscriptos >= clase.capacidad) return res.status(409).json({ error: 'Clase llena' });

  // Check ya inscripto
  const existing = get('SELECT id FROM inscripciones WHERE socio_id=? AND clase_id=? AND estado=?', [socio_id, clase_id, 'activa']);
  if (existing) return res.status(409).json({ error: 'Ya estás inscripto en esta clase' });

  run(`INSERT INTO inscripciones (socio_id,clase_id) VALUES (?,?)`, [socio_id, clase_id]);
  res.json({ ok: true, id: lastInsertId() });
});

// Cancelar inscripción
router.delete('/:id', (req, res) => {
  const user = req.session.user;
  const insc = get('SELECT * FROM inscripciones WHERE id=?', [req.params.id]);
  if (!insc) return res.status(404).json({ error: 'No encontrada' });
  if (user.rol !== 'admin' && insc.socio_id !== user.socio_id) return res.status(403).json({ error: 'Sin permiso' });
  run('UPDATE inscripciones SET estado=? WHERE id=?', ['cancelada', req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
