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
router.post("/", authMiddleware, getCocktail);
router.post("/save", authMiddleware, saveCocktail);
router.get("/save", authMiddleware, savedCocktail);
router.post("/save-to-collection", authMiddleware, saveToCollection);

router.post("/chat", authMiddleware, handleRecipeChat);
router.post("/analyze-image", authMiddleware, handleCocktailImageAnalysis);
router.post("/generate-image", generateCocktailImage);

router.delete("/cocktail/:cocktailId", authMiddleware, deleteCocktail); // Delete a cocktail
router.delete("/collection/:collectionId", authMiddleware, deleteCollection);

// Submit a rating and feedback
router.post("/ratings", authMiddleware, submitRating);

// Fetch all ratings and feedback for a recipe
router.get("/ratings/:recipeId", authMiddleware, getRatings);

router.get("/shared/:recipeId", getSharedRecipe);

module.exports = router;
