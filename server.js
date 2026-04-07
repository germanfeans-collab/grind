const express = require('express');
const session = require('express-session');
const path = require('path');
const { getDB, ensureSocioIdCol } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'grind-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'No autorizado' });
}
function requireAdmin(req, res, next) {
  if (req.session.user?.rol === 'admin') return next();
  res.status(403).json({ error: 'Solo administradores' });
}

getDB().then(() => {
  ensureSocioIdCol();

  app.use('/api/auth',         require('./routes/auth'));
  app.use('/api/socios',       requireAuth, requireAdmin, require('./routes/socios'));
  app.use('/api/cuotas',       requireAuth, requireAdmin, require('./routes/cuotas'));
  app.use('/api/accesos',      requireAuth, requireAdmin, require('./routes/accesos'));
  app.use('/api/clases',       requireAuth, require('./routes/clases'));
  app.use('/api/inscripciones',requireAuth, require('./routes/inscripciones'));
  app.use('/api/planes',       requireAuth, requireAdmin, require('./routes/planes'));
  app.use('/api/dashboard',    requireAuth, requireAdmin, require('./routes/dashboard'));

  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n💪 GRIND corriendo en http://localhost:${PORT}`);
    console.log(`   Admin: admin / grind2024`);
    console.log(`   Demo alumno: demo / demo\n`);
  });
}).catch(err => console.error('Error DB:', err));
