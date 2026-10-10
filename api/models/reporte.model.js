const db = require("../config/db");

const Reporte = {
  // Obtener estadísticas de jugadores (partidos jugados, ganados, perdidos)
  getEstadisticasJugadores: (
    limit,
    offset,
    sortBy = "totalPartidos",
    sortOrder = "DESC",
    sexo
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ClienteId",
        "ClienteNombre",
        "ClienteApellido",
        "totalPartidos",
        "partidosGanados",
        "partidosPerdidos",
        "porcentajeVictorias",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "totalPartidos";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const whereSexo =
        sexo && ["M", "F", "X"].includes(String(sexo))
          ? "AND p.PartidoSexo = ?"
          : "";
      const query = `
        SELECT 
          c.ClienteId,
          c.ClienteNombre,
          c.ClienteApellido,
          COUNT(DISTINCT pj.PartidoId) as totalPartidos,
          SUM(CASE 
            WHEN pj.PartidoJugadorResultado = 'G' THEN 1 
            ELSE 0 
          END) as partidosGanados,
          SUM(CASE 
            WHEN pj.PartidoJugadorResultado = 'P' THEN 1 
            ELSE 0 
          END) as partidosPerdidos,
          ROUND(
            (SUM(CASE 
              WHEN pj.PartidoJugadorResultado = 'G' THEN 1 
              ELSE 0 
            END) * 100.0 / NULLIF(COUNT(DISTINCT pj.PartidoId), 0)), 2
          ) as porcentajeVictorias
        FROM clientes c
        LEFT JOIN partidojugador pj ON c.ClienteId = pj.ClienteId
        LEFT JOIN partido p ON pj.PartidoId = p.PartidoId
        WHERE p.PartidoEstado = 1 ${whereSexo}
        GROUP BY c.ClienteId, c.ClienteNombre, c.ClienteApellido
        HAVING COUNT(DISTINCT pj.PartidoId) > 0
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const params = [];
      if (whereSexo) params.push(sexo);
      params.push(limit, offset);
      db.query(query, params, (err, results) => {
        if (err) return reject(err);

        // Obtener el total de jugadores con partidos
        const countQuery = `
          SELECT COUNT(*) as total FROM (
            SELECT c.ClienteId
            FROM clientes c
            LEFT JOIN partidojugador pj ON c.ClienteId = pj.ClienteId
            LEFT JOIN partido p ON pj.PartidoId = p.PartidoId
            WHERE p.PartidoEstado = 1 ${whereSexo}
            GROUP BY c.ClienteId
            HAVING COUNT(DISTINCT pj.PartidoId) > 0
          ) as jugadoresConPartidos
        `;
        const countParams = [];
        if (whereSexo) countParams.push(sexo);
        db.query(countQuery, countParams, (err, countResult) => {
          if (err) return reject(err);

          resolve({
            estadisticas: results,
            total: countResult[0].total,
          });
        });
      });
    });
  },

  // Buscar estadísticas de jugadores por término de búsqueda
  searchEstadisticasJugadores: (
    term,
    limit,
    offset,
    sortBy = "totalPartidos",
    sortOrder = "DESC",
    sexo
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ClienteId",
        "ClienteNombre",
        "ClienteApellido",
        "totalPartidos",
        "partidosGanados",
        "partidosPerdidos",
        "porcentajeVictorias",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "totalPartidos";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const whereSexo =
        sexo && ["M", "F", "X"].includes(String(sexo))
          ? "AND p.PartidoSexo = ?"
          : "";
      const searchQuery = `
        SELECT 
          c.ClienteId,
          c.ClienteNombre,
          c.ClienteApellido,
          COUNT(DISTINCT pj.PartidoId) as totalPartidos,
          SUM(CASE 
            WHEN pj.PartidoJugadorResultado = 'G' THEN 1 
            ELSE 0 
          END) as partidosGanados,
          SUM(CASE 
            WHEN pj.PartidoJugadorResultado = 'P' THEN 1 
            ELSE 0 
          END) as partidosPerdidos,
          ROUND(
            (SUM(CASE 
              WHEN pj.PartidoJugadorResultado = 'G' THEN 1 
              ELSE 0 
            END) * 100.0 / NULLIF(COUNT(DISTINCT pj.PartidoId), 0)), 2
          ) as porcentajeVictorias
        FROM clientes c
        LEFT JOIN partidojugador pj ON c.ClienteId = pj.ClienteId
        LEFT JOIN partido p ON pj.PartidoId = p.PartidoId
        WHERE p.PartidoEstado = 1 ${whereSexo}
        AND (c.ClienteNombre LIKE ? 
             OR c.ClienteApellido LIKE ? 
             OR CONCAT(c.ClienteNombre, ' ', c.ClienteApellido) LIKE ?)
        GROUP BY c.ClienteId, c.ClienteNombre, c.ClienteApellido
        HAVING COUNT(DISTINCT pj.PartidoId) > 0
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const searchValue = `%${term}%`;
      const searchParams = [];
      if (whereSexo) searchParams.push(sexo);
      searchParams.push(searchValue, searchValue, searchValue, limit, offset);

      db.query(searchQuery, searchParams, (err, results) => {
        if (err) return reject(err);

        // Obtener el total de jugadores con partidos que coinciden con la búsqueda
        const countQuery = `
          SELECT COUNT(*) as total FROM (
            SELECT c.ClienteId
            FROM clientes c
            LEFT JOIN partidojugador pj ON c.ClienteId = pj.ClienteId
            LEFT JOIN partido p ON pj.PartidoId = p.PartidoId
            WHERE p.PartidoEstado = 1 ${whereSexo}
            AND (c.ClienteNombre LIKE ? 
                 OR c.ClienteApellido LIKE ? 
                 OR CONCAT(c.ClienteNombre, ' ', c.ClienteApellido) LIKE ?)
            GROUP BY c.ClienteId
            HAVING COUNT(DISTINCT pj.PartidoId) > 0
          ) as jugadoresConPartidos
        `;
        const countParams = [];
        if (whereSexo) countParams.push(sexo);
        countParams.push(searchValue, searchValue, searchValue);

        db.query(countQuery, countParams, (err, countResult) => {
          if (err) return reject(err);

          resolve({
            estadisticas: results,
            total: countResult[0].total,
          });
        });
      });
    });
  },

  // Obtener estadísticas detalladas de un jugador específico
  getEstadisticasJugador: (clienteId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          c.ClienteId,
          c.ClienteNombre,
          c.ClienteApellido,
          COUNT(DISTINCT pj.PartidoId) as totalPartidos,
          SUM(CASE 
            WHEN pj.PartidoJugadorResultado = 'G' THEN 1 
            ELSE 0 
          END) as partidosGanados,
          SUM(CASE 
            WHEN pj.PartidoJugadorResultado = 'P' THEN 1 
            ELSE 0 
          END) as partidosPerdidos,
          ROUND(
            (SUM(CASE 
              WHEN pj.PartidoJugadorResultado = 'G' THEN 1 
              ELSE 0 
            END) * 100.0 / NULLIF(COUNT(DISTINCT pj.PartidoId), 0)), 2
          ) as porcentajeVictorias,
          MIN(DATE_FORMAT(p.PartidoFecha, '%d-%m-%Y')) as primerPartido,
          MAX(DATE_FORMAT(p.PartidoFecha, '%d-%m-%Y')) as ultimoPartido
        FROM clientes c
        LEFT JOIN partidojugador pj ON c.ClienteId = pj.ClienteId
        LEFT JOIN partido p ON pj.PartidoId = p.PartidoId
        WHERE c.ClienteId = ? AND p.PartidoEstado = 1
        GROUP BY c.ClienteId, c.ClienteNombre, c.ClienteApellido
      `;

      db.query(query, [clienteId], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : null);
      });
    });
  },

  // Obtener resumen general de estadísticas
  getResumenGeneral: () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(DISTINCT p.PartidoId) as totalPartidos,
          COUNT(DISTINCT pj.ClienteId) as totalJugadores,
          COUNT(DISTINCT CASE WHEN p.PartidoEstado = 1 THEN p.PartidoId END) as partidosFinalizados,
          COUNT(DISTINCT CASE WHEN p.PartidoEstado = 0 THEN p.PartidoId END) as partidosPendientes,
          ROUND(AVG(CASE 
            WHEN p.PartidoEstado = 1 THEN 
              (SELECT COUNT(*) FROM partidojugador pj2 WHERE pj2.PartidoId = p.PartidoId)
            ELSE NULL 
          END), 4) as promedioJugadoresPorPartido
        FROM partido p
        LEFT JOIN partidojugador pj ON p.PartidoId = pj.PartidoId
      `;

      db.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
  },
};

module.exports = Reporte;
