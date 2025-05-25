const { v4: uuidv4 } = require("uuid");
const { OpenAI } = require("openai");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary (add these to your environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to upload image to Cloudinary
const uploadToCloudinary = async (imageUrl, cocktailId) => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "cocktail-images",
      public_id: cocktailId,
      resource_type: "image",
      format: "png",
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

const generateCocktail = async (ingredients, flavors, dietaryNeeds) => {
  try {
    const prompt = `As an expert mixologist with 20+ years of experience, create a sophisticated cocktail recipe using these preferences:

Available Ingredients: ${ingredients.join(", ")}
Desired Flavors: ${flavors.join(", ")}
Dietary Requirements: ${dietaryNeeds.join(", ")}

Create a unique, well-balanced cocktail that showcases these preferences. Provide comprehensive details including precise measurements, specific techniques, and professional tips.

IMPORTANT REQUIREMENTS:
- Include at least 4-6 ingredients with exact measurements (oz, ml, dashes, etc.)
- Provide 6-8 detailed step-by-step instructions with specific techniques
- Include garnish specifications and glassware recommendations
- Add professional mixing techniques (shake, stir, muddle, etc.)
- Mention timing, temperature, and texture details
- Include flavor balance notes and variations

Analyze the nutritional value and health aspects thoroughly, considering alcohol content, sugar levels, antioxidants, vitamins, and overall wellness impact.

Respond with ONLY valid JSON in this exact format:
{
  "name": "Creative Cocktail Name",
  "ingredients": [
    "2 oz premium base spirit (specific brand recommendation)",
    "0.75 oz fresh citrus juice (specify type)",
    "0.5 oz liqueur or modifier (specify type and purpose)",
    "0.25 oz sweetener (specify type - simple syrup, honey, etc.)",
    "2-3 dashes bitters (specify type)",
    "Fresh herb or spice (for muddling/garnish)",
    "Additional ingredients as needed"
  ],
  "instructions": [
    "Prepare your glassware: [specific glass type] chilled/at room temperature",
    "In shaker/mixing glass, gently muddle [specific ingredient] to release oils",
    "Add [liquid ingredients in specific order] and fill with ice",
    "Shake vigorously for 12-15 seconds / Stir gently for 30 seconds [specify technique and why]",
    "Double strain into prepared glass over [ice specification]",
    "Express oils from [citrus peel] over drink and drop in",
    "Garnish with [specific garnish] placed [specific position]",
    "Serve immediately with [any accompaniments]"
  ],
  "description": "Detailed description covering flavor profile, aroma, visual appeal, and drinking experience (2-3 sentences)",
  "tip": "Professional tip covering technique, ingredient substitutions, or serving suggestions that elevates the cocktail",
  "glassware": "Specific glass type (coupe, rocks, highball, etc.)",
  "technique": "Primary mixing technique used (shaken, stirred, built)",
  "servingTemp": "Optimal serving temperature",
  "healthRating": 7,
  "healthNotes": "Comprehensive analysis covering: alcohol content impact, natural vs artificial ingredients, vitamin/antioxidant content, sugar levels, caloric estimate, and any specific health benefits or considerations (3-4 sentences)"
}

The healthRating should be on a scale of 1-10 where:
1-3: High alcohol, high sugar, artificial ingredients, minimal nutritional value
4-6: Moderate alcohol, some natural ingredients, balanced indulgence
7-10: Lower alcohol content, fresh/natural ingredients, functional health benefits`;

    const response = await openai.chat.completions.create({
      model: "gpt-4", // Upgraded to GPT-4 for better reasoning and detail
      messages: [
        {
          role: "system",
          content:
            "You are a world-renowned mixologist and cocktail expert with extensive knowledge of flavor profiles, techniques, and health-conscious bartending. You create only sophisticated, well-balanced cocktails with precise measurements and detailed instructions. Always respond with valid JSON only - no additional text, markdown, or explanations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8, // Slightly higher for more creativity
      max_tokens: 1200, // Increased for more detailed responses
    });

    // Get the response content
    const recipeString = response.choices[0].message.content.trim();

    // Clean up any potential markdown formatting
    const cleanedRecipeString = recipeString
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Attempt to parse JSON, with error handling
    let recipe;
    try {
      recipe = JSON.parse(cleanedRecipeString);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.log("Received content:", cleanedRecipeString);
      throw new Error("Invalid JSON format received from API");
    }

    // Enhanced validation for the recipe structure
    const requiredFields = [
      "name",
      "ingredients",
      "instructions",
      "description",
      "tip",
      "healthRating",
      "healthNotes",
    ];

    const missingFields = requiredFields.filter((field) => !recipe[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Recipe missing required fields: ${missingFields.join(", ")}`
      );
    }

    // Validate arrays have sufficient content
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 3) {
      throw new Error("Recipe must have at least 3 detailed ingredients");
    }

    if (!Array.isArray(recipe.instructions) || recipe.instructions.length < 5) {
      throw new Error("Recipe must have at least 5 detailed instructions");
    }

    // Add a unique cocktailId to the recipe
    recipe.cocktailId = uuidv4();

    // Generate an enhanced image for the cocktail
    try {
      const imagePrompt = `A stunning, professional photograph of a ${
        recipe.name
      } cocktail in a ${recipe.glassware || "elegant glass"}. 
      
      The cocktail is made with ${recipe.ingredients
        .slice(0, 3)
        .join(", ")} and features ${recipe.description}. 
      
      Shot with professional studio lighting, shallow depth of field, on a sophisticated bar counter with premium bar tools visible in the background. The drink should look refreshing and appetizing with perfect garnish placement. 
      
      Style: high-end cocktail photography, dramatic lighting, rich colors, photorealistic, 4K quality.`;

      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "hd", // Higher quality images
        style: "vivid", // More vibrant colors
      });

      if (imageResponse.data && imageResponse.data[0].url) {
        // Upload the temporary DALL-E URL to Cloudinary for permanent storage
        const permanentImageUrl = await uploadToCloudinary(
          imageResponse.data[0].url,
          recipe.cocktailId
        );
        recipe.imageUrl = permanentImageUrl;
        console.log(`Image uploaded to Cloudinary: ${permanentImageUrl}`);
      }
    } catch (imageError) {
      console.error("Image generation/upload error:", imageError);
      // Continue without an image if generation/upload fails
    }

    return recipe;
  } catch (error) {
    console.error("Error generating cocktail recipe:", error);
    throw new Error(`Failed to generate cocktail recipe: ${error.message}`);
  }
};

module.exports = { generateCocktail };
