const { Pool, types } = require("pg");
const {
  traducir,
  nombreOriginal,
  clavePrimariaInsert,
} = require("./mysql-a-postgres");
require("dotenv").config();

// BIGINT (COUNT, SUM de enteros) como número, igual que mysql2.
// NUMERIC queda como string, como DECIMAL en mysql2.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "winners",
  max: 15,
  idleTimeoutMillis: 60000,
});

// Códigos de error de MySQL que el código espera (p. ej. ER_DUP_ENTRY)
const errorComoMysql = (err, sql) => {
  err.pgCode = err.code;
  err.sqlMessage = err.message;
  if (err.code === "23505") err.code = "ER_DUP_ENTRY";
  else if (err.code === "23503") {
    err.code = /^\s*(DELETE|UPDATE)/i.test(sql)
      ? "ER_ROW_IS_REFERENCED_2"
      : "ER_NO_REFERENCED_ROW_2";
  }
  return err;
};

/**
 * Ejecuta una consulta escrita para MySQL y devuelve lo mismo que mysql2:
 * filas para un SELECT; { insertId, affectedRows, changedRows } para el resto.
 */
const ejecutar = async (cliente, sql, params) => {
  const { text, values, alias } = traducir(sql, params);
  let res;
  try {
    res = await cliente.query({ text, values, rowMode: "array" });
  } catch (err) {
    throw errorComoMysql(err, sql);
  }
  const campos = (res.fields || []).map((f) => nombreOriginal(f.name, alias));

  if (res.command === "SELECT" || (res.command !== "INSERT" && campos.length)) {
    return res.rows.map((fila) => {
      const obj = {};
      campos.forEach((c, i) => {
        obj[c] = fila[i];
      });
      return obj;
    });
  }

  let insertId = 0;
  const pk = res.command === "INSERT" ? clavePrimariaInsert(sql) : null;
  if (pk && res.rows.length) {
    const i = res.fields.findIndex((f) => f.name === pk);
    if (i >= 0) insertId = res.rows[0][i];
  }
  return {
    insertId,
    affectedRows: res.rowCount,
    changedRows: res.rowCount,
    warningStatus: 0,
  };
};

const conCallback = (cliente) => (sql, params, callback) => {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }
  ejecutar(cliente, sql, params || []).then(
    (resultado) => callback && callback(null, resultado),
    (err) => callback && callback(err)
  );
};

const db = {
  query: conCallback(pool),
  getConnection: (callback) => {
    pool.connect((err, cliente, liberar) => {
      if (err) return callback(err);
      callback(null, { query: conCallback(cliente), release: () => liberar() });
    });
  },
  on: (...args) => pool.on(...args),
  end: () => pool.end(),
};

// Verificar la conexión
pool
  .query("SELECT 1")
  .then(() => console.log("Conectado a PostgreSQL"))
  .catch((err) => console.error("Error conectando a PostgreSQL:", err));

// Manejar errores del pool
pool.on("error", (err) => {
  console.error("Error en el pool de conexiones PostgreSQL:", err);
});

module.exports = db;
