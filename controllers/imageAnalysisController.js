// controllers/imageAnalysisController.js
const { analyzeCocktailImage } = require("../service/imageAnalysisService");

/**
 * Controller for handling cocktail image analysis
 */
const handleCocktailImageAnalysis = async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({
        code: "01",
        message: "Missing image data",
      });
    }

    const analysisResult = await analyzeCocktailImage(imageData);

    return res.status(200).json({
      code: "00",
      analysis: analysisResult,
    });
  } catch (error) {
    console.error("Image analysis controller error:", error);
    return res.status(500).json({
      code: "01",
      message: error.message || "An error occurred while analyzing the image",
    });
  }
};

module.exports = { handleCocktailImageAnalysis };
