const Cliente = require("../models/cliente.model");

// getAllClientes
exports.getAllClientes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ClienteId";
    const sortOrder = req.query.sortOrder || "ASC";

    const { clientes, total } = await Cliente.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: clientes,
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

// searchClientes
exports.searchClientes = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ClienteId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const { clientes, total } = await Cliente.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: clientes,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error en searchClientes:", error);
    res.status(500).json({ error: "Error al buscar jugadores" });
  }
};

exports.getClienteById = async (req, res) => {
  try {
    const cliente = await Cliente.getById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCliente = async (req, res) => {
  try {
    // Validación de campos requeridos
    if (!req.body.ClienteNombre) {
      return res.status(400).json({
        success: false,
        message: `El campo ClienteNombre es requerido`,
      });
    }
    // Validación y normalización de ClienteSexo (M/F o null)
    let sexo = null;
    if (req.body.ClienteSexo !== undefined && req.body.ClienteSexo !== null) {
      const v = String(req.body.ClienteSexo).trim().toUpperCase();
      if (v === "") {
        sexo = null;
      } else if (v === "M" || v === "F") {
        sexo = v;
      } else {
        return res.status(400).json({
          success: false,
          message: "ClienteSexo debe ser 'M' o 'F'",
        });
      }
    }
    // Validación de ClienteCopa (0 a 3)
    let clienteCopa = 0;
    if (req.body.ClienteCopa !== undefined && req.body.ClienteCopa !== null) {
      const n = Number(req.body.ClienteCopa);
      if (!Number.isInteger(n) || n < 0 || n > 3) {
        return res.status(400).json({
          success: false,
          message: "ClienteCopa debe ser un entero entre 0 y 3",
        });
      }
      clienteCopa = n;
    }
    // Validación de EquipoId (opcional: entero o null)
    let equipoId = null;
    if (req.body.EquipoId !== undefined && req.body.EquipoId !== null) {
      const v = String(req.body.EquipoId).trim();
      if (v !== "") {
        const n = Number(v);
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({
            success: false,
            message: "EquipoId debe ser un entero válido",
          });
        }
        equipoId = n;
      }
    }
    // Crear el nuevo cliente
    const nuevoCliente = await Cliente.create({
      ClienteRUC: req.body.ClienteRUC || "",
      ClienteNombre: req.body.ClienteNombre,
      ClienteApellido: req.body.ClienteApellido || null,
      ClienteDireccion: req.body.ClienteDireccion || null,
      ClienteTelefono: req.body.ClienteTelefono || null,
      ClienteTipo: req.body.ClienteTipo,
      ClienteCategoria: req.body.ClienteCategoria || "INICIAL",
      UsuarioId: req.body.UsuarioId,
      ClienteSexo: sexo,
      ClienteCopa: clienteCopa,
      EquipoId: equipoId,
    });
    res.status(201).json({
      success: true,
      data: nuevoCliente,
      message: "Cliente creado exitosamente",
    });
  } catch (error) {
    console.error("Error al crear cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear cliente",
      error: error.message,
    });
  }
};

exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const clienteData = { ...req.body };
    if (!clienteData.ClienteNombre) {
      return res.status(400).json({
        success: false,
        message: "ClienteNombre es un campo requerido",
      });
    }
    // Validación y normalización de ClienteSexo si viene en el payload
    if (clienteData.ClienteSexo !== undefined) {
      const v = String(clienteData.ClienteSexo).trim().toUpperCase();
      if (v === "") {
        clienteData.ClienteSexo = null;
      } else if (v === "M" || v === "F") {
        clienteData.ClienteSexo = v;
      } else {
        return res.status(400).json({
          success: false,
          message: "ClienteSexo debe ser 'M' o 'F'",
        });
      }
    }
    // Validación de ClienteCopa si viene en el payload
    if (clienteData.ClienteCopa !== undefined) {
      const n = Number(clienteData.ClienteCopa);
      if (!Number.isInteger(n) || n < 0 || n > 3) {
        return res.status(400).json({
          success: false,
          message: "ClienteCopa debe ser un entero entre 0 y 3",
        });
      }
      clienteData.ClienteCopa = n;
    }
    // Validación de EquipoId si viene en el payload ('' o null = sin equipo)
    if (clienteData.EquipoId !== undefined) {
      const v =
        clienteData.EquipoId === null ? "" : String(clienteData.EquipoId).trim();
      if (v === "") {
        clienteData.EquipoId = null;
      } else {
        const n = Number(v);
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({
            success: false,
            message: "EquipoId debe ser un entero válido",
          });
        }
        clienteData.EquipoId = n;
      }
    }
    const updatedCliente = await Cliente.update(id, clienteData);
    if (!updatedCliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }
    res.json({
      success: true,
      data: updatedCliente,
      message: "Cliente actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar cliente",
      error: error.message,
    });
  }
};

exports.deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Cliente.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Cliente eliminado exitosamente",
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
          "No se puede eliminar el cliente porque tiene movimientos asociados.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error al eliminar cliente",
      error: error.message,
    });
  }
};

// Obtener todos los clientes sin paginación
exports.getAllClientesSinPaginacion = async (req, res) => {
  try {
    const clientes = await Cliente.getAll();
    res.json({ data: clientes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
