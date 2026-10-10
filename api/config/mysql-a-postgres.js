/**
 * Traduce las consultas escritas para MySQL (mysql2) a PostgreSQL, para que
 * los modelos sigan funcionando sin reescribirlos:
 *
 *  - `?`  → `$1, $2…` (un arreglo en `IN (?)` se expande en varios parámetros)
 *  - `LIKE` → `ILIKE` (MySQL compara sin distinguir mayúsculas)
 *  - "texto" → 'texto' (en MySQL las comillas dobles son strings)
 *  - `nombre` (backticks) → "nombre" en minúsculas
 *  - `AS aliasConMayusculas` → AS "aliasConMayusculas", y sus referencias,
 *    para que el resultado conserve el nombre exacto del alias
 *  - INSERT en tablas con autoincremental → agrega RETURNING para el insertId
 *
 * En PostgreSQL las tablas y columnas están en minúsculas; `nombreOriginal`
 * devuelve la escritura de MySQL (ClienteId, no clienteid) para armar las filas
 * con las mismas claves que entregaba mysql2.
 *
 * Lo que no tiene equivalente directo (funciones de MySQL) se resuelve en la
 * base: DATE_FORMAT, LIKE sobre números/fechas y textos sin distinguir
 * mayúsculas (citext).
 */
const nombres = require("./pg-nombres.json");

const ORIGINAL = new Map(nombres.columnas.map((c) => [c.toLowerCase(), c]));
const AUTOINCREMENTAL = nombres.autoincremental;

// Tipos de CAST(x AS tipo) de MySQL → PostgreSQL. CHAR sin largo en
// PostgreSQL es un solo carácter: en MySQL equivale a un texto.
const TIPOS_CAST = new Map([
  ["CHAR", "VARCHAR"],
  ["VARCHAR", "VARCHAR"],
  ["SIGNED", "BIGINT"],
  ["UNSIGNED", "BIGINT"],
  ["INTEGER", "INTEGER"],
  ["BIGINT", "BIGINT"],
  ["SMALLINT", "SMALLINT"],
  ["TEXT", "TEXT"],
  ["TIMESTAMP", "TIMESTAMP"],
  ["BOOLEAN", "BOOLEAN"],
  ["INT", "INTEGER"],
  ["DECIMAL", "DECIMAL"],
  ["NUMERIC", "NUMERIC"],
  ["DATE", "DATE"],
  ["DATETIME", "TIMESTAMP"],
  ["TIME", "TIME"],
  ["DOUBLE", "DOUBLE PRECISION"],
  ["FLOAT", "REAL"],
  ["BINARY", "BYTEA"],
]);

/** Divide el SQL en strings, comentarios, identificadores, `?` y el resto. */
function tokenizar(sql) {
  const tokens = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    if (c === "'" || c === '"') {
      // String (en MySQL también con comillas dobles); escapes '' y \'
      let j = i + 1;
      let contenido = "";
      while (j < n) {
        if (sql[j] === "\\" && j + 1 < n) {
          contenido += sql[j + 1] === c ? c : sql[j] + sql[j + 1];
          j += 2;
        } else if (sql[j] === c && sql[j + 1] === c) {
          contenido += c;
          j += 2;
        } else if (sql[j] === c) {
          break;
        } else {
          contenido += sql[j++];
        }
      }
      tokens.push({ t: "str", v: "'" + contenido.replace(/'/g, "''") + "'" });
      i = j + 1;
    } else if (c === "`") {
      const j = sql.indexOf("`", i + 1);
      tokens.push({ t: "bt", v: sql.slice(i + 1, j) });
      i = j + 1;
    } else if (c === "-" && sql[i + 1] === "-") {
      const j = sql.indexOf("\n", i);
      const fin = j === -1 ? n : j;
      tokens.push({ t: "otro", v: sql.slice(i, fin) });
      i = fin;
    } else if (c === "/" && sql[i + 1] === "*") {
      const j = sql.indexOf("*/", i + 2);
      const fin = j === -1 ? n : j + 2;
      tokens.push({ t: "otro", v: sql.slice(i, fin) });
      i = fin;
    } else if (c === "?") {
      tokens.push({ t: "param" });
      i++;
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(sql[j])) j++;
      tokens.push({ t: "palabra", v: sql.slice(i, j) });
      i = j;
    } else if (/\s/.test(c)) {
      let j = i + 1;
      while (j < n && /\s/.test(sql[j])) j++;
      tokens.push({ t: "espacio", v: sql.slice(i, j) });
      i = j;
    } else {
      tokens.push({ t: "otro", v: c });
      i++;
    }
  }
  return tokens;
}

/** Valor de parámetro como lo enviaba mysql2 (booleanos como 1/0). */
const valorParametro = (v) => (typeof v === "boolean" ? (v ? 1 : 0) : v);

/**
 * @returns {{ text: string, values: any[], alias: Set<string> }}
 */
function traducir(sql, params = []) {
  const tokens = tokenizar(sql);

  // 1) Alias: `AS nombre` (salvo el tipo de un CAST(x AS tipo))
  const alias = new Set();
  let anterior = null;
  for (const tk of tokens) {
    if (tk.t === "espacio" || (tk.t === "otro" && tk.v.startsWith("--"))) continue;
    if (
      tk.t === "palabra" &&
      anterior &&
      anterior.t === "palabra" &&
      anterior.v.toUpperCase() === "AS" &&
      !TIPOS_CAST.has(tk.v.toUpperCase())
    ) {
      alias.add(tk.v);
    }
    anterior = tk;
  }

  // 2) Reescritura
  const values = [];
  let iParam = 0;
  let salida = "";
  anterior = null;
  for (const tk of tokens) {
    if (tk.t === "palabra") {
      const despuesDeAs =
        anterior && anterior.t === "palabra" && anterior.v.toUpperCase() === "AS";
      const mayus = tk.v.toUpperCase();
      if (despuesDeAs && TIPOS_CAST.has(mayus)) {
        salida += TIPOS_CAST.get(mayus);
      } else if (despuesDeAs && alias.has(tk.v)) {
        // sin mayúsculas no hace falta: PostgreSQL ya lo deja en minúsculas
        salida += /[A-Z]/.test(tk.v) ? `"${tk.v}"` : tk.v;
      } else if (mayus === "LIKE") {
        salida += "ILIKE";
      } else if (mayus === "SQL_CALC_FOUND_ROWS") {
        // sin equivalente: se quita (ver los modelos que contaban con FOUND_ROWS)
      } else if (
        alias.has(tk.v) &&
        /[A-Z]/.test(tk.v) &&
        !ORIGINAL.has(tk.v.toLowerCase())
      ) {
        // referencia a un alias (ORDER BY, HAVING, columna de una subconsulta)
        salida += `"${tk.v}"`;
      } else {
        salida += tk.v;
      }
    } else if (tk.t === "bt") {
      salida += `"${tk.v.toLowerCase()}"`;
    } else if (tk.t === "param") {
      const v = params[iParam++];
      if (Array.isArray(v)) {
        if (v.length === 0) {
          salida += "NULL";
        } else {
          salida += v
            .map((x) => {
              values.push(valorParametro(x));
              return "$" + values.length;
            })
            .join(", ");
        }
      } else {
        values.push(valorParametro(v));
        salida += "$" + values.length;
      }
    } else {
      salida += tk.v;
    }
    if (tk.t !== "espacio" && !(tk.t === "otro" && tk.v.startsWith("--"))) {
      anterior = tk;
    }
  }

  // 3) INSERT: RETURNING de la clave autoincremental para el insertId
  const insert = /^\s*INSERT\s+INTO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i.exec(salida);
  if (insert && !/\bRETURNING\b/i.test(salida)) {
    const pk = AUTOINCREMENTAL[insert[1].toLowerCase()];
    if (pk) {
      salida = salida.replace(/;\s*$/, "") + ` RETURNING ${pk.toLowerCase()}`;
    }
  }

  return { text: salida, values, alias };
}

/** Nombre de columna como lo devolvía mysql2. */
function nombreOriginal(campo, alias) {
  if (alias.has(campo)) return campo;
  return ORIGINAL.get(campo) || campo;
}

/** Clave autoincremental (en minúsculas) de la tabla de un INSERT, si tiene. */
function clavePrimariaInsert(sql) {
  const insert = /^\s*INSERT\s+INTO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i.exec(sql);
  const pk = insert && AUTOINCREMENTAL[insert[1].toLowerCase()];
  return pk ? pk.toLowerCase() : null;
}

module.exports = { traducir, nombreOriginal, clavePrimariaInsert };
