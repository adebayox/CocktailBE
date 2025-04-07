const { Rating, Cocktail } = require("../models/cocktailModel");
const User = require("../models/user");
const mongoose = require("mongoose");

// Submit a rating and feedback
const submitRating = async (req, res) => {
  const { userId, recipeId, rating, feedback } = req.body;

  try {
    // Validate required fields
    if (!userId || !recipeId || !rating) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate rating (1-5)
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be a number between 1 and 5" });
    }

    // Find the cocktail by either _id or cocktailId
    let cocktail;
    if (mongoose.isValidObjectId(recipeId)) {
      cocktail = await Cocktail.findById(recipeId);
    }

    if (!cocktail) {
      // If not found by _id, try finding by cocktailId
      cocktail = await Cocktail.findOne({ cocktailId: recipeId });
    }

    if (!cocktail) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Create a new rating using the cocktail's _id
    const newRating = new Rating({
      userId,
      recipeId: cocktail._id, // Always use the MongoDB _id
      rating,
      feedback,
    });
    await newRating.save();

    res.status(201).json({
      code: "00",
      message: "Rating submitted successfully!",
      rating: newRating,
    });
  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({ message: "Failed to submit rating" });
  }
};

// Fetch all ratings and feedback for a recipe
const getRatings = async (req, res) => {
  const { recipeId } = req.params;

  try {
    // Find the cocktail by either _id or cocktailId
    let cocktail;
    if (mongoose.isValidObjectId(recipeId)) {
      cocktail = await Cocktail.findById(recipeId);
    }

    if (!cocktail) {
      // If not found by _id, try finding by cocktailId
      cocktail = await Cocktail.findOne({ cocktailId: recipeId });
    }

    if (!cocktail) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Fetch ratings using the cocktail's _id
    const ratings = await Rating.find({ recipeId: cocktail._id }).populate(
      "userId",
      "username"
    );

    res.status(200).json({ code: "00", ratings });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({ message: "Failed to fetch ratings" });
  }
};

module.exports = {
  submitRating,
  getRatings,
};
