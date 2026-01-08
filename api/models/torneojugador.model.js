const db = require("../config/db");

const TorneoJugador = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT tj.*, c.ClienteNombre, c.ClienteApellido FROM torneojugador tj LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId",
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
        "SELECT tj.*, c.ClienteNombre, c.ClienteApellido FROM torneojugador tj LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId WHERE tj.TorneoJugadorId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByTorneoId: (torneoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT tj.*, c.ClienteNombre, c.ClienteApellido FROM torneojugador tj LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId WHERE tj.TorneoId = ? ORDER BY tj.TorneoJugadorRol, tj.TorneoJugadorId",
        [torneoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  getByTorneoIdAndRol: (torneoId, rol) => {
    return new Promise((resolve, reject) => {
      // Convertir rol a formato de un carácter si es necesario
      const rolChar =
        rol === "CAMPEON" ? "C" : rol === "VICECAMPEON" ? "V" : rol;
      db.query(
        "SELECT tj.*, c.ClienteNombre, c.ClienteApellido FROM torneojugador tj LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId WHERE tj.TorneoId = ? AND tj.TorneoJugadorRol = ?",
        [torneoId, rolChar],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "TorneoJugadorId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "TorneoJugadorId",
        "TorneoId",
        "ClienteId",
        "ClienteNombre",
        "ClienteApellido",
        "TorneoJugadorRol",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TorneoJugadorId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT tj.*, c.ClienteNombre, c.ClienteApellido FROM torneojugador tj LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId ORDER BY tj.${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM torneojugador",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                torneoJugadores: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (
    term,
    limit,
    offset,
    sortBy = "TorneoJugadorId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "TorneoJugadorId",
        "TorneoId",
        "ClienteId",
        "ClienteNombre",
        "ClienteApellido",
        "TorneoJugadorRol",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TorneoJugadorId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT tj.*, c.ClienteNombre, c.ClienteApellido FROM torneojugador tj
        LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId
        WHERE c.ClienteNombre LIKE ? 
        OR c.ClienteApellido LIKE ? 
        OR (tj.TorneoJugadorRol = 'C' AND ? LIKE '%CAMPEON%')
        OR (tj.TorneoJugadorRol = 'V' AND ? LIKE '%VICECAMPEON%')
        OR tj.TorneoJugadorRol LIKE ?
        OR CONCAT(c.ClienteNombre, ' ', c.ClienteApellido) LIKE ?
        ORDER BY tj.${sortField} ${order}
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
          limit,
          offset,
        ],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM torneojugador tj
            LEFT JOIN clientes c ON tj.ClienteId = c.ClienteId
            WHERE c.ClienteNombre LIKE ? 
            OR c.ClienteApellido LIKE ? 
            OR (tj.TorneoJugadorRol = 'C' AND ? LIKE '%CAMPEON%')
            OR (tj.TorneoJugadorRol = 'V' AND ? LIKE '%VICECAMPEON%')
            OR tj.TorneoJugadorRol LIKE ?
            OR CONCAT(c.ClienteNombre, ' ', c.ClienteApellido) LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                torneoJugadores: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  create: (torneoJugadorData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO torneojugador (
          TorneoId,
          TorneoJugadorId,
          ClienteId,
          TorneoJugadorRol
        ) VALUES (?, ?, ?, ?)
      `;
      const values = [
        torneoJugadorData.TorneoId,
        torneoJugadorData.TorneoJugadorId,
        torneoJugadorData.ClienteId,
        torneoJugadorData.TorneoJugadorRol,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          TorneoJugadorId: torneoJugadorData.TorneoJugadorId,
          ...torneoJugadorData,
        });
      });
    });
  },

  update: (id, torneoJugadorData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = ["TorneoId", "ClienteId", "TorneoJugadorRol"];
      camposActualizables.forEach((campo) => {
        if (torneoJugadorData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(torneoJugadorData[campo]);
        }
      });
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(id);
      const query = `
        UPDATE torneojugador 
        SET ${updateFields.join(", ")}
        WHERE TorneoJugadorId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        // Obtener el torneo jugador actualizado
        TorneoJugador.getById(id).then(resolve).catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM torneojugador WHERE TorneoJugadorId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  deleteByTorneoId: (torneoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM torneojugador WHERE TorneoId = ?",
        [torneoId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  countByTorneoIdAndRol: (torneoId, rol) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT COUNT(*) as total FROM torneojugador WHERE TorneoId = ? AND TorneoJugadorRol = ?",
        [torneoId, rol],
        (err, results) => {
          if (err) return reject(err);
          resolve(results[0]?.total || 0);
        }
      );
    });
  },
};

module.exports = TorneoJugador;
