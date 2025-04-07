const express = require("express");
const router = express.Router();
const {
  createCollection,
  getUserCollections,
  getUserRecipes,
  getRecipesInCollection,
} = require("../controllers/collectionController");
const { authMiddleware } = require("../middleware/auth");

router.post("/collection", authMiddleware, createCollection);
router.get("/collections/:userId", authMiddleware, getUserCollections);
router.get("/recipes/:userId", authMiddleware, getUserRecipes);
router.get("/collection/:collectionId", authMiddleware, getRecipesInCollection);

module.exports = router;
