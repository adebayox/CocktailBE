const express = require("express");
const router = express.Router();

const {
  getCocktail,
  saveCocktail,
  saveToCollection,
  savedCocktail,
  deleteCocktail,
  deleteCollection,
  getSharedRecipe,
} = require("../controllers/cocktailController");

const { handleRecipeChat } = require("../controllers/chatController");
const { submitRating, getRatings } = require("../controllers/ratingController");
const {
  handleCocktailImageAnalysis,
} = require("../controllers/imageAnalysisController");
const {
  generateCocktailImage,
} = require("../controllers/imageGenerationController");

const { authMiddleware } = require("../middleware/auth");

// router.post("/cocktail", getCocktail);
// add auth middleware
/**
 * @swagger
 * /api/cocktail:
 *   post:
 *     summary: Generate a cocktail recipe
 *     tags: [Cocktails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               ingredients: ["vodka", "lime"]
 *     responses:
 *       200:
 *         description: Generated cocktail recipe
 */
router.post("/", authMiddleware, getCocktail);

/**
 * @swagger
 * /api/cocktail/save:
 *   post:
 *     summary: Save a generated cocktail recipe
 *     tags: [Cocktails]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cocktail saved successfully
 */
router.post("/save", authMiddleware, saveCocktail);

/**
 * @swagger
 * /api/cocktail/save:
 *   get:
 *     summary: Get all saved cocktails for a user
 *     tags: [Cocktails]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved cocktails
 */
router.get("/save", authMiddleware, savedCocktail);

/**
 * @swagger
 * /api/cocktail/save-to-collection:
 *   post:
 *     summary: Save a cocktail to a collection
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cocktail saved to collection
 */
router.post("/save-to-collection", authMiddleware, saveToCollection);

/**
 * @swagger
 * /api/cocktail/chat:
 *   post:
 *     summary: Chat with AI about a recipe
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI response
 */
router.post("/chat", authMiddleware, handleRecipeChat);

/**
 * @swagger
 * /api/cocktail/analyze-image:
 *   post:
 *     summary: Analyze cocktail image using AI
 *     tags: [Image Analysis]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analysis result
 */
router.post("/analyze-image", authMiddleware, handleCocktailImageAnalysis);

/**
 * @swagger
 * /api/cocktail/generate-image:
 *   post:
 *     summary: Generate cocktail image from description
 *     tags: [Image Generation]
 *     responses:
 *       200:
 *         description: Generated image
 */
router.post("/generate-image", generateCocktailImage);

/**
 * @swagger
 * /api/cocktail/cocktail/{cocktailId}:
 *   delete:
 *     summary: Delete a saved cocktail
 *     tags: [Cocktails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cocktailId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cocktail deleted successfully
 */
router.delete("/cocktail/:cocktailId", authMiddleware, deleteCocktail); // Delete a cocktail

/**
 * @swagger
 * /api/cocktail/collection/{collectionId}:
 *   delete:
 *     summary: Delete a collection
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
 *         description: Collection deleted successfully
 */
router.delete("/collection/:collectionId", authMiddleware, deleteCollection);

/**
 * @swagger
 * /api/cocktail/ratings:
 *   post:
 *     summary: Submit a recipe rating and feedback
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rating submitted
 */
// Submit a rating and feedback
router.post("/ratings", authMiddleware, submitRating);

/**
 * @swagger
 * /api/cocktail/ratings/{recipeId}:
 *   get:
 *     summary: Get all ratings for a recipe
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of ratings
 */
// Fetch all ratings and feedback for a recipe
router.get("/ratings/:recipeId", authMiddleware, getRatings);

/**
 * @swagger
 * /api/cocktail/shared/{recipeId}:
 *   get:
 *     summary: Get a shared recipe by ID
 *     tags: [Cocktails]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shared recipe
 */
router.get("/shared/:recipeId", getSharedRecipe);

module.exports = router;
