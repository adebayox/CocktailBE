# CocktailRecipay built using Node.js/Express

# API Collection Description

This API collection provides endpoints to generate AI-powered cocktail recipes, manage user collections, analyze images, handle user authentication, and collect feedback through ratings. It allows developers to integrate functionalities such as recipe creation, image generation, saving to collections, and chat-based recipe assistance.

## Cocktails

The Cocktail API endpoints allow users to generate, save, retrieve, and delete cocktail recipes. Users can also organize their recipes into collections and share recipes via public links.

## Authentication

The Authentication API endpoints allow users to register and log in securely. These endpoints implement JWT-based authentication to ensure secure access to protected routes.

## Collections

The Collection API endpoints allow users to create and manage collections of saved cocktail recipes.

## Image & Chat Features

This set of endpoints enables AI-based recipe chats, image analysis for cocktail identification, and AI-generated cocktail visuals.

## Ratings

Users can rate and leave feedback on recipes using these endpoints.

---

## API Endpoints
 
- **POST /api/cocktail**: Generate a new cocktail recipe (AI-powered).
- **POST /api/cocktail/save**: Save a generated cocktail.
- **GET /api/cocktail/save**: Retrieve saved cocktails.
- **POST /api/cocktail/save-to-collection**: Save a cocktail to a specific collection.
- **DELETE /api/cocktail/cocktail/:cocktailId**: Delete a saved cocktail.
- **DELETE /api/cocktail/collection/:collectionId**: Delete a saved collection.
- **GET /api/cocktail/shared/:recipeId**: Retrieve a shared recipe by ID.
- **POST /api/cocktail/chat**: Get recipe assistance via AI chat.
- **POST /api/cocktail/analyze-image**: Analyze an uploaded cocktail image.
- **POST /api/cocktail/generate-image**: Generate an AI image of a cocktail.
- **POST /api/cocktail/ratings**: Submit a rating and feedback for a recipe.
- **GET /api/cocktail/ratings/:recipeId**: Retrieve all ratings for a recipe.
- **POST /api/users**: Register a new user.
- **POST /api/auth**: Log in and receive an access token.
- **POST /api/user/collection**: Create a new cocktail collection.
- **GET /api/user/collections/:userId**: Get all collections for a user.
- **GET /api/user/recipes/:userId**: Get all saved recipes for a user.
- **GET /api/user/collection/:collectionId**: Get all recipes in a specific collection.
    
-
---

Please refer to the API documentation for more detailed information on their usage, request parameters, and response formats.

## https://cocktailbe.onrender.com/api-docs
