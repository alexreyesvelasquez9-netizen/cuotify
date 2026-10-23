const express = require('express');
const router = express.Router();
const pool = require('./db');
const { verificarToken, soloAdministrador } = require('./auth');

// ==========================================
// RUTA: Generación masiva de cuotas del mes
// ==========================================
router.post('/generar', verificarToken, soloAdministrador, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { periodo, fecha_vencimiento } = req.body; // Ejemplo periodo: '2026-10-01'
    const id_comunidad = req.usuario.id_comunidad;

    // Obtener viviendas activas de la comunidad
    const [viviendas] = await connection.query(
      'SELECT id_vivienda FROM vivienda WHERE id_comunidad = ? AND activa = TRUE',
      [id_comunidad]
    );

    // Obtener conceptos de cuota activos
    const [conceptos] = await connection.query(
      'SELECT id_concepto, monto FROM concepto_cuota WHERE id_comunidad = ? AND activo = TRUE',
      [id_comunidad]
    );

    let cuotasCreadas = 0;

    // Generar combinaciones evitando duplicados por la restricción UNIQUE
    for (const vivienda of viviendas) {
      for (const concepto of conceptos) {
        try {
          await connection.query(
            `INSERT INTO cuota (id_vivienda, id_concepto, periodo, monto, fecha_vencimiento)
             VALUES (?, ?, ?, ?, ?)`,
            [vivienda.id_vivienda, concepto.id_concepto, periodo, concepto.monto, fecha_vencimiento]
          );
          cuotasCreadas++;
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY') throw err; // Omite duplicados si ya existen
        }
      }
    }

    await connection.commit();
    connection.release();
    res.status(201).json({ mensaje: 'Cuotas generadas masivamente con éxito.', cuotas_creadas: cuotasCreadas });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ message: 'Error al generar cuotas', error: error.message });
  }
});

// ==========================================
// RUTA: Listar cuotas con filtros
// ==========================================
router.get('/', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, cc.nombre AS concepto_nombre, v.identificador AS vivienda_identificador 
       FROM cuota c
       JOIN concepto_cuota cc ON c.id_concepto = cc.id_concepto
       JOIN vivienda v ON c.id_vivienda = v.id_vivienda
       WHERE v.id_comunidad = ?`,
      [req.usuario.id_comunidad]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar cuotas', error: error.message });
  }
});

module.exports = router;
