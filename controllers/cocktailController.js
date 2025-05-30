const { generateCocktail } = require("../service/cocktailService");
const { Cocktail, Collection } = require("../models/cocktailModel");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const getCocktail = async (req, res) => {
  try {
    const { ingredients, flavors, dietaryNeeds } = req.body;

    // Validate input
    if (!ingredients || !flavors || !dietaryNeeds) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate the cocktail recipe
    const recipe = await generateCocktail(ingredients, flavors, dietaryNeeds);

    const cocktailWithId = {
      ...recipe,
      cocktailId: uuidv4(), // Generate a unique ID for the cocktail
    };

    // Return the generated recipe
    res.status(200).json({ code: "00", recipe: cocktailWithId });
  } catch (error) {
    console.error("Error in getCocktailRecipe:", error);
    res.status(500).json({ message: "Failed to generate cocktail recipe" });
  }
};

// Save cocktail to DB
const saveCocktail = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      ingredients,
      instructions,
      tip,
      description,
      cocktailId,
      healthRating,
      healthNotes,
      imageUrl, 
    } = req.body;

    if (!name || !ingredients || !instructions || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const cocktail = new Cocktail({
      name,
      ingredients,
      instructions,
      description,
      tip,
      cocktailId,
      healthRating,
      healthNotes,
      imageUrl, 
      userId,
    });

    await cocktail.save();
    res.status(201).json({ code: "00", message: "Cocktail saved!", cocktail });
  } catch (error) {
    console.error("Error saving cocktail:", error);
    res.status(500).json({ message: "Failed to save cocktail" });
  }
};

// Get saved cocktails
const savedCocktail = async (req, res) => {
  try {
    const savedRecipes = await Cocktail.find({ userId: req.user._id });
    res.status(200).json({ code: "00", savedRecipes });
  } catch (error) {
    res.status(500).json({ code: "99", message: error.message });
  }
};

// Save to collection
const saveToCollection = async (req, res) => {
  try {
    const { cocktail, cocktailId, collectionName, userId } = req.body;

    // Validate required fields
    if ((!cocktail && !cocktailId) || !collectionName || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate userId as a valid ObjectId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    // Find or create the collection
    let collection = await Collection.findOne({ name: collectionName, userId });

    if (!collection) {
      collection = new Collection({
        name: collectionName,
        userId,
        cocktails: [], 
      });
    }

    // Handle different ways of adding a cocktail
    if (cocktail) {
      // If we have a full cocktail object
      // Check if the cocktail is already in the collection
      const isCocktailInCollection = collection.cocktails.some(
        (c) => c.cocktailId === cocktail.cocktailId
      );

      if (!isCocktailInCollection) {
        collection.cocktails.push(cocktail);
      } else {
        return res
          .status(400)
          .json({ message: "Cocktail already in collection" });
      }
    } else if (cocktailId) {
      // If we just have a cocktailId (from a saved cocktail)
      // Find the cocktail in the database
      const savedCocktail = await Cocktail.findById(cocktailId);

      if (!savedCocktail) {
        return res.status(404).json({ message: "Cocktail not found" });
      }

      // Check if the cocktail is already in the collection
      const isCocktailInCollection = collection.cocktails.some(
        (c) => c._id && c._id.toString() === cocktailId
      );

      if (!isCocktailInCollection) {
        collection.cocktails.push(savedCocktail);
      } else {
        return res
          .status(400)
          .json({ message: "Cocktail already in collection" });
      }
    }

    // Save the collection
    await collection.save();
    res.status(200).json({
      code: "00",
      message: "Cocktail added to collection!",
      collection,
    });
  } catch (error) {
    console.error("Error saving to collection:", error);
    res.status(500).json({ message: "Failed to save to collection" });
  }
};

// Delete a saved cocktail recipe
const deleteCocktail = async (req, res) => {
  try {
    const { cocktailId } = req.params; 
    const userId = req.user._id; 

    // Validate the cocktail ID
    if (!mongoose.isValidObjectId(cocktailId)) {
      return res.status(400).json({ message: "Invalid cocktail ID" });
    }

    // Find and delete the cocktail
    const deletedCocktail = await Cocktail.findOneAndDelete({
      _id: cocktailId,
      userId: userId, 
    });

    if (!deletedCocktail) {
      return res.status(404).json({ message: "Cocktail not found" });
    }

    res
      .status(200)
      .json({ code: "00", message: "Cocktail deleted successfully!" });
  } catch (error) {
    console.error("Error deleting cocktail:", error);
    res.status(500).json({ message: "Failed to delete cocktail" });
  }
};

// Delete a collection
const deleteCollection = async (req, res) => {
  try {
    const { collectionId } = req.params; 
    const userId = req.user._id; 

    // Validate the collection ID
    if (!mongoose.isValidObjectId(collectionId)) {
      return res.status(400).json({ message: "Invalid collection ID" });
    }

    // Find and delete the collection
    const deletedCollection = await Collection.findOneAndDelete({
      _id: collectionId,
      userId: userId, 
    });

    if (!deletedCollection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    res
      .status(200)
      .json({ code: "00", message: "Collection deleted successfully!" });
  } catch (error) {
    console.error("Error deleting collection:", error);
    res.status(500).json({ message: "Failed to delete collection" });
  }
};

const getSharedRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    console.log("Fetching shared recipe with ID:", recipeId); // Debug

    // Check if recipeId is a valid MongoDB ObjectId
    const isObjectId = mongoose.isValidObjectId(recipeId);

    let recipe;

    // 1. First try to find in saved recipes
    if (isObjectId) {
      recipe = await Cocktail.findById(recipeId);
    } else {
      // Search by cocktailId (UUID)
      recipe = await Cocktail.findOne({ cocktailId: recipeId });
    }

    // 2. If not found in saved recipes, check collections
    if (!recipe) {
      console.log("Not found in Cocktail, checking Collections...");
      const collections = await Collection.find({
        "cocktails.cocktailId": recipeId,
      });

      if (collections.length > 0) {
        // Find the specific cocktail in any collection
        for (const collection of collections) {
          const foundCocktail = collection.cocktails.find(
            (c) => c.cocktailId === recipeId
          );
          if (foundCocktail) {
            recipe = foundCocktail;
            break;
          }
        }
      }
    }

    if (!recipe) {
      console.log("Recipe not found in DB");
      return res.status(404).json({ message: "Recipe not found" });
    }

    console.log("Found recipe:", recipe); // Debug
    res.status(200).json({ code: "00", recipe });
  } catch (error) {
    console.error("Error fetching shared recipe:", error);
    res.status(500).json({ message: "Failed to fetch recipe" });
  }
};

module.exports = {
  getCocktail,
  saveCocktail,
  saveToCollection,
  savedCocktail,
  deleteCocktail,
  deleteCollection,
  getSharedRecipe,
};
