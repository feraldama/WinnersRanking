const express = require("express");
const router = express.Router();
const rankingController = require("../controllers/ranking.controller");
const authMiddleware = require("../middlewares/auth");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para Ranking
router.get("/global", authMiddleware, rankingController.getRankingGlobal);
router.get(
  "/competencia",
  authMiddleware,
  rankingController.getRankingCompetencia
);
router.get("/equipos", authMiddleware, rankingController.getRankingEquipos);
router.get(
  "/equipos/competencia",
  authMiddleware,
  rankingController.getRankingEquiposCompetencia
);

module.exports = router;
