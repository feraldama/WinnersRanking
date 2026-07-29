-- Migración: índices para las consultas del ranking y de la racha
--
-- La racha filtra por pj.ClienteId IN (...) y ordena por p.PartidoFecha, y las
-- dos APIs corren esas consultas en cada request (la landing cada 10 segundos).
--
-- MySQL no soporta CREATE INDEX IF NOT EXISTS: si el índice ya existe la
-- sentencia falla con "Duplicate key name". Es esperable, se ignora y se sigue
-- con la siguiente. Para ver los que ya están:
--   SHOW INDEX FROM PartidoJugador;
--   SHOW INDEX FROM Partido;

CREATE INDEX idx_partidojugador_cliente ON PartidoJugador (ClienteId);

-- Cubre el JOIN y el filtro por resultado sin ir a la tabla
CREATE INDEX idx_partidojugador_cliente_resultado
  ON PartidoJugador (ClienteId, PartidoJugadorResultado, PartidoId);

-- Rango de fechas de competencia y orden de la racha
CREATE INDEX idx_partido_fecha ON Partido (PartidoFecha);

-- Filtros de categoría y sexo del ranking
CREATE INDEX idx_clientes_categoria_sexo ON clientes (ClienteCategoria, ClienteSexo);
