// services/chatService.js
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Service for handling recipe chat functionality
 */
const generateRecipeResponse = async (message, recipeContext) => {
  try {
    if (!message || !recipeContext) {
      throw new Error('Missing required fields');
    }

    // Format the recipe information for the AI context
    const recipeInfo = `
Name: ${recipeContext.name}
Description: ${recipeContext.description}
Health Rating: ${recipeContext.healthRating}/10
Health Notes: ${recipeContext.healthNotes || 'None provided'}
Ingredients: ${Array.isArray(recipeContext.ingredients) ? recipeContext.ingredients.join(', ') : recipeContext.ingredients}
Instructions: ${Array.isArray(recipeContext.instructions) ? recipeContext.instructions.join(' ') : recipeContext.instructions}
Tip: ${recipeContext.tip || 'None provided'}
Tags: ${Array.isArray(recipeContext.tags) ? recipeContext.tags.join(', ') : 'None provided'}
`;

    // Create OpenAI chat completion
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // You can upgrade to a more advanced model if needed
      messages: [
        {
          role: "system",
          content: `You are a helpful cocktail and mixology expert. 
          You're answering questions about a specific cocktail recipe. 
          Be concise and friendly in your responses. 
          Here is the recipe information you should reference:
          ${recipeInfo}`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 250, // Keeping responses concise
    });

    // Extract the AI response
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Chat service error:', error);
    throw new Error(`Failed to generate recipe response: ${error.message}`);
  }
};

module.exports = { generateRecipeResponse };