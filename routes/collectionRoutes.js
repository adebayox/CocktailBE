const express = require("express");
const router = express.Router();
const {
  createCollection,
  getUserCollections,
  getUserRecipes,
  getRecipesInCollection,
} = require("../controllers/collectionController");
const { authMiddleware } = require("../middleware/auth");

/**
 * @swagger
 * /api/collections/collection:
 *   post:
 *     summary: Create a new collection
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Summer Drinks
 *     responses:
 *       201:
 *         description: Collection created successfully
 */
router.post("/collection", authMiddleware, createCollection);

/**
 * @swagger
 * /api/collections/collections/{userId}:
 *   get:
 *     summary: Get all collections for a user
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of collections
 */
router.get("/collections/:userId", authMiddleware, getUserCollections);

/**
 * @swagger
 * /api/collections/recipes/{userId}:
 *   get:
 *     summary: Get all recipes saved by a user
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of saved recipes
 */
router.get("/recipes/:userId", authMiddleware, getUserRecipes);

/**
 * @swagger
 * /api/collections/collection/{collectionId}:
 *   get:
 *     summary: Get all recipes in a collection
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of recipes in the collection
 */
router.get("/collection/:collectionId", authMiddleware, getRecipesInCollection);

module.exports = router;
