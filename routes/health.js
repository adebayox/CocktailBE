const express = require("express");
const router = express.Router();
const { getHealth } = require("../controllers/healthController");

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check system health
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 database:
 *                   type: string
 *                   example: connected
 *       503:
 *         description: System is unhealthy (e.g. database disconnected)
 */
router.get("/", getHealth);

module.exports = router;
