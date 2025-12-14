// services/chatService.js
const { OpenAI } = require("openai");
const { executeWithResilience, AI_TIMEOUTS } = require("../utils/aiHelpers");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Format recipe context into a string for the AI
 */
const formatRecipeInfo = (recipeContext) => {
  return `
Name: ${recipeContext.name}
Description: ${recipeContext.description}
Health Rating: ${recipeContext.healthRating}/10
Health Notes: ${recipeContext.healthNotes || 'None provided'}
Ingredients: ${Array.isArray(recipeContext.ingredients) ? recipeContext.ingredients.join(', ') : recipeContext.ingredients}
Instructions: ${Array.isArray(recipeContext.instructions) ? recipeContext.instructions.join(' ') : recipeContext.instructions}
Tip: ${recipeContext.tip || 'None provided'}
Tags: ${Array.isArray(recipeContext.tags) ? recipeContext.tags.join(', ') : 'None provided'}
`;
};

/**
 * Service for handling recipe chat functionality (non-streaming)
 */
const generateRecipeResponse = async (message, recipeContext) => {
  try {
    if (!message || !recipeContext) {
      throw new Error('Missing required fields');
    }

    const recipeInfo = formatRecipeInfo(recipeContext);

    // Create OpenAI chat completion with timeout and retry
    const response = await executeWithResilience(
      () => openai.chat.completions.create({
        model: "gpt-3.5-turbo",
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
        max_tokens: 250,
      }),
      {
        timeout: AI_TIMEOUTS.CHAT_RESPONSE,
        maxRetries: 2,
        operationName: 'Chat Response'
      }
    );

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Chat service error:', error);
    throw new Error(`Failed to generate recipe response: ${error.message}`);
  }
};

/**
 * Service for handling recipe chat with STREAMING response
 * Sends tokens to client as they arrive from OpenAI
 * @param {string} message - User's message
 * @param {Object} recipeContext - The recipe details
 * @param {Response} res - Express response object for streaming
 */
const generateRecipeResponseStream = async (message, recipeContext, res) => {
  try {
    if (!message || !recipeContext) {
      throw new Error('Missing required fields');
    }

    const recipeInfo = formatRecipeInfo(recipeContext);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Create streaming OpenAI chat completion
    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
      max_tokens: 250,
      stream: true, // Enable streaming
    });

    // Stream tokens to client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Send as SSE format
        res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
      }
    }

    // Signal completion
    res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat streaming error:', error);
    
    // Send error as SSE
    res.write(`data: ${JSON.stringify({ 
      error: error.message || 'An error occurred', 
      done: true 
    })}\n\n`);
    res.end();
  }
};

module.exports = { generateRecipeResponse, generateRecipeResponseStream };