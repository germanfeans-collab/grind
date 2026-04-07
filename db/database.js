const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

let db;

async function getDB() {
  if (db) return db;
  const SQL = await initSqlJs();
  db = new SQL.Database();
  initSchema();
  await seedDemo();
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'admin',
      nombre TEXT,
      socio_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS socios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      dni TEXT,
      telefono TEXT,
      email TEXT,
      fecha_nacimiento TEXT,
      qr_code TEXT,
      activo INTEGER DEFAULT 1,
      fecha_alta TEXT DEFAULT (datetime('now','localtime')),
      notas TEXT
    );
    CREATE TABLE IF NOT EXISTS planes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL,
      tipo TEXT DEFAULT 'mensual',
      activo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS cuotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      socio_id INTEGER,
      plan_id INTEGER,
      monto REAL,
      fecha_pago TEXT DEFAULT (datetime('now','localtime')),
      fecha_vencimiento TEXT,
      metodo_pago TEXT DEFAULT 'efectivo',
      notas TEXT,
      FOREIGN KEY(socio_id) REFERENCES socios(id),
      FOREIGN KEY(plan_id) REFERENCES planes(id)
    );
    CREATE TABLE IF NOT EXISTS clases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descripcion TEXT,
      instructor TEXT,
      dia_semana TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      capacidad INTEGER DEFAULT 10,
      activa INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS inscripciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      socio_id INTEGER,
      clase_id INTEGER,
      fecha TEXT DEFAULT (date('now','localtime')),
      estado TEXT DEFAULT 'activa',
      UNIQUE(socio_id, clase_id),
      FOREIGN KEY(socio_id) REFERENCES socios(id),
      FOREIGN KEY(clase_id) REFERENCES clases(id)
    );
    CREATE TABLE IF NOT EXISTS accesos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      socio_id INTEGER,
      fecha_hora TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(socio_id) REFERENCES socios(id)
    );
  `);
}

async function seedDemo() {
  const passAdmin = await bcrypt.hash('grind2024', 10);
  const passDemo  = await bcrypt.hash('demo', 10);

  db.run(`INSERT OR IGNORE INTO usuarios (username,password,rol,nombre) VALUES (?,?,?,?)`,
    ['admin', passAdmin, 'admin', 'Administrador GRIND']);
  db.run(`INSERT OR IGNORE INTO usuarios (username,password,rol,nombre) VALUES (?,?,?,?)`,
    ['demo', passDemo, 'alumno', 'Alumno Demo']);

  // Planes
  db.run(`INSERT INTO planes (nombre,descripcion,precio,tipo) VALUES
    ('Mensual Fitness','Acceso ilimitado a clases de FITNESS',12000,'mensual'),
    ('Mensual Combate','Acceso ilimitado a clases de COMBATE',14000,'mensual'),
    ('Mensual Full','Acceso a todas las categorías',18000,'mensual'),
    ('Clase Particular','Sesión individual con instructor',5000,'particular'),
    ('Pack 4 Clases Particulares','4 sesiones con instructor',16000,'particular')`);

  // Clases
  const clases = [
    // COMBATE
    ['Box Técnico',     'COMBATE', 'Técnica de boxeo para todos los niveles', 'Marcos R.',  'Lunes',    '18:00','19:00', 12],
    ['Kickboxing',      'COMBATE', 'Combinación de box y patadas',             'Marcos R.',  'Miércoles','18:00','19:00', 10],
    ['MMA Iniciación',  'COMBATE', 'Artes marciales mixtas, nivel inicial',    'Diego V.',   'Viernes',  '19:00','20:30', 8 ],
    ['Muay Thai',       'COMBATE', 'Arte marcial tailandés',                   'Diego V.',   'Martes',   '20:00','21:30', 10],
    // FITNESS
    ['Funcional',       'FITNESS', 'Entrenamiento funcional de alta intensidad','Laura P.',  'Lunes',    '07:00','08:00', 15],
    ['Spinning',        'FITNESS', 'Ciclismo indoor con música',               'Laura P.',  'Miércoles','07:00','08:00', 14],
    ['HIIT',            'FITNESS', 'Intervalos de alta intensidad',            'Sofía M.',  'Martes',   '08:00','09:00', 15],
    ['Yoga',            'FITNESS', 'Flexibilidad, equilibrio y respiración',   'Sofía M.',  'Jueves',   '09:00','10:00', 12],
    ['Pilates',         'FITNESS', 'Fortalecimiento y postura corporal',       'Ana G.',    'Viernes',  '08:00','09:00', 10],
    // PERSONAL
    ['Personal Training','PERSONAL','Entrenamiento personalizado 1 a 1',       'Carlos H.', 'Lunes',    '10:00','11:00', 1 ],
    ['Personal Training','PERSONAL','Entrenamiento personalizado 1 a 1',       'Carlos H.', 'Miércoles','10:00','11:00', 1 ],
    ['Personal Training','PERSONAL','Entrenamiento personalizado 1 a 1',       'Carlos H.', 'Viernes',  '10:00','11:00', 1 ],
    ['Nutrición + Entreno','PERSONAL','Plan nutricional + entrenamiento',       'Carlos H.', 'Martes',   '11:00','12:00', 1 ],
  ];
  for (const [n,c,d,i,dia,hi,hf,cap] of clases) {
    db.run(`INSERT INTO clases (nombre,categoria,descripcion,instructor,dia_semana,hora_inicio,hora_fin,capacidad) VALUES (?,?,?,?,?,?,?,?)`,
      [n,c,d,i,dia,hi,hf,cap]);
  }

  // Socios demo
  const socios = [
    ['Lucía',   'Ramírez',  '30111222','11-4521-8800','lucia@gmail.com',   '1992-03-15'],
    ['Martín',  'González', '28444555','11-3698-7741','martin@gmail.com',  '1988-07-22'],
    ['Valentina','López',   '35222333','11-5544-9923','valen@gmail.com',   '1998-11-05'],
    ['Federico','Herrera',  '27888999','11-4410-2233','fede@yahoo.com',    '1985-02-28'],
    ['Camila',  'Torres',   '38000111','11-6677-4411','cami@gmail.com',    '2000-09-18'],
    ['Diego',   'Sánchez',  '31333444','11-2255-8899','diego@gmail.com',   '1991-04-12'],
    ['Sofía',   'Pérez',    '29666777','11-7788-1122','sofi@gmail.com',    '1994-12-01'],
    ['Ignacio', 'Martínez', '33999000','11-9900-3344','nacho@gmail.com',   '1996-06-30'],
    ['Antonella','Romero',  '36111222','11-1122-5566','anto@gmail.com',    '2001-08-14'],
    ['Leandro', 'Ruiz',     '26666777','11-2244-6688','lean@gmail.com',    '1983-11-17'],
  ];

  const today = new Date();
  for (let i = 0; i < socios.length; i++) {
    const [n,a,d,t,e,fn] = socios[i];
    db.run(`INSERT INTO socios (nombre,apellido,dni,telefono,email,fecha_nacimiento) VALUES (?,?,?,?,?,?)`,
      [n,a,d,t,e,fn]);
    const socioId = query('SELECT last_insert_rowid() as id')[0].id;
    const qrCode = await QRCode.toDataURL(JSON.stringify({id:socioId,nombre:n,apellido:a,dni:d}),{width:280,margin:2});
    db.run('UPDATE socios SET qr_code=? WHERE id=?',[qrCode,socioId]);

    // Cuota
    const alDia = i < 7;
    const vencOff = alDia ? Math.floor(Math.random()*25)+3 : -(Math.floor(Math.random()*20)+1);
    const venc = new Date(today); venc.setDate(venc.getDate()+vencOff);
    db.run(`INSERT INTO cuotas (socio_id,plan_id,monto,fecha_vencimiento,metodo_pago) VALUES (?,?,?,?,?)`,
      [socioId, i%3+1, i%3===0?12000:i%3===1?14000:18000, venc.toISOString().slice(0,10), ['efectivo','transferencia','débito'][i%3]]);

    // Accesos últimos días
    if (alDia) {
      for (let j=0;j<Math.floor(Math.random()*10)+4;j++) {
        const d2=new Date(today); d2.setDate(d2.getDate()-Math.floor(Math.random()*7));
        const h=7+Math.floor(Math.random()*13), m=Math.floor(Math.random()*60);
        db.run(`INSERT INTO accesos (socio_id,fecha_hora) VALUES (?,?)`,
          [socioId, d2.toISOString().slice(0,10)+` ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`]);
      }
    }

    // Inscripciones a clases
    if (alDia) {
      const claseIds = query('SELECT id FROM clases ORDER BY RANDOM() LIMIT 3').map(r=>r.id);
      for (const cid of claseIds) {
        db.run(`INSERT OR IGNORE INTO inscripciones (socio_id,clase_id) VALUES (?,?)`, [socioId,cid]);
      }
    }
  }

  // Vincular usuario demo con primer socio
  db.run(`UPDATE usuarios SET nombre='Lucía Ramírez', socio_id=1 WHERE username='demo'`);

  console.log('✅ GRIND demo cargado');
}

// Agregar columna socio_id a usuarios si no existe
function ensureSocioIdCol() {
  try { db.run('ALTER TABLE usuarios ADD COLUMN socio_id INTEGER'); } catch(e) {}
}

function query(sql, params=[]) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows=[];
  while(stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function run(sql, params=[]) { db.run(sql, params); }
function get(sql, params=[]) { return query(sql,params)[0]||null; }
function lastInsertId() { return query('SELECT last_insert_rowid() as id')[0]?.id; }

module.exports = { getDB, query, run, get, lastInsertId, ensureSocioIdCol };
