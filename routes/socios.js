const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { query, run, get, lastInsertId } = require('../db/database');

router.get('/', (req, res) => {
  const { buscar } = req.query;
  let sql = `SELECT s.*,
    (SELECT MAX(c.fecha_vencimiento) FROM cuotas c WHERE c.socio_id=s.id) as vencimiento,
    (SELECT MAX(a.fecha_hora) FROM accesos a WHERE a.socio_id=s.id) as ultimo_acceso,
    (SELECT COUNT(*) FROM inscripciones i WHERE i.socio_id=s.id AND i.estado='activa') as clases_inscriptas
    FROM socios s WHERE s.activo=1`;
  const params = [];
  if (buscar) { sql += ` AND (s.nombre LIKE ? OR s.apellido LIKE ? OR s.dni LIKE ?)`; params.push(`%${buscar}%`,`%${buscar}%`,`%${buscar}%`); }
  sql += ' ORDER BY s.apellido, s.nombre';
  res.json(query(sql, params));
});

router.get('/:id', (req, res) => {
  const s = get('SELECT * FROM socios WHERE id=?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'No encontrado' });
  s.cuotas = query(`SELECT c.*, p.nombre as plan_nombre FROM cuotas c LEFT JOIN planes p ON c.plan_id=p.id WHERE c.socio_id=? ORDER BY c.fecha_pago DESC`, [s.id]);
  s.inscripciones = query(`SELECT i.*, cl.nombre as clase_nombre, cl.categoria, cl.dia_semana, cl.hora_inicio FROM inscripciones i JOIN clases cl ON i.clase_id=cl.id WHERE i.socio_id=? AND i.estado='activa'`, [s.id]);
  s.accesos = query('SELECT * FROM accesos WHERE socio_id=? ORDER BY fecha_hora DESC LIMIT 15', [s.id]);
  res.json(s);
});

router.post('/', async (req, res) => {
  const { nombre, apellido, dni, telefono, email, fecha_nacimiento, notas } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ error: 'Nombre y apellido requeridos' });
  run(`INSERT INTO socios (nombre,apellido,dni,telefono,email,fecha_nacimiento,notas) VALUES (?,?,?,?,?,?,?)`,
    [nombre, apellido, dni, telefono, email, fecha_nacimiento, notas]);
  const id = lastInsertId();
  const qr = await QRCode.toDataURL(JSON.stringify({id,nombre,apellido,dni}),{width:280,margin:2});
  run('UPDATE socios SET qr_code=? WHERE id=?',[qr,id]);
  res.json({ ok: true, id });
});

router.put('/:id', (req, res) => {
  const { nombre, apellido, dni, telefono, email, fecha_nacimiento, notas } = req.body;
  run(`UPDATE socios SET nombre=?,apellido=?,dni=?,telefono=?,email=?,fecha_nacimiento=?,notas=? WHERE id=?`,
    [nombre, apellido, dni, telefono, email, fecha_nacimiento, notas, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  run('UPDATE socios SET activo=0 WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

router.get('/:id/qr', (req, res) => {
  const s = get('SELECT qr_code,nombre,apellido FROM socios WHERE id=?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'No encontrado' });
  res.json({ qr: s.qr_code, nombre: `${s.nombre} ${s.apellido}` });
});

router.post('/verificar-qr', (req, res) => {
  try {
    const data = JSON.parse(req.body.qr_data);
    const s = get(`SELECT s.*, (SELECT MAX(c.fecha_vencimiento) FROM cuotas c WHERE c.socio_id=s.id) as vencimiento FROM socios s WHERE s.id=?`, [data.id]);
    if (!s) return res.json({ ok: false, mensaje: 'Socio no encontrado' });
    if (!s.activo) return res.json({ ok: false, mensaje: 'Socio inactivo' });
    const hoy = new Date().toISOString().slice(0,10);
    const alDia = s.vencimiento && s.vencimiento >= hoy;
    run('INSERT INTO accesos (socio_id) VALUES (?)', [s.id]);
    res.json({ ok: alDia, socio: s, vencimiento: s.vencimiento, alDia, mensaje: alDia ? '✅ Acceso permitido' : '⚠️ Cuota vencida' });
  } catch(e) { res.json({ ok: false, mensaje: 'QR inválido' }); }
});

module.exports = router;
