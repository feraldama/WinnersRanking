const express = require("express");
const router = express.Router();
const equipoController = require("../controllers/equipo.controller");
const authMiddleware = require("../middlewares/auth");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para Equipo
router.get("/search", authMiddleware, equipoController.searchEquipos);
router.get("/", authMiddleware, equipoController.getAll);
router.get("/:id", authMiddleware, equipoController.getById);
router.post("/", authMiddleware, equipoController.create);
router.put("/:id", authMiddleware, equipoController.update);
router.delete("/:id", authMiddleware, equipoController.delete);

module.exports = router;
