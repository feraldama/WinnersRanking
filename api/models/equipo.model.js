const db = require("../config/db");

// El logo se guarda como MEDIUMBLOB y se recibe/envía en base64,
// igual que ProductoImagen.
const logoABuffer = (logo) => {
  if (!logo) return null;
  return Buffer.isBuffer(logo) ? logo : Buffer.from(logo, "base64");
};

// EquipoJugadores es una columna calculada, se ordena por el alias.
const ordenamiento = (sortBy, sortOrder) => {
  const camposOrdenables = {
    EquipoId: "e.EquipoId",
    EquipoNombre: "e.EquipoNombre",
    EquipoEstado: "e.EquipoEstado",
    EquipoJugadores: "EquipoJugadores",
  };
  const order = String(sortOrder).toUpperCase() === "DESC" ? "DESC" : "ASC";
  return {
    sortExpr: camposOrdenables[sortBy] || "e.EquipoId",
    order,
  };
};

const Equipo = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Equipo ORDER BY EquipoNombre", (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Equipo WHERE EquipoId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (equipoData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Equipo (EquipoNombre, EquipoLogo, EquipoEstado) VALUES (?, ?, ?)`;
      const estado =
        equipoData.EquipoEstado === "true" || equipoData.EquipoEstado === true
          ? 1
          : 0;
      db.query(
        query,
        [equipoData.EquipoNombre, logoABuffer(equipoData.EquipoLogo), estado],
        (err, result) => {
          if (err) return reject(err);
          Equipo.getById(result.insertId).then(resolve).catch(reject);
        }
      );
    });
  },

  update: (id, equipoData) => {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const values = [];

      if (equipoData.EquipoNombre !== undefined) {
        updateFields.push("EquipoNombre = ?");
        values.push(equipoData.EquipoNombre);
      }
      // Un string vacío significa "quitar el logo".
      if (equipoData.EquipoLogo !== undefined) {
        updateFields.push("EquipoLogo = ?");
        values.push(logoABuffer(equipoData.EquipoLogo));
      }
      if (equipoData.EquipoEstado !== undefined) {
        updateFields.push("EquipoEstado = ?");
        values.push(
          equipoData.EquipoEstado === "true" || equipoData.EquipoEstado === true
            ? 1
            : 0
        );
      }

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(id);
      const query = `UPDATE Equipo SET ${updateFields.join(
        ", "
      )} WHERE EquipoId = ?`;
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Equipo.getById(id).then(resolve).catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM Equipo WHERE EquipoId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "EquipoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const { sortExpr, order } = ordenamiento(sortBy, sortOrder);

      db.query(
        `SELECT e.*,
                (SELECT COUNT(*) FROM clientes c WHERE c.EquipoId = e.EquipoId) as EquipoJugadores
         FROM Equipo e ORDER BY ${sortExpr} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query("SELECT COUNT(*) as total FROM Equipo", (err, countResult) => {
            if (err) return reject(err);
            resolve({
              equipos: results,
              total: countResult[0].total,
            });
          });
        }
      );
    });
  },

  searchEquipos: (
    term,
    limit,
    offset,
    sortBy = "EquipoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const { sortExpr, order } = ordenamiento(sortBy, sortOrder);

      const filtro = `EquipoNombre LIKE ? OR (EquipoEstado = 1 AND ? = 'activo') OR (EquipoEstado = 0 AND ? = 'inactivo')`;
      const searchValue = `%${term}%`;
      const termLower = term.toLowerCase();

      db.query(
        `SELECT e.*,
                (SELECT COUNT(*) FROM clientes c WHERE c.EquipoId = e.EquipoId) as EquipoJugadores
         FROM Equipo e
         WHERE e.EquipoNombre LIKE ? OR (e.EquipoEstado = 1 AND ? = 'activo') OR (e.EquipoEstado = 0 AND ? = 'inactivo')
         ORDER BY ${sortExpr} ${order} LIMIT ? OFFSET ?`,
        [searchValue, termLower, termLower, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            `SELECT COUNT(*) as total FROM Equipo WHERE ${filtro}`,
            [searchValue, termLower, termLower],
            (err, countResult) => {
              if (err) return reject(err);
              resolve({
                equipos: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = Equipo;
