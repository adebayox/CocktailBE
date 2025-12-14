// controllers/chatController.js
const { 
  generateRecipeResponse, 
  generateRecipeResponseStream 
} = require("../service/chatService");

/**
 * Controller for chat functionality (non-streaming)
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

/**
 * Controller for chat functionality with STREAMING response
 * Returns tokens as Server-Sent Events (SSE) as they arrive
 */
const handleRecipeChatStream = async (req, res) => {
  try {
    const { message, recipeContext } = req.body;

    if (!message || !recipeContext) {
      return res.status(400).json({
        code: "01",
        message: "Missing required message or recipe context",
      });
    }

    // This function handles streaming directly to res
    await generateRecipeResponseStream(message, recipeContext, res);

  } catch (error) {
    console.error("Chat stream controller error:", error);
    
    // Only send error if headers haven't been sent
    if (!res.headersSent) {
      return res.status(500).json({
        code: "01",
        message:
          error.message || "An error occurred while processing your request",
      });
    }
  }
};

module.exports = { handleRecipeChat, handleRecipeChatStream };
