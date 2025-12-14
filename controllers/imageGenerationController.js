const { OpenAI } = require("openai");
const { executeWithResilience, AI_TIMEOUTS } = require("../utils/aiHelpers");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Controller for generating cocktail images
 */
const generateCocktailImage = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        code: "01",
        message: "Missing prompt",
      });
    }

    // Image quality from env or request
    const imageQuality = req.body.quality || process.env.IMAGE_QUALITY || "balanced";
    
    const imageSettings = {
      fast: {
        model: "dall-e-2",
        size: "512x512",
      },
      balanced: {
        model: "dall-e-3",
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      },
      quality: {
        model: "dall-e-3",
        size: "1024x1024",
        quality: "hd",
        style: "vivid",
      }
    };

    const settings = imageSettings[imageQuality] || imageSettings.balanced;

    // Generate image using OpenAI DALL-E with timeout and retry
    const response = await executeWithResilience(
      () => openai.images.generate({
        prompt: prompt,
        n: 1,
        ...settings,
      }),
      {
        timeout: AI_TIMEOUTS.IMAGE_GENERATION,
        maxRetries: 2,
        operationName: 'Image Generation'
      }
    );
    
    console.log(`[Image] Generated with "${imageQuality}" quality`);

    // Extract the image URL from the response
    const imageUrl = response.data[0].url;

    return res.status(200).json({
      code: "00",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return res.status(500).json({
      code: "01",
      message: error.message || "An error occurred while generating the image",
    });
  }
};

module.exports = { generateCocktailImage };
