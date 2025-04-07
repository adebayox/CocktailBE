// controllers/chatController.js
const { generateRecipeResponse } = require("../service/chatService");

/**
 * Controller for chat functionality
 */
const handleRecipeChat = async (req, res) => {
  try {
    const { message, recipeContext } = req.body;

    if (!message || !recipeContext) {
      return res.status(400).json({
        code: "01",
        message: "Missing required message or recipe context",
      });
    }

    const responseMessage = await generateRecipeResponse(
      message,
      recipeContext
    );

    return res.status(200).json({
      code: "00",
      message: responseMessage,
    });
  } catch (error) {
    console.error("Chat controller error:", error);
    return res.status(500).json({
      code: "01",
      message:
        error.message || "An error occurred while processing your request",
    });
  }
};

module.exports = { handleRecipeChat };
