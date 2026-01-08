const Torneo = require("../models/torneo.model");
const TorneoJugador = require("../models/torneojugador.model");

// getAllTorneos
exports.getAllTorneos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "TorneoId";
    const sortOrder = req.query.sortOrder || "DESC";
    const { torneos, total } = await Torneo.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: torneos,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// searchTorneos
exports.searchTorneos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "TorneoId";
    const sortOrder = req.query.sortOrder || "DESC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { torneos, total } = await Torneo.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: torneos,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// getTorneoById
exports.getTorneoById = async (req, res) => {
  try {
    let torneo = await Torneo.getById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ message: "Torneo no encontrado" });
    }

    // Obtener jugadores del torneo
    const jugadores = await TorneoJugador.getByTorneoId(req.params.id);
    const campeones = jugadores.filter((j) => j.TorneoJugadorRol === "C");
    const vicecampeones = jugadores.filter((j) => j.TorneoJugadorRol === "V");

    res.json({
      ...torneo,
      campeones,
      vicecampeones,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createTorneo
exports.createTorneo = async (req, res) => {
  try {
    // Validación básica de campos requeridos
    const camposRequeridos = [
      "TorneoNombre",
      "TorneoCategoria",
      "TorneoFechaInicio",
      "TorneoFechaFin",
    ];
    for (const campo of camposRequeridos) {
      if (
        req.body[campo] === undefined ||
        req.body[campo] === null ||
        (typeof req.body[campo] === "string" && req.body[campo].trim() === "")
      ) {
        return res.status(400).json({
          success: false,
          message: `El campo ${campo} es requerido`,
        });
      }
    }

    // Validar que haya exactamente 2 campeones y 2 vicecampeones
    if (
      !req.body.campeones ||
      !Array.isArray(req.body.campeones) ||
      req.body.campeones.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        message: "Debe incluir exactamente 2 campeones",
      });
    }

    if (
      !req.body.vicecampeones ||
      !Array.isArray(req.body.vicecampeones) ||
      req.body.vicecampeones.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        message: "Debe incluir exactamente 2 vicecampeones",
      });
    }

    // Validar que los campeones tengan ClienteId
    for (const campeon of req.body.campeones) {
      if (!campeon.ClienteId) {
        return res.status(400).json({
          success: false,
          message: "Todos los campeones deben tener un ClienteId válido",
        });
      }
    }

    // Validar que los vicecampeones tengan ClienteId
    for (const vicecampeon of req.body.vicecampeones) {
      if (!vicecampeon.ClienteId) {
        return res.status(400).json({
          success: false,
          message: "Todos los vicecampeones deben tener un ClienteId válido",
        });
      }
    }

    // Crear torneo
    const nuevoTorneo = await Torneo.create({
      TorneoNombre: req.body.TorneoNombre,
      TorneoCategoria: req.body.TorneoCategoria,
      TorneoFechaInicio: req.body.TorneoFechaInicio,
      TorneoFechaFin: req.body.TorneoFechaFin,
    });

    // Crear torneojugadores para campeones
    const campeonesCreados = [];
    let torneoJugadorIdCounter = 1;
    for (const campeon of req.body.campeones) {
      const jugadorData = {
        TorneoId: nuevoTorneo.TorneoId,
        TorneoJugadorId: torneoJugadorIdCounter++,
        ClienteId: campeon.ClienteId,
        TorneoJugadorRol: "C",
      };
      const nuevoJugador = await TorneoJugador.create(jugadorData);
      campeonesCreados.push(nuevoJugador);
    }

    // Crear torneojugadores para vicecampeones
    const vicecampeonesCreados = [];
    for (const vicecampeon of req.body.vicecampeones) {
      const jugadorData = {
        TorneoId: nuevoTorneo.TorneoId,
        TorneoJugadorId: torneoJugadorIdCounter++,
        ClienteId: vicecampeon.ClienteId,
        TorneoJugadorRol: "V",
      };
      const nuevoJugador = await TorneoJugador.create(jugadorData);
      vicecampeonesCreados.push(nuevoJugador);
    }

    // Obtener datos completos de los jugadores
    const campeonesCompletos = await Promise.all(
      campeonesCreados.map((c) => TorneoJugador.getById(c.TorneoJugadorId))
    );
    const vicecampeonesCompletos = await Promise.all(
      vicecampeonesCreados.map((v) => TorneoJugador.getById(v.TorneoJugadorId))
    );

    // Preparar respuesta con jugadores incluidos
    const respuesta = {
      ...nuevoTorneo,
      campeones: campeonesCompletos,
      vicecampeones: vicecampeonesCompletos,
    };

    res.status(201).json({
      success: true,
      data: respuesta,
      message: "Torneo creado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear torneo",
      error: error.message,
    });
  }
};

// updateTorneo
exports.updateTorneo = async (req, res) => {
  try {
    const { id } = req.params;
    const torneoData = { ...req.body };

    // Remover jugadores del objeto torneoData para evitar conflictos
    const { campeones, vicecampeones, ...torneoDataSinJugadores } = torneoData;

    // Actualizar datos del torneo si hay campos para actualizar
    if (
      torneoDataSinJugadores.TorneoFechaInicio ||
      torneoDataSinJugadores.TorneoFechaFin
    ) {
      const updatedTorneo = await Torneo.update(id, torneoDataSinJugadores);
      if (!updatedTorneo) {
        return res.status(404).json({
          success: false,
          message: "Torneo no encontrado",
        });
      }
    }

    // Si se proporcionaron campeones o vicecampeones, actualizar la tabla torneojugador
    if (campeones || vicecampeones) {
      // Validar que haya exactamente 2 campeones si se proporcionan
      if (campeones) {
        if (!Array.isArray(campeones) || campeones.length !== 2) {
          return res.status(400).json({
            success: false,
            message: "Debe incluir exactamente 2 campeones",
          });
        }
        for (const campeon of campeones) {
          if (!campeon.ClienteId) {
            return res.status(400).json({
              success: false,
              message: "Todos los campeones deben tener un ClienteId válido",
            });
          }
        }
      }

      // Validar que haya exactamente 2 vicecampeones si se proporcionan
      if (vicecampeones) {
        if (!Array.isArray(vicecampeones) || vicecampeones.length !== 2) {
          return res.status(400).json({
            success: false,
            message: "Debe incluir exactamente 2 vicecampeones",
          });
        }
        for (const vicecampeon of vicecampeones) {
          if (!vicecampeon.ClienteId) {
            return res.status(400).json({
              success: false,
              message:
                "Todos los vicecampeones deben tener un ClienteId válido",
            });
          }
        }
      }

      // Eliminar jugadores existentes del torneo
      await TorneoJugador.deleteByTorneoId(id);

      // Contador para generar TorneoJugadorId únicos
      let torneoJugadorIdCounter = 1;

      // Crear nuevos campeones si se proporcionaron
      if (campeones) {
        for (const campeon of campeones) {
          const jugadorData = {
            TorneoId: parseInt(id),
            TorneoJugadorId: torneoJugadorIdCounter++,
            ClienteId: campeon.ClienteId,
            TorneoJugadorRol: "C",
          };
          await TorneoJugador.create(jugadorData);
        }
      } else {
        // Si no se proporcionaron campeones, mantener los existentes
        const campeonesExistentes = await TorneoJugador.getByTorneoIdAndRol(
          id,
          "C"
        );
        for (const campeon of campeonesExistentes) {
          const jugadorData = {
            TorneoId: parseInt(id),
            TorneoJugadorId: torneoJugadorIdCounter++,
            ClienteId: campeon.ClienteId,
            TorneoJugadorRol: "C",
          };
          await TorneoJugador.create(jugadorData);
        }
      }

      // Crear nuevos vicecampeones si se proporcionaron
      if (vicecampeones) {
        for (const vicecampeon of vicecampeones) {
          const jugadorData = {
            TorneoId: parseInt(id),
            TorneoJugadorId: torneoJugadorIdCounter++,
            ClienteId: vicecampeon.ClienteId,
            TorneoJugadorRol: "V",
          };
          await TorneoJugador.create(jugadorData);
        }
      } else {
        // Si no se proporcionaron vicecampeones, mantener los existentes
        const vicecampeonesExistentes = await TorneoJugador.getByTorneoIdAndRol(
          id,
          "V"
        );
        for (const vicecampeon of vicecampeonesExistentes) {
          const jugadorData = {
            TorneoId: parseInt(id),
            TorneoJugadorId: torneoJugadorIdCounter++,
            ClienteId: vicecampeon.ClienteId,
            TorneoJugadorRol: "V",
          };
          await TorneoJugador.create(jugadorData);
        }
      }
    }

    // Obtener el torneo actualizado con sus jugadores
    const torneoActualizado = await Torneo.getById(id);
    const jugadores = await TorneoJugador.getByTorneoId(id);
    const campeonesActualizados = jugadores.filter(
      (j) => j.TorneoJugadorRol === "C"
    );
    const vicecampeonesActualizados = jugadores.filter(
      (j) => j.TorneoJugadorRol === "V"
    );

    res.json({
      success: true,
      data: {
        ...torneoActualizado,
        campeones: campeonesActualizados,
        vicecampeones: vicecampeonesActualizados,
      },
      message: "Torneo actualizado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar torneo",
      error: error.message,
    });
  }
};

// deleteTorneo
exports.deleteTorneo = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero eliminar los torneojugadores asociados
    await TorneoJugador.deleteByTorneoId(id);

    // Luego eliminar el torneo
    const deleted = await Torneo.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Torneo no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Torneo eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar torneo",
      error: error.message,
    });
  }
};

// Obtener todos los torneos sin paginación
exports.getAllTorneosSinPaginacion = async (req, res) => {
  try {
    const torneos = await Torneo.getAll();
    res.json({ data: torneos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
