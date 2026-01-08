const db = require("../config/db");

// Obtener ranking global
exports.getRankingGlobal = async (req, res) => {
  try {
    const { categoria = "8", sexo = "M" } = req.query;

    const query = `
      SELECT 
        c.ClienteId as id,
        c.ClienteNombre as nombre,
        c.ClienteCategoria as categoria,
        c.ClienteSexo as sexo,
        (
          COALESCE(puntos_partidos.puntos, 0) +
          COALESCE(puntos_torneos.puntos, 0)
        ) as puntos,
        COALESCE(puntos_partidos.partidosJugados, 0) as partidosJugados,
        COALESCE(puntos_torneos.subTorneos, 0) as subTorneos
      FROM clientes c
      LEFT JOIN (
        SELECT 
          pj.ClienteId,
          SUM(CASE 
            WHEN pj.PartidoJugadorResultado = 'G' THEN 100 
            WHEN pj.PartidoJugadorResultado = 'P' THEN 30 
            ELSE 0 
          END) as puntos,
          COUNT(DISTINCT CASE WHEN pj.PartidoJugadorResultado IS NOT NULL AND pj.PartidoJugadorResultado != '' THEN pj.PartidoId END) as partidosJugados
        FROM PartidoJugador pj
        INNER JOIN Partido p ON pj.PartidoId = p.PartidoId AND p.PartidoSexo != 'X'
        GROUP BY pj.ClienteId
      ) puntos_partidos ON c.ClienteId = puntos_partidos.ClienteId
      LEFT JOIN (
        SELECT 
          tj.ClienteId,
          SUM(CASE 
            WHEN tj.TorneoJugadorRol = 'C' THEN 1000
            WHEN tj.TorneoJugadorRol = 'V' THEN 500
            ELSE 0
          END) as puntos,
          COUNT(DISTINCT tj.TorneoId) as subTorneos
        FROM torneojugador tj
        INNER JOIN torneo t ON tj.TorneoId = t.TorneoId
        WHERE t.TorneoCategoria = ?
        GROUP BY tj.ClienteId
      ) puntos_torneos ON c.ClienteId = puntos_torneos.ClienteId
      WHERE c.ClienteCategoria = ? AND c.ClienteSexo = ?
        AND (puntos_partidos.partidosJugados > 0 OR puntos_torneos.subTorneos > 0)
      ORDER BY puntos DESC, partidosJugados DESC
    `;

    db.query(query, [categoria, categoria, sexo], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      res.json({ data: results });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener ranking por competencia
exports.getRankingCompetencia = async (req, res) => {
  try {
    const { categoria = "8", sexo = "M", competenciaId } = req.query;

    if (!competenciaId) {
      return res.status(400).json({ message: "ID de competencia requerido" });
    }

    // Primero obtener las fechas de la competencia
    const competenciaQuery = `
      SELECT CompetenciaFechaInicio, CompetenciaFechaFin 
      FROM Competencia 
      WHERE CompetenciaId = ?
    `;

    db.query(competenciaQuery, [competenciaId], (err, competenciaResult) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (competenciaResult.length === 0) {
        return res.status(404).json({ message: "Competencia no encontrada" });
      }

      const { CompetenciaFechaInicio, CompetenciaFechaFin } =
        competenciaResult[0];

      const rankingQuery = `
        SELECT 
          c.ClienteId as id,
          c.ClienteNombre as nombre,
          c.ClienteCategoria as categoria,
          c.ClienteSexo as sexo,
          (
            COALESCE(puntos_partidos.puntos, 0) +
            COALESCE(puntos_torneos.puntos, 0)
          ) as puntos,
          COALESCE(puntos_partidos.partidosJugados, 0) as partidosJugados,
          COALESCE(puntos_torneos.subTorneos, 0) as subTorneos
        FROM clientes c
        LEFT JOIN (
          SELECT 
            pj.ClienteId,
            SUM(CASE 
              WHEN pj.PartidoJugadorResultado = 'G' THEN 100 
              WHEN pj.PartidoJugadorResultado = 'P' THEN 30 
              ELSE 0 
            END) as puntos,
            COUNT(DISTINCT CASE WHEN pj.PartidoJugadorResultado IS NOT NULL AND pj.PartidoJugadorResultado != '' THEN pj.PartidoId END) as partidosJugados
          FROM PartidoJugador pj
          INNER JOIN Partido p ON pj.PartidoId = p.PartidoId 
            AND p.PartidoSexo != 'X'
            AND p.PartidoFecha >= ? 
            AND p.PartidoFecha <= ?
          GROUP BY pj.ClienteId
        ) puntos_partidos ON c.ClienteId = puntos_partidos.ClienteId
        LEFT JOIN (
          SELECT 
            tj.ClienteId,
            SUM(CASE 
              WHEN tj.TorneoJugadorRol = 'C' THEN 1000
              WHEN tj.TorneoJugadorRol = 'V' THEN 500
              ELSE 0
            END) as puntos,
            COUNT(DISTINCT tj.TorneoId) as subTorneos
          FROM torneojugador tj
          INNER JOIN torneo t ON tj.TorneoId = t.TorneoId
          WHERE t.TorneoCategoria = ?
            AND t.TorneoFechaInicio >= ?
            AND t.TorneoFechaFin <= ?
          GROUP BY tj.ClienteId
        ) puntos_torneos ON c.ClienteId = puntos_torneos.ClienteId
        WHERE c.ClienteCategoria = ? 
          AND c.ClienteSexo = ?
          AND (puntos_partidos.partidosJugados > 0 OR puntos_torneos.subTorneos > 0)
        ORDER BY puntos DESC, partidosJugados DESC
      `;

      db.query(
        rankingQuery,
        [
          CompetenciaFechaInicio,
          CompetenciaFechaFin, // Para filtrar partidos
          categoria, // Para filtrar torneos por categoría
          CompetenciaFechaInicio,
          CompetenciaFechaFin, // Para filtrar torneos por fecha
          categoria,
          sexo, // Para filtrar clientes
        ],
        (err, results) => {
          if (err) {
            return res.status(500).json({ message: err.message });
          }
          res.json({ data: results });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
