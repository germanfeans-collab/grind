const express = require('express');
const router = express.Router();
const { query, get } = require('../db/database');

router.get('/', (req, res) => {
  const hoy = new Date().toISOString().slice(0,10);
  const mes = hoy.slice(0,7);

  const totalSocios   = get('SELECT COUNT(*) as n FROM socios WHERE activo=1')?.n || 0;
  const sociosAlDia   = get(`SELECT COUNT(DISTINCT socio_id) as n FROM cuotas WHERE fecha_vencimiento>=?`, [hoy])?.n || 0;
  const accesosHoy    = get(`SELECT COUNT(*) as n FROM accesos WHERE date(fecha_hora)=?`, [hoy])?.n || 0;
  const ingresosMes   = get(`SELECT COALESCE(SUM(monto),0) as t FROM cuotas WHERE strftime('%Y-%m',fecha_pago)=?`, [mes])?.t || 0;
  const totalClases   = get('SELECT COUNT(*) as n FROM clases WHERE activa=1')?.n || 0;
  const totalInscr    = get(`SELECT COUNT(*) as n FROM inscripciones WHERE estado='activa'`)?.n || 0;

  const accesosSemana = query(`SELECT date(fecha_hora) as dia, COUNT(*) as cantidad FROM accesos WHERE fecha_hora>=date('now','-6 days') GROUP BY dia ORDER BY dia`);
  const proximosVenc  = query(`SELECT s.nombre, s.apellido, MAX(c.fecha_vencimiento) as vencimiento FROM cuotas c JOIN socios s ON c.socio_id=s.id WHERE c.fecha_vencimiento BETWEEN ? AND date(?,' +7 days') GROUP BY s.id ORDER BY vencimiento LIMIT 8`, [hoy, hoy]);
  const clasesPorCat  = query(`SELECT categoria, COUNT(*) as n FROM clases WHERE activa=1 GROUP BY categoria`);
  const topClases     = query(`SELECT c.nombre, c.categoria, COUNT(i.id) as inscriptos FROM inscripciones i JOIN clases c ON i.clase_id=c.id WHERE i.estado='activa' GROUP BY c.id ORDER BY inscriptos DESC LIMIT 5`);

  res.json({ totalSocios, sociosAlDia, sociosMorosos: totalSocios-sociosAlDia, accesosHoy, ingresosMes, totalClases, totalInscr, accesosSemana, proximosVenc, clasesPorCat, topClases });
});

module.exports = router;
