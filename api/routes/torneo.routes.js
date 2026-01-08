const express = require("express");
const router = express.Router();
const torneoController = require("../controllers/torneo.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, torneoController.getAllTorneos);
router.get("/all", authMiddleware, torneoController.getAllTorneosSinPaginacion);
router.get("/search", authMiddleware, torneoController.searchTorneos);
router.get("/:id", authMiddleware, torneoController.getTorneoById);
router.post("/", authMiddleware, torneoController.createTorneo);
router.put("/:id", authMiddleware, torneoController.updateTorneo);
router.delete("/:id", authMiddleware, torneoController.deleteTorneo);

module.exports = router;
