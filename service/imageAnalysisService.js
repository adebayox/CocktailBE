// services/imageAnalysisService.js
const { OpenAI } = require("openai");
const crypto = require("crypto");
const { executeWithResilience, AI_TIMEOUTS } = require("../utils/aiHelpers");
const { imageAnalysisCache, CACHE_CONFIG } = require("../utils/cache");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a hash for image data to use as cache key
 * @param {string} imageData - Base64 image data
 * @returns {string} - Hash of the image
 */
const hashImageData = (imageData) => {
  return crypto.createHash('md5').update(imageData).digest('hex');
};

/**
 * Service to analyze cocktail images and identify ingredients
 */
const analyzeCocktailImage = async (imageBase64) => {
  try {
    if (!imageBase64) {
      throw new Error("Missing image data");
    }

    // Remove the data:image prefix if present
    const base64Data = imageBase64.includes("base64,")
      ? imageBase64.split("base64,")[1]
      : imageBase64;

    // Check cache first (using hash of image data)
    const imageHash = hashImageData(base64Data);
    const cachedResult = imageAnalysisCache.get(imageHash);
    if (cachedResult) {
      console.log(`[Cache] Hit for image analysis`);
      return { ...cachedResult, fromCache: true };
    }
    console.log(`[Cache] Miss for image analysis - calling API`);

    // Call OpenAI Vision API to analyze the image with timeout and retry
    const response = await executeWithResilience(
      () => openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional mixologist and cocktail expert.
            Analyze the provided cocktail image and identify:
            1. The most likely name of the cocktail
            2. The ingredients you can identify from the image
            3. Any garnishes visible
            4. The approximate color and appearance
            
            Provide your response as valid JSON with this exact structure:
            {
              "cocktailName": "Name of the cocktail",
              "ingredients": ["ingredient1", "ingredient2"],
              "garnishes": ["garnish1", "garnish2"],
              "appearance": "Description"
            }
            
            DO NOT include any text before or after the JSON object.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
              {
                type: "text",
                text: "Identify this cocktail and its ingredients. Respond with JSON only.",
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      }),
      {
        timeout: AI_TIMEOUTS.IMAGE_ANALYSIS,
        maxRetries: 2,
        operationName: 'Image Analysis'
      }
    );

    // Extract the response content
    const responseContent = response.choices[0].message.content.trim();

    try {
      // Parse JSON response
      const result = JSON.parse(responseContent);
      
      // Cache the result
      imageAnalysisCache.set(imageHash, result, CACHE_CONFIG.IMAGE_ANALYSIS_TTL);
      console.log(`[Cache] Stored image analysis result`);
      
      return result;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);

      // More aggressive fallback for finding JSON in the response
      const jsonRegex = /{[\s\S]*}/;
      const match = responseContent.match(jsonRegex);

      if (match && match[0]) {
        try {
          return JSON.parse(match[0]);
        } catch (secondParseError) {
          console.error("Second JSON parse attempt failed:", secondParseError);
        }
      }

      // Structured fallback if all parsing fails
      return {
        cocktailName: "Unknown Cocktail",
        ingredients: extractPotentialIngredients(responseContent),
        garnishes: [],
        appearance: "Unable to determine",
        error: "Failed to parse API response",
      };
    }
  } catch (error) {
    console.error("Image analysis error:", error);
    throw new Error(`Failed to analyze cocktail image: ${error.message}`);
  }
};

// Helper function to extract ingredients if JSON parsing fails
const extractPotentialIngredients = (text) => {
  // Look for common liquors and ingredients in the text
  const commonIngredients = [
    "vodka",
    "gin",
    "rum",
    "tequila",
    "whiskey",
    "bourbon",
    "brandy",
    "lime",
    "lemon",
    "orange",
    "grapefruit",
    "pineapple",
    "cranberry",
    "syrup",
    "bitters",
    "sugar",
    "salt",
    "soda",
    "tonic",
    "grenadine",
    "vermouth",
    "juice",
    "liqueur",
    "triple sec",
    "curacao",
  ];

  const found = [];
  commonIngredients.forEach((ingredient) => {
    if (text.toLowerCase().includes(ingredient)) {
      found.push(ingredient);
    }
  });

  return found;
};

module.exports = { analyzeCocktailImage };
