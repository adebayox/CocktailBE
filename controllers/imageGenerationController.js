const { OpenAI } = require("openai");
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

    // Generate image using OpenAI DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3", // or "dall-e-2" if you prefer
      prompt: prompt,
      n: 1,
      size: "1024x1024", // or other sizes as needed
    });

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
