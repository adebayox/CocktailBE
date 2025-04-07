const mongoose = require("mongoose");
const User = require("./user"); // Import the User model

const CocktailSchema = new mongoose.Schema({
  name: String,
  ingredients: [String],
  instructions: { type: [String], required: true },
  description: String,
  tip: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  cocktailId: String,
  imageUrl: { type: String, required: false },
  healthRating: { type: Number, min: 1, max: 10, default: null },
  healthNotes: { type: String, default: "" },
});

const Cocktail = mongoose.model("Cocktail", CocktailSchema);

const CollectionSchema = new mongoose.Schema({
  name: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  cocktails: [{ type: mongoose.Schema.Types.Mixed, ref: "Cocktail" }],
});

const Collection = mongoose.model("Collection", CollectionSchema);

const RatingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cocktail",
    required: true,
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const Rating = mongoose.model("Rating", RatingSchema);

module.exports = { Cocktail, Collection, Rating };
