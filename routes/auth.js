const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get } = require('../db/database');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = get('SELECT * FROM usuarios WHERE username=?', [username]);
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });
  req.session.user = { id: user.id, username: user.username, rol: user.rol, nombre: user.nombre, socio_id: user.socio_id };
  res.json({ ok: true, user: req.session.user });
});

router.post('/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });

router.get('/me', (req, res) => {
  if (req.session.user) return res.json(req.session.user);
  res.status(401).json({ error: 'No autenticado' });
});

module.exports = router;
