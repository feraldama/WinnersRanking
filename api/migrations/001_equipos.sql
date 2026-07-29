-- Migración: Equipos de jugadores
-- Ejecutar una sola vez sobre la base de datos del sistema.

-- 1) Tabla de equipos
CREATE TABLE IF NOT EXISTS Equipo (
  EquipoId     INT NOT NULL AUTO_INCREMENT,
  EquipoNombre VARCHAR(100) NOT NULL,
  EquipoLogo   MEDIUMBLOB NULL,
  EquipoEstado TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (EquipoId),
  UNIQUE KEY uq_equipo_nombre (EquipoNombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Equipo asignado al jugador (opcional: un jugador puede no tener equipo)
ALTER TABLE clientes
  ADD COLUMN EquipoId INT NULL AFTER ClienteCopa;

ALTER TABLE clientes
  ADD CONSTRAINT fk_cliente_equipo
  FOREIGN KEY (EquipoId) REFERENCES Equipo (EquipoId)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_clientes_equipo ON clientes (EquipoId);

-- 3) Menú para el control de acceso.
-- Sin este registro (y su permiso asignado al perfil) sólo los usuarios
-- con isAdmin = 'S' podrán ver la pantalla de Equipos.
INSERT INTO menu (MenuId, MenuNombre) VALUES ('EQUIPOS', 'Equipos');
