const { v4: uuidv4 } = require("uuid");
const { OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateCocktail = async (ingredients, flavors, dietaryNeeds) => {
  try {
    const prompt = `Create a personalized cocktail recipe using these preferences:
Ingredients: ${ingredients.join(", ")}
Flavors: ${flavors.join(", ")}
Dietary Needs: ${dietaryNeeds.join(", ")}

Along with the cocktail, analyze the nutritional value and health aspects of this recipe.

Provide the recipe in the following strict JSON format - do not include any additional text or markdown:
{
  "name": "Cocktail Name",
  "ingredients": ["2 oz ingredient 1", "1 oz ingredient 2"],
  "instructions": ["Step 1", "Step 2"],
  "description": "Brief description",
  "tip": "A helpful tip",
  "healthRating": 7,
  "healthNotes": "Brief notes about the nutritional value and health aspects of this recipe"
}
  The healthRating should be on a scale of 1-10, where:
1-3: Not very healthy (high sugar, high alcohol, minimal nutritional value)
4-6: Moderate (balanced between indulgence and some nutritional benefits)
7-10: Relatively healthy (lower alcohol, natural ingredients, nutritional benefits)`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional mixologist. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    // Get the response content
    const recipeString = response.choices[0].message.content.trim();

    // Attempt to parse JSON, with error handling
    let recipe;
    try {
      recipe = JSON.parse(recipeString);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.log("Received content:", recipeString);
      throw new Error("Invalid JSON format received from API");
    }

    // Validate the recipe structure
    if (
      !recipe.name ||
      !Array.isArray(recipe.ingredients) ||
      !Array.isArray(recipe.instructions) ||
      !recipe.description ||
      !recipe.tip ||
      !recipe.healthRating ||
      !recipe.healthNotes
    ) {
      throw new Error("Recipe missing required fields");
    }

    // Add a unique cocktailId to the recipe
    recipe.cocktailId = uuidv4();

    // Generate an image for the cocktail
    try {
      const imagePrompt = `A professional, appetizing photo of a ${
        recipe.name
      } cocktail. 
      Made with ${recipe.ingredients.join(", ")}. 
      High quality, studio lighting, on a bar counter with elegant garnish, photorealistic.`;

      const imageResponse = await openai.images.generate({
        model: "dall-e-3", // or "dall-e-2" if preferred
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
      });

      if (imageResponse.data && imageResponse.data[0].url) {
        recipe.imageUrl = imageResponse.data[0].url;
      }
    } catch (imageError) {
      console.error("Image generation error:", imageError);
      // Continue without an image if generation fails
    }

    return recipe;
  } catch (error) {
    console.error("Error generating cocktail recipe:", error);
    throw new Error(`Failed to generate cocktail recipe: ${error.message}`);
  }
};

module.exports = { generateCocktail };
