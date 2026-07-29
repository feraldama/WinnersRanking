const Equipo = require("../models/equipo.model");

// El logo viaja como base64 hacia el cliente (mismo criterio que ProductoImagen)
function convertirLogos(equipos) {
  if (!equipos) return equipos;
  const convertir = (equipo) => {
    if (equipo.EquipoLogo && Buffer.isBuffer(equipo.EquipoLogo)) {
      equipo.EquipoLogo = equipo.EquipoLogo.toString("base64");
    }
  };
  if (Array.isArray(equipos)) {
    equipos.forEach(convertir);
  } else {
    convertir(equipos);
  }
  return equipos;
}

exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "EquipoId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await Equipo.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: convertirLogos(result.equipos),
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const equipo = await Equipo.getById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }
    res.json(convertirLogos(equipo));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (
      !req.body.EquipoNombre ||
      String(req.body.EquipoNombre).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "El campo EquipoNombre es requerido",
      });
    }

    const equipo = await Equipo.create(req.body);
    res.status(201).json({
      success: true,
      message: "Equipo creado exitosamente",
      data: convertirLogos(equipo),
    });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Ya existe un equipo con ese nombre",
      });
    }
    res.status(400).json({
      success: false,
      message: "Error al crear equipo",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      req.body.EquipoNombre !== undefined &&
      String(req.body.EquipoNombre).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "EquipoNombre no puede estar vacío",
      });
    }

    const equipo = await Equipo.update(id, req.body);
    if (!equipo) {
      return res.status(404).json({
        success: false,
        message: "Equipo no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Equipo actualizado exitosamente",
      data: convertirLogos(equipo),
    });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Ya existe un equipo con ese nombre",
      });
    }
    res.status(400).json({
      success: false,
      message: "Error al actualizar equipo",
      error: error.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await Equipo.delete(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Equipo no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Equipo eliminado exitosamente",
    });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No se puede eliminar el equipo porque tiene jugadores asociados.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error al eliminar equipo",
      error: error.message,
    });
  }
};

exports.searchEquipos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "EquipoId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await Equipo.searchEquipos(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: convertirLogos(result.equipos),
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar equipos" });
  }
};
