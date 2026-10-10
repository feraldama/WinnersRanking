const db = require("../config/db");

const PartidoJugador = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM partidojugador", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT pj.*, c.ClienteNombre, c.ClienteApellido FROM partidojugador pj LEFT JOIN clientes c ON pj.ClienteId = c.ClienteId WHERE pj.PartidoJugadorId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByPartidoId: (partidoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT pj.*, c.ClienteNombre, c.ClienteApellido FROM partidojugador pj LEFT JOIN clientes c ON pj.ClienteId = c.ClienteId WHERE pj.PartidoId = ? ORDER BY pj.PartidoJugadorId",
        [partidoId],
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
    sortBy = "PartidoJugadorId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "PartidoJugadorId",
        "PartidoId",
        "ClienteId",
        "ClienteNombre",
        "ClienteApellido",
        "PartidoJugadorPareja",
        "PartidoJugadorResultado",
        "PartidoJugadorObs",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "PartidoJugadorId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT pj.*, c.ClienteNombre, c.ClienteApellido FROM partidojugador pj LEFT JOIN clientes c ON pj.ClienteId = c.ClienteId ORDER BY pj.${sortField} ${order}, pj.PartidoId, pj.PartidoJugadorId LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM partidojugador",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                partidoJugadores: results,
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
    sortBy = "PartidoJugadorId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "PartidoJugadorId",
        "PartidoId",
        "ClienteId",
        "ClienteNombre",
        "ClienteApellido",
        "PartidoJugadorPareja",
        "PartidoJugadorResultado",
        "PartidoJugadorObs",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "PartidoJugadorId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT pj.*, c.ClienteNombre, c.ClienteApellido FROM partidojugador pj
        LEFT JOIN clientes c ON pj.ClienteId = c.ClienteId
        WHERE c.ClienteNombre LIKE ? 
        OR c.ClienteApellido LIKE ? 
        OR pj.PartidoJugadorPareja LIKE ?
        OR pj.PartidoJugadorResultado LIKE ?
        OR pj.PartidoJugadorObs LIKE ?
        ORDER BY pj.${sortField} ${order}, pj.PartidoId, pj.PartidoJugadorId
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
            SELECT COUNT(*) as total FROM partidojugador pj
            LEFT JOIN clientes c ON pj.ClienteId = c.ClienteId
            WHERE c.ClienteNombre LIKE ? 
            OR c.ClienteApellido LIKE ? 
            OR pj.PartidoJugadorPareja LIKE ?
            OR pj.PartidoJugadorResultado LIKE ?
            OR pj.PartidoJugadorObs LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                partidoJugadores: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  create: (partidoJugadorData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO partidojugador (
          PartidoJugadorId,
          PartidoId,
          ClienteId,
          PartidoJugadorPareja,
          PartidoJugadorResultado,
          PartidoJugadorObs
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      const values = [
        partidoJugadorData.PartidoJugadorId,
        partidoJugadorData.PartidoId,
        partidoJugadorData.ClienteId,
        partidoJugadorData.PartidoJugadorPareja,
        partidoJugadorData.PartidoJugadorResultado,
        partidoJugadorData.PartidoJugadorObs,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          PartidoJugadorId: partidoJugadorData.PartidoJugadorId,
          ...partidoJugadorData,
        });
      });
    });
  },

  update: (id, partidoJugadorData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "PartidoId",
        "ClienteId",
        "PartidoJugadorPareja",
        "PartidoJugadorResultado",
        "PartidoJugadorObs",
      ];
      camposActualizables.forEach((campo) => {
        if (partidoJugadorData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(partidoJugadorData[campo]);
        }
      });
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(id);
      const query = `
        UPDATE partidojugador 
        SET ${updateFields.join(", ")}
        WHERE PartidoJugadorId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        // Obtener el partido jugador actualizado
        PartidoJugador.getById(id).then(resolve).catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM partidojugador WHERE PartidoJugadorId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  deleteByPartidoId: (partidoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM partidojugador WHERE PartidoId = ?",
        [partidoId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  updateByPartidoAndJugador: (
    partidoJugadorId,
    partidoId,
    partidoJugadorData
  ) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "PartidoId",
        "ClienteId",
        "PartidoJugadorPareja",
        "PartidoJugadorResultado",
        "PartidoJugadorObs",
      ];
      camposActualizables.forEach((campo) => {
        if (partidoJugadorData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(partidoJugadorData[campo]);
        }
      });
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(partidoJugadorId, partidoId);
      const query = `
        UPDATE partidojugador 
        SET ${updateFields.join(", ")}
        WHERE PartidoJugadorId = ? AND PartidoId = ?
      `;
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          PartidoJugadorId: partidoJugadorId,
          PartidoId: partidoId,
          ...partidoJugadorData,
        });
      });
    });
  },
};

module.exports = PartidoJugador;
