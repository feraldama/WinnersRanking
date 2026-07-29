const db = require("../config/db");

// Escala de puntos del ranking
const PUNTOS_PARTIDO_GANADO = 3;
const PUNTOS_PARTIDO_PERDIDO = 1;
const PUNTOS_TORNEO_CAMPEON = 5;
const PUNTOS_TORNEO_VICECAMPEON = 3;

// Estadística de partidos por jugador.
// Si filtrarFechas = true agrega dos parámetros: fechaInicio, fechaFin.
const subqueryPartidos = (filtrarFechas) => `
  SELECT
    pj.ClienteId,
    SUM(CASE
      WHEN pj.PartidoJugadorResultado = 'G' THEN ${PUNTOS_PARTIDO_GANADO}
      WHEN pj.PartidoJugadorResultado = 'P' THEN ${PUNTOS_PARTIDO_PERDIDO}
      ELSE 0
    END) as puntos,
    -- PJ cuenta sólo resultados decididos ('G'/'P') para que siempre valga PJ = G + P.
    COUNT(DISTINCT CASE WHEN pj.PartidoJugadorResultado IN ('G', 'P') THEN pj.PartidoId END) as partidosJugados,
    SUM(CASE WHEN pj.PartidoJugadorResultado = 'G' THEN 1 ELSE 0 END) as ganados,
    SUM(CASE WHEN pj.PartidoJugadorResultado = 'P' THEN 1 ELSE 0 END) as perdidos
  FROM PartidoJugador pj
  INNER JOIN Partido p ON pj.PartidoId = p.PartidoId
    AND p.PartidoSexo != 'X'
    ${filtrarFechas ? "AND p.PartidoFecha >= ? AND p.PartidoFecha <= ?" : ""}
  GROUP BY pj.ClienteId
`;

// Estadística de torneos por jugador.
// Siempre agrega el parámetro categoria; si filtrarFechas = true suma fechaInicio, fechaFin.
const subqueryTorneos = (filtrarFechas) => `
  SELECT
    tj.ClienteId,
    SUM(CASE
      WHEN tj.TorneoJugadorRol = 'C' THEN ${PUNTOS_TORNEO_CAMPEON}
      WHEN tj.TorneoJugadorRol = 'V' THEN ${PUNTOS_TORNEO_VICECAMPEON}
      ELSE 0
    END) as puntos,
    COUNT(DISTINCT tj.TorneoId) as subTorneos
  FROM torneojugador tj
  INNER JOIN torneo t ON tj.TorneoId = t.TorneoId
  WHERE t.TorneoCategoria = ?
    ${filtrarFechas ? "AND t.TorneoFechaInicio >= ? AND t.TorneoFechaFin <= ?" : ""}
  GROUP BY tj.ClienteId
`;

// Parámetros en el orden en que aparecen los ? de las consultas de abajo
const armarParametros = (categoria, sexo, fechaInicio, fechaFin) => {
  const filtrarFechas = Boolean(fechaInicio && fechaFin);
  const params = [];
  if (filtrarFechas) params.push(fechaInicio, fechaFin); // subquery partidos
  params.push(categoria); // subquery torneos
  if (filtrarFechas) params.push(fechaInicio, fechaFin); // subquery torneos
  params.push(categoria, sexo); // filtro de clientes
  return params;
};

const queryRankingJugadores = (filtrarFechas) => `
  SELECT
    c.ClienteId as id,
    c.ClienteNombre as nombre,
    c.ClienteApellido as apellido,
    c.ClienteCategoria as categoria,
    c.ClienteSexo as sexo,
    c.EquipoId as equipoId,
    e.EquipoNombre as equipoNombre,
    (
      COALESCE(puntos_partidos.puntos, 0) +
      COALESCE(puntos_torneos.puntos, 0)
    ) as puntos,
    COALESCE(puntos_partidos.partidosJugados, 0) as partidosJugados,
    COALESCE(puntos_partidos.ganados, 0) as ganados,
    COALESCE(puntos_partidos.perdidos, 0) as perdidos,
    COALESCE(puntos_torneos.subTorneos, 0) as subTorneos
  FROM clientes c
  LEFT JOIN Equipo e ON c.EquipoId = e.EquipoId
  LEFT JOIN (${subqueryPartidos(
    filtrarFechas
  )}) puntos_partidos ON c.ClienteId = puntos_partidos.ClienteId
  LEFT JOIN (${subqueryTorneos(
    filtrarFechas
  )}) puntos_torneos ON c.ClienteId = puntos_torneos.ClienteId
  WHERE c.ClienteCategoria = ? AND c.ClienteSexo = ?
    AND (puntos_partidos.partidosJugados > 0 OR puntos_torneos.subTorneos > 0)
  -- ClienteId al final: con la escala 3/1 los empates son frecuentes y sin un
  -- criterio determinista MySQL puede devolver las filas empatadas en distinto
  -- orden en cada consulta (se ven saltar solas al refrescar).
  ORDER BY puntos DESC, ganados DESC, partidosJugados DESC, c.ClienteId ASC
`;

// Ranking por equipo: suma los puntos de los jugadores del equipo que
// cumplen los mismos filtros de categoría y sexo que el ranking individual.
const queryRankingEquipos = (filtrarFechas) => `
  SELECT
    e.EquipoId as id,
    e.EquipoNombre as nombre,
    COUNT(DISTINCT c.ClienteId) as jugadores,
    SUM(
      COALESCE(puntos_partidos.puntos, 0) +
      COALESCE(puntos_torneos.puntos, 0)
    ) as puntos,
    SUM(COALESCE(puntos_partidos.partidosJugados, 0)) as partidosJugados,
    SUM(COALESCE(puntos_partidos.ganados, 0)) as ganados,
    SUM(COALESCE(puntos_partidos.perdidos, 0)) as perdidos,
    SUM(COALESCE(puntos_torneos.subTorneos, 0)) as subTorneos,
    ROUND(
      SUM(
        COALESCE(puntos_partidos.puntos, 0) +
        COALESCE(puntos_torneos.puntos, 0)
      ) / COUNT(DISTINCT c.ClienteId),
      1
    ) as promedio
  FROM Equipo e
  INNER JOIN clientes c ON c.EquipoId = e.EquipoId
  LEFT JOIN (${subqueryPartidos(
    filtrarFechas
  )}) puntos_partidos ON c.ClienteId = puntos_partidos.ClienteId
  LEFT JOIN (${subqueryTorneos(
    filtrarFechas
  )}) puntos_torneos ON c.ClienteId = puntos_torneos.ClienteId
  WHERE c.ClienteCategoria = ? AND c.ClienteSexo = ?
    AND (puntos_partidos.partidosJugados > 0 OR puntos_torneos.subTorneos > 0)
  GROUP BY e.EquipoId, e.EquipoNombre
  ORDER BY puntos DESC, ganados DESC, partidosJugados DESC, e.EquipoId ASC
`;

// Obtener las fechas de una competencia
const getFechasCompetencia = (competenciaId) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT CompetenciaFechaInicio, CompetenciaFechaFin
       FROM Competencia
       WHERE CompetenciaId = ?`,
      [competenciaId],
      (err, results) => {
        if (err) return reject(err);
        if (results.length === 0) return resolve(null);
        resolve({
          fechaInicio: results[0].CompetenciaFechaInicio,
          fechaFin: results[0].CompetenciaFechaFin,
        });
      }
    );
  });
};

// SUM() y ROUND() devuelven DECIMAL y mysql2 los entrega como string:
// se normalizan a número para que el cliente reciba valores numéricos.
const CAMPOS_NUMERICOS = [
  "puntos",
  "partidosJugados",
  "ganados",
  "perdidos",
  "subTorneos",
  "jugadores",
  "promedio",
];

const normalizarNumeros = (results) =>
  results.map((fila) => {
    const normalizada = { ...fila };
    CAMPOS_NUMERICOS.forEach((campo) => {
      if (normalizada[campo] !== undefined && normalizada[campo] !== null) {
        normalizada[campo] = Number(normalizada[campo]);
      }
    });
    return normalizada;
  });

const consultar = (query, params) =>
  new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

/**
 * Racha de victorias consecutivas: cuenta los partidos ganados desde el más
 * reciente hacia atrás y corta en la primera derrota. 0 si el último partido
 * decidido fue una derrota.
 *
 * Se calcula en JS y no en SQL a propósito: no requiere window functions, así
 * que funciona en cualquier versión de MySQL.
 */
const calcularRachas = async (clienteIds, fechaInicio, fechaFin) => {
  const rachas = new Map();
  if (clienteIds.length === 0) return rachas;

  const placeholders = clienteIds.map(() => "?").join(", ");
  const filtrarFechas = Boolean(fechaInicio && fechaFin);
  const params = [...clienteIds];
  if (filtrarFechas) params.push(fechaInicio, fechaFin);

  const rows = await consultar(
    `SELECT
       pj.ClienteId,
       pj.PartidoJugadorResultado as resultado
     FROM PartidoJugador pj
     INNER JOIN Partido p ON pj.PartidoId = p.PartidoId AND p.PartidoSexo != 'X'
     WHERE pj.ClienteId IN (${placeholders})
       AND pj.PartidoJugadorResultado IN ('G', 'P')
       ${filtrarFechas ? "AND p.PartidoFecha >= ? AND p.PartidoFecha <= ?" : ""}
     ORDER BY pj.ClienteId, p.PartidoFecha DESC, p.PartidoHoraInicio DESC, pj.PartidoId DESC`,
    params
  );

  // Los partidos vienen agrupados por jugador y del más reciente al más antiguo.
  const cortados = new Set();
  for (const row of rows) {
    const id = String(row.ClienteId);
    if (!rachas.has(id)) rachas.set(id, 0);
    if (cortados.has(id)) continue;
    if (row.resultado === "G") {
      rachas.set(id, rachas.get(id) + 1);
    } else {
      cortados.add(id);
    }
  }

  return rachas;
};

const ejecutarRanking = async (
  res,
  query,
  params,
  { conRacha = false, fechaInicio, fechaFin } = {}
) => {
  try {
    const results = normalizarNumeros(await consultar(query, params));

    if (conRacha) {
      const rachas = await calcularRachas(
        results.map((fila) => fila.id),
        fechaInicio,
        fechaFin
      );
      results.forEach((fila) => {
        fila.racha = rachas.get(String(fila.id)) || 0;
      });
    }

    res.json({ data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener ranking global de jugadores
exports.getRankingGlobal = async (req, res) => {
  try {
    const { categoria = "8", sexo = "M" } = req.query;
    ejecutarRanking(
      res,
      queryRankingJugadores(false),
      armarParametros(categoria, sexo),
      { conRacha: true }
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener ranking de jugadores por competencia
exports.getRankingCompetencia = async (req, res) => {
  try {
    const { categoria = "8", sexo = "M", competenciaId } = req.query;

    if (!competenciaId) {
      return res.status(400).json({ message: "ID de competencia requerido" });
    }

    const fechas = await getFechasCompetencia(competenciaId);
    if (!fechas) {
      return res.status(404).json({ message: "Competencia no encontrada" });
    }

    ejecutarRanking(
      res,
      queryRankingJugadores(true),
      armarParametros(categoria, sexo, fechas.fechaInicio, fechas.fechaFin),
      {
        conRacha: true,
        fechaInicio: fechas.fechaInicio,
        fechaFin: fechas.fechaFin,
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener ranking global de equipos
exports.getRankingEquipos = async (req, res) => {
  try {
    const { categoria = "8", sexo = "M" } = req.query;
    ejecutarRanking(
      res,
      queryRankingEquipos(false),
      armarParametros(categoria, sexo)
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener ranking de equipos por competencia
exports.getRankingEquiposCompetencia = async (req, res) => {
  try {
    const { categoria = "8", sexo = "M", competenciaId } = req.query;

    if (!competenciaId) {
      return res.status(400).json({ message: "ID de competencia requerido" });
    }

    const fechas = await getFechasCompetencia(competenciaId);
    if (!fechas) {
      return res.status(404).json({ message: "Competencia no encontrada" });
    }

    ejecutarRanking(
      res,
      queryRankingEquipos(true),
      armarParametros(categoria, sexo, fechas.fechaInicio, fechas.fechaFin)
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
