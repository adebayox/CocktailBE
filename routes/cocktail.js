const express = require("express");
const router = express.Router();

const {
  getCocktail,
  getCocktailStream,
  saveCocktail,
  saveToCollection,
  savedCocktail,
  deleteCocktail,
  deleteCollection,
  getSharedRecipe,
  getCacheStats,
  clearCaches,
} = require("../controllers/cocktailController");

const { handleRecipeChat, handleRecipeChatStream } = require("../controllers/chatController");
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
 *     description: |
 *       Generates an AI-powered cocktail recipe. Results may be cached for performance.
 *       Set `newRecipe: true` to skip cache and always generate a fresh recipe.
 *     tags: [Cocktails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ingredients
 *               - flavors
 *               - dietaryNeeds
 *             properties:
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["vodka", "lime", "mint"]
 *               flavors:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["sweet", "refreshing"]
 *               dietaryNeeds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["low-sugar"]
 *               newRecipe:
 *                 type: boolean
 *                 description: Set to true to skip cache and generate a fresh recipe
 *                 example: false
 *     responses:
 *       200:
 *         description: Generated cocktail recipe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "00"
 *                 recipe:
 *                   type: object
 *                 fromCache:
 *                   type: boolean
 *                   description: Whether this recipe came from cache
 *                 imageJob:
 *                   type: object
 *                   description: Background image generation job info
 */
router.post("/", authMiddleware, getCocktail);

/**
 * @swagger
 * /api/cocktail/stream:
 *   post:
 *     summary: Generate a cocktail recipe with streaming response
 *     description: |
 *       Generates an AI-powered cocktail recipe with Server-Sent Events (SSE).
 *       Recipe sections are streamed as they're generated for better UX.
 *       
 *       **Event Types:**
 *       - `status`: Progress updates
 *       - `name`: Cocktail name (appears first)
 *       - `description`: Flavor description
 *       - `ingredients`: Array of ingredients
 *       - `instructions`: Array of steps
 *       - `tip`: Professional tip
 *       - `health`: Health rating and notes
 *       - `complete`: Full recipe object
 *       - `error`: Error message if failed
 *     tags: [Cocktails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ingredients
 *               - flavors
 *               - dietaryNeeds
 *             properties:
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["vodka", "lime", "mint"]
 *               flavors:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["sweet", "refreshing"]
 *               dietaryNeeds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["low-sugar"]
 *     responses:
 *       200:
 *         description: SSE stream of recipe generation events
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post("/stream", authMiddleware, getCocktailStream);

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
 *     summary: Chat with AI about a recipe (non-streaming)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - recipeContext
 *             properties:
 *               message:
 *                 type: string
 *                 example: "What can I substitute for vodka?"
 *               recipeContext:
 *                 type: object
 *     responses:
 *       200:
 *         description: AI response
 */
router.post("/chat", authMiddleware, handleRecipeChat);

/**
 * @swagger
 * /api/cocktail/chat/stream:
 *   post:
 *     summary: Chat with AI about a recipe (streaming SSE)
 *     description: Returns Server-Sent Events (SSE) with tokens as they arrive. Much faster perceived response time.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - recipeContext
 *             properties:
 *               message:
 *                 type: string
 *                 example: "What can I substitute for vodka?"
 *               recipeContext:
 *                 type: object
 *     responses:
 *       200:
 *         description: SSE stream of AI response tokens
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post("/chat/stream", authMiddleware, handleRecipeChatStream);

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

/**
 * @swagger
 * /api/cocktail/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     description: Returns hit/miss rates and cache sizes for monitoring
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics
 */
router.get("/cache/stats", authMiddleware, getCacheStats);

/**
 * @swagger
 * /api/cocktail/cache/clear:
 *   post:
 *     summary: Clear all caches
 *     description: Clears recipe and image analysis caches (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Caches cleared
 */
router.post("/cache/clear", authMiddleware, clearCaches);

module.exports = router;
