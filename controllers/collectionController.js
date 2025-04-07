const { Collection, Cocktail } = require("../models/cocktailModel");

const createCollection = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if collection already exists
    const existingCollection = await Collection.findOne({ name, userId });
    if (existingCollection) {
      return res.status(400).json({ message: "Collection already exists" });
    }

    const collection = new Collection({ name, userId, cocktails: [] });
    await collection.save();

    res.status(201).json({ message: "Collection created!", collection });
  } catch (error) {
    console.error("Error creating collection:", error);
    res.status(500).json({ message: "Failed to create collection" });
  }
};

// Get all collections for a user
const getUserCollections = async (req, res) => {
  try {
    const { userId } = req.params;

    const collections = await Collection.find({ userId });
    res.status(200).json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ message: "Failed to fetch collections" });
  }
};

// Get all saved recipes for a user
const getUserRecipes = async (req, res) => {
  try {
    const { userId } = req.params;

    const recipes = await Cocktail.find({ userId });
    res.status(200).json({ recipes });
  } catch (error) {
    console.error("Error fetching saved recipes:", error);
    res.status(500).json({ message: "Failed to fetch saved recipes" });
  }
};

// Get all recipes in a specific collection
const getRecipesInCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;

    const collection = await Collection.findById(collectionId).populate(
      "cocktails"
    );

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    res.status(200).json({ cocktails: collection.cocktails });
  } catch (error) {
    console.error("Error fetching collection recipes:", error);
    res.status(500).json({ message: "Failed to fetch collection recipes" });
  }
};

module.exports = {
  createCollection,
  getUserCollections,
  getUserRecipes,
  getRecipesInCollection,
};
