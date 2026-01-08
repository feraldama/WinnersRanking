const db = require("../config/db");

const Torneo = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT TorneoId, 
                TorneoNombre,
                TorneoCategoria,
                DATE_FORMAT(TorneoFechaInicio, '%d-%m-%Y') as TorneoFechaInicio, 
                DATE_FORMAT(TorneoFechaFin, '%d-%m-%Y') as TorneoFechaFin
         FROM torneo`,
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        }
      );
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT t.TorneoId, 
                t.TorneoNombre,
                t.TorneoCategoria,
                DATE_FORMAT(t.TorneoFechaInicio, '%d-%m-%Y') as TorneoFechaInicio, 
                DATE_FORMAT(t.TorneoFechaFin, '%d-%m-%Y') as TorneoFechaFin
         FROM torneo t 
         WHERE t.TorneoId = ?`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "TorneoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "TorneoId",
        "TorneoNombre",
        "TorneoFechaInicio",
        "TorneoFechaFin",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TorneoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT t.TorneoId, 
                t.TorneoNombre,
                t.TorneoCategoria,
                DATE_FORMAT(t.TorneoFechaInicio, '%d-%m-%Y') as TorneoFechaInicio, 
                DATE_FORMAT(t.TorneoFechaFin, '%d-%m-%Y') as TorneoFechaFin
         FROM torneo t 
         ORDER BY t.${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, torneos) => {
          if (err) return reject(err);

          if (torneos.length === 0) {
            return resolve({
              torneos: [],
              total: 0,
            });
          }

          const torneoIds = torneos.map((t) => t.TorneoId);

          // Obtener jugadores para estos torneos
          db.query(
            `SELECT tj.TorneoId,
                    tj.ClienteId,
                    tj.TorneoJugadorRol,
                    c.ClienteNombre,
                    c.ClienteApellido
             FROM torneojugador tj
             LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId
             WHERE tj.TorneoId IN (?)
             ORDER BY tj.TorneoId, tj.TorneoJugadorRol, tj.TorneoJugadorId`,
            [torneoIds],
            (err, jugadores) => {
              if (err) return reject(err);

              // Agrupar jugadores por TorneoId y rol
              const jugadoresPorTorneo = jugadores.reduce((acc, jugador) => {
                if (!acc[jugador.TorneoId]) {
                  acc[jugador.TorneoId] = {
                    campeones: [],
                    vicecampeones: [],
                  };
                }
                if (jugador.TorneoJugadorRol === "C") {
                  acc[jugador.TorneoId].campeones.push(jugador);
                } else if (jugador.TorneoJugadorRol === "V") {
                  acc[jugador.TorneoId].vicecampeones.push(jugador);
                }
                return acc;
              }, {});

              // Combinar torneos con sus jugadores
              const torneosConJugadores = torneos.map((torneo) => ({
                ...torneo,
                campeones: jugadoresPorTorneo[torneo.TorneoId]?.campeones || [],
                vicecampeones:
                  jugadoresPorTorneo[torneo.TorneoId]?.vicecampeones || [],
              }));

              db.query(
                "SELECT COUNT(*) as total FROM torneo",
                (err, countResult) => {
                  if (err) return reject(err);

                  resolve({
                    torneos: torneosConJugadores,
                    total: countResult[0].total,
                  });
                }
              );
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "TorneoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "TorneoId",
        "TorneoNombre",
        "TorneoFechaInicio",
        "TorneoFechaFin",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TorneoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT DISTINCT t.TorneoId, 
               t.TorneoNombre,
               t.TorneoCategoria,
               DATE_FORMAT(t.TorneoFechaInicio, '%d-%m-%Y') as TorneoFechaInicio, 
               DATE_FORMAT(t.TorneoFechaFin, '%d-%m-%Y') as TorneoFechaFin
        FROM torneo t
        LEFT JOIN torneojugador tj ON t.TorneoId = tj.TorneoId
        LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId
        WHERE t.TorneoNombre LIKE ?
        OR t.TorneoCategoria LIKE ?
        OR DATE_FORMAT(t.TorneoFechaInicio, '%d-%m-%Y') LIKE ?
        OR DATE_FORMAT(t.TorneoFechaFin, '%d-%m-%Y') LIKE ?
        OR c.ClienteNombre LIKE ?
        OR c.ClienteApellido LIKE ?
        OR CONCAT(c.ClienteNombre, ' ', c.ClienteApellido) LIKE ?
        ORDER BY t.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          limit,
          offset,
        ],
        (err, torneos) => {
          if (err) return reject(err);

          if (torneos.length === 0) {
            return resolve({
              torneos: [],
              total: 0,
            });
          }

          const torneoIds = torneos.map((t) => t.TorneoId);

          // Obtener jugadores para estos torneos
          db.query(
            `SELECT tj.TorneoId,
                    tj.ClienteId,
                    tj.TorneoJugadorRol,
                    c.ClienteNombre,
                    c.ClienteApellido
             FROM torneojugador tj
             LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId
             WHERE tj.TorneoId IN (?)
             ORDER BY tj.TorneoId, tj.TorneoJugadorRol, tj.TorneoJugadorId`,
            [torneoIds],
            (err, jugadores) => {
              if (err) return reject(err);

              // Agrupar jugadores por TorneoId y rol
              const jugadoresPorTorneo = jugadores.reduce((acc, jugador) => {
                if (!acc[jugador.TorneoId]) {
                  acc[jugador.TorneoId] = {
                    campeones: [],
                    vicecampeones: [],
                  };
                }
                if (jugador.TorneoJugadorRol === "C") {
                  acc[jugador.TorneoId].campeones.push(jugador);
                } else if (jugador.TorneoJugadorRol === "V") {
                  acc[jugador.TorneoId].vicecampeones.push(jugador);
                }
                return acc;
              }, {});

              // Combinar torneos con sus jugadores
              const torneosConJugadores = torneos.map((torneo) => ({
                ...torneo,
                campeones: jugadoresPorTorneo[torneo.TorneoId]?.campeones || [],
                vicecampeones:
                  jugadoresPorTorneo[torneo.TorneoId]?.vicecampeones || [],
              }));

              const countQuery = `
                SELECT COUNT(DISTINCT t.TorneoId) as total FROM torneo t
                LEFT JOIN torneojugador tj ON t.TorneoId = tj.TorneoId
                LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId
                WHERE t.TorneoNombre LIKE ?
                OR t.TorneoCategoria LIKE ?
                OR DATE_FORMAT(t.TorneoFechaInicio, '%d-%m-%Y') LIKE ?
                OR DATE_FORMAT(t.TorneoFechaFin, '%d-%m-%Y') LIKE ?
                OR c.ClienteNombre LIKE ?
                OR c.ClienteApellido LIKE ?
                OR CONCAT(c.ClienteNombre, ' ', c.ClienteApellido) LIKE ?
              `;

              db.query(
                countQuery,
                [
                  searchValue,
                  searchValue,
                  searchValue,
                  searchValue,
                  searchValue,
                  searchValue,
                  searchValue,
                ],
                (err, countResult) => {
                  if (err) return reject(err);

                  resolve({
                    torneos: torneosConJugadores,
                    total: countResult[0]?.total || 0,
                  });
                }
              );
            }
          );
        }
      );
    });
  },

  create: (torneoData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO torneo (
          TorneoNombre,
          TorneoCategoria,
          TorneoFechaInicio,
          TorneoFechaFin
        ) VALUES (?, ?, ?, ?)
      `;
      const values = [
        torneoData.TorneoNombre,
        torneoData.TorneoCategoria,
        torneoData.TorneoFechaInicio,
        torneoData.TorneoFechaFin,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          TorneoId: result.insertId,
          ...torneoData,
        });
      });
    });
  },

  update: (id, torneoData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "TorneoNombre",
        "TorneoCategoria",
        "TorneoFechaInicio",
        "TorneoFechaFin",
      ];
      camposActualizables.forEach((campo) => {
        if (torneoData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(torneoData[campo]);
        }
      });
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(id);
      const query = `
        UPDATE torneo 
        SET ${updateFields.join(", ")}
        WHERE TorneoId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        // Obtener el torneo actualizado
        Torneo.getById(id).then(resolve).catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM torneo WHERE TorneoId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },
};

module.exports = Torneo;
