const { v4: uuidv4 } = require("uuid");
const { OpenAI } = require("openai");
const cloudinary = require("cloudinary").v2;
const { 
  executeWithResilience, 
  withTimeout,
  AI_TIMEOUTS 
} = require("../utils/aiHelpers");
const { recipeCache, SimpleCache, CACHE_CONFIG } = require("../utils/cache");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to upload image to Cloudinary with optimization
const uploadToCloudinary = async (imageUrl, cocktailId) => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "cocktail-images",
      public_id: cocktailId,
      resource_type: "image",
      format: "webp",           // WebP is smaller and faster than PNG
      quality: "auto:good",     // Auto-optimize quality
      fetch_format: "auto",     // Serve best format for browser
    });

    // Return both the original URL and pre-built optimized URLs
    const baseUrl = result.secure_url.replace('/upload/', '/upload/');
    
    return {
      original: result.secure_url,
      // Thumbnail for cards/lists (300px)
      thumbnail: result.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill,q_auto,f_auto/'),
      // Medium for detail view (600px)
      medium: result.secure_url.replace('/upload/', '/upload/w_600,h_600,c_fill,q_auto,f_auto/'),
      // Large for full view (800px)
      large: result.secure_url.replace('/upload/', '/upload/w_800,h_800,c_fill,q_auto,f_auto/')
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

const generateCocktail = async (ingredients, flavors, dietaryNeeds, options = {}) => {
  const { skipCache = false } = options;

  // Generate cache key from inputs
  const cacheKey = SimpleCache.generateKey({ ingredients, flavors, dietaryNeeds });

  // Check cache first (unless explicitly skipped)
  if (!skipCache) {
    const cachedRecipe = recipeCache.get(cacheKey);
    if (cachedRecipe) {
      console.log(`[Cache] Hit for recipe: ${cachedRecipe.name}`);
      // Return cached recipe with new ID (so it's a fresh instance)
      return {
        ...cachedRecipe,
        cocktailId: uuidv4(),
        imageUrl: null,
        imageStatus: "pending",
        fromCache: true
      };
    }
    console.log(`[Cache] Miss - generating new recipe`);
  }

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

    // Execute with timeout and retry for resilience
    const response = await executeWithResilience(
      () => openai.chat.completions.create({
      model: "gpt-4",
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
      temperature: 0.8,
      max_tokens: 1200,
      }),
      {
        timeout: AI_TIMEOUTS.RECIPE_GENERATION,
        maxRetries: 3,
        operationName: 'Recipe Generation'
      }
    );

    const recipeString = response.choices[0].message.content.trim();

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

    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 3) {
      throw new Error("Recipe must have at least 3 detailed ingredients");
    }

    if (!Array.isArray(recipe.instructions) || recipe.instructions.length < 5) {
      throw new Error("Recipe must have at least 5 detailed instructions");
    }

    recipe.cocktailId = uuidv4();

    // Generate image inline (original approach - waits for image)
    try {
      const imagePrompt = `A stunning, professional photograph of a ${
        recipe.name
      } cocktail in a ${recipe.glassware || "elegant glass"}. 
      
      The cocktail is made with ${recipe.ingredients
        .slice(0, 3)
        .join(", ")} and features ${recipe.description}. 
      
      Shot with professional studio lighting, shallow depth of field, on a sophisticated bar counter with premium bar tools visible in the background. The drink should look refreshing and appetizing with perfect garnish placement. 
      
      Style: high-end cocktail photography, dramatic lighting, rich colors, photorealistic, 4K quality.`;

      // Image quality settings
      const imageQuality = process.env.IMAGE_QUALITY || "balanced";
      
      const imageSettings = {
        fast: { model: "dall-e-2", size: "512x512" },
        balanced: { model: "dall-e-3", size: "1024x1024", quality: "standard", style: "natural" },
        quality: { model: "dall-e-3", size: "1024x1024", quality: "hd", style: "vivid" }
      };

      const settings = imageSettings[imageQuality] || imageSettings.balanced;

      const imageResponse = await executeWithResilience(
        () => openai.images.generate({
        prompt: imagePrompt,
        n: 1,
          ...settings,
        }),
        {
          timeout: AI_TIMEOUTS.IMAGE_GENERATION,
          maxRetries: 2,
          operationName: 'Image Generation'
        }
      );

      console.log(`[Image] Generated with "${imageQuality}" quality using ${settings.model}`);

      if (imageResponse.data && imageResponse.data[0].url) {
        // Upload to Cloudinary
        const imageUrls = await withTimeout(
          uploadToCloudinary(imageResponse.data[0].url, recipe.cocktailId),
          AI_TIMEOUTS.CLOUDINARY_UPLOAD,
          'Cloudinary Upload'
        );
        // Store all image sizes
        recipe.imageUrl = imageUrls.medium;      // Default to medium size
        recipe.imageUrls = imageUrls;            // All sizes available
        console.log(`[Image] Uploaded to Cloudinary: ${imageUrls.medium}`);
      }
    } catch (imageError) {
      console.error("Image generation/upload error:", imageError);
      recipe.imageUrl = null; // Continue without image if it fails
    }

    // Cache the recipe for future requests
    const recipeToCache = { ...recipe };
    delete recipeToCache.cocktailId;
    recipeCache.set(cacheKey, recipeToCache, CACHE_CONFIG.RECIPE_TTL);
    console.log(`[Cache] Stored recipe: ${recipe.name}`);

    return recipe;
  } catch (error) {
    console.error("Error generating cocktail recipe:", error);
    throw new Error(`Failed to generate cocktail recipe: ${error.message}`);
  }
};

/**
 * Generate cocktail recipe with STREAMING response
 * Streams recipe sections as they're generated for better UX
 * @param {Array} ingredients - List of ingredients
 * @param {Array} flavors - Desired flavors  
 * @param {Array} dietaryNeeds - Dietary requirements
 * @param {Response} res - Express response object for streaming
 */
const generateCocktailStream = async (ingredients, flavors, dietaryNeeds, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Helper to send SSE events
  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`);
  };

  try {
    sendEvent('status', 'Starting recipe generation...');

    const prompt = `As an expert mixologist with 20+ years of experience, create a sophisticated cocktail recipe using these preferences:

Available Ingredients: ${ingredients.join(", ")}
Desired Flavors: ${flavors.join(", ")}
Dietary Requirements: ${dietaryNeeds.join(", ")}

Create a unique, well-balanced cocktail. Respond with ONLY valid JSON in this exact format:
{
  "name": "Creative Cocktail Name",
  "ingredients": ["2 oz spirit", "0.75 oz citrus", "0.5 oz sweetener"],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "description": "Flavor profile description",
  "tip": "Professional tip",
  "glassware": "Glass type",
  "healthRating": 7,
  "healthNotes": "Health analysis"
}`;

    sendEvent('status', 'Consulting our AI mixologist...');

    // Stream from OpenAI
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a world-renowned mixologist. Create sophisticated cocktails with precise measurements. Respond with valid JSON only."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 1200,
      stream: true
    });

    let fullContent = '';
    let lastParsedState = {};

    sendEvent('status', 'Crafting your perfect cocktail...');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        
        // Try to parse partial JSON and extract completed fields
        const parsed = tryParsePartialRecipe(fullContent);
        
        // Send new fields as they become available
        if (parsed.name && !lastParsedState.name) {
          sendEvent('name', parsed.name);
          lastParsedState.name = true;
        }
        if (parsed.description && !lastParsedState.description) {
          sendEvent('description', parsed.description);
          lastParsedState.description = true;
        }
        if (parsed.ingredients?.length > 0 && !lastParsedState.ingredients) {
          sendEvent('ingredients', parsed.ingredients);
          lastParsedState.ingredients = true;
        }
        if (parsed.instructions?.length > 0 && !lastParsedState.instructions) {
          sendEvent('instructions', parsed.instructions);
          lastParsedState.instructions = true;
        }
        if (parsed.tip && !lastParsedState.tip) {
          sendEvent('tip', parsed.tip);
          lastParsedState.tip = true;
        }
        if (parsed.healthRating && !lastParsedState.healthRating) {
          sendEvent('health', { 
            rating: parsed.healthRating, 
            notes: parsed.healthNotes 
          });
          lastParsedState.healthRating = true;
        }
      }
    }

    // Parse final complete recipe
    const cleanedContent = fullContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let recipe;
    try {
      recipe = JSON.parse(cleanedContent);
    } catch (parseError) {
      sendEvent('error', 'Failed to parse recipe. Please try again.');
      res.end();
      return;
    }

    // Add metadata
    recipe.cocktailId = uuidv4();

    // Send recipe without image first (so user sees content immediately)
    sendEvent('complete', { ...recipe, imageUrl: null });
    sendEvent('status', 'Recipe complete! Now generating image...');

    // Generate image
    try {
      const imagePrompt = `A stunning, professional photograph of a ${
        recipe.name
      } cocktail in a ${recipe.glassware || "elegant glass"}. 
      
      The cocktail is made with ${recipe.ingredients
        .slice(0, 3)
        .join(", ")} and features ${recipe.description}. 
      
      Shot with professional studio lighting, shallow depth of field, on a sophisticated bar counter. 
      
      Style: high-end cocktail photography, dramatic lighting, rich colors, photorealistic.`;

      const imageQuality = process.env.IMAGE_QUALITY || "balanced";
      
      const imageSettings = {
        fast: { model: "dall-e-2", size: "512x512" },
        balanced: { model: "dall-e-3", size: "1024x1024", quality: "standard", style: "natural" },
        quality: { model: "dall-e-3", size: "1024x1024", quality: "hd", style: "vivid" }
      };

      const settings = imageSettings[imageQuality] || imageSettings.balanced;

      sendEvent('status', 'Generating cocktail image...');

      const imageResponse = await executeWithResilience(
        () => openai.images.generate({
          prompt: imagePrompt,
          n: 1,
          ...settings,
        }),
        {
          timeout: AI_TIMEOUTS.IMAGE_GENERATION,
          maxRetries: 2,
          operationName: 'Image Generation'
        }
      );

      if (imageResponse.data && imageResponse.data[0].url) {
        sendEvent('status', 'Uploading image...');
        
        const imageUrls = await withTimeout(
          uploadToCloudinary(imageResponse.data[0].url, recipe.cocktailId),
          AI_TIMEOUTS.CLOUDINARY_UPLOAD,
          'Cloudinary Upload'
        );
        
        recipe.imageUrl = imageUrls.medium;   // Default to medium
        recipe.imageUrls = imageUrls;         // All sizes
        sendEvent('image', imageUrls);        // Send all sizes to frontend
        console.log(`[Stream] Image generated: ${imageUrls.medium}`);
      }
    } catch (imageError) {
      console.error("Streaming image generation error:", imageError);
      sendEvent('image_error', 'Failed to generate image');
      recipe.imageUrl = null;
    }

    // Cache the complete recipe
    const cacheKey = SimpleCache.generateKey({ ingredients, flavors, dietaryNeeds });
    const recipeToCache = { ...recipe };
    delete recipeToCache.cocktailId;
    recipeCache.set(cacheKey, recipeToCache, CACHE_CONFIG.RECIPE_TTL);

    // Send final complete recipe with image
    sendEvent('done', recipe);

    res.end();
    return recipe;

  } catch (error) {
    console.error('Streaming recipe error:', error);
    sendEvent('error', error.message || 'Failed to generate recipe');
    res.end();
    throw error;
  }
};

/**
 * Try to parse partial JSON and extract completed fields
 * This is forgiving of incomplete JSON
 */
const tryParsePartialRecipe = (partialJson) => {
  const result = {};
  
  // Extract name
  const nameMatch = partialJson.match(/"name"\s*:\s*"([^"]+)"/);
  if (nameMatch) result.name = nameMatch[1];
  
  // Extract description
  const descMatch = partialJson.match(/"description"\s*:\s*"([^"]+)"/);
  if (descMatch) result.description = descMatch[1];
  
  // Extract ingredients array (only if complete)
  const ingredientsMatch = partialJson.match(/"ingredients"\s*:\s*\[([\s\S]*?)\]/);
  if (ingredientsMatch) {
    try {
      result.ingredients = JSON.parse(`[${ingredientsMatch[1]}]`);
    } catch (e) { /* incomplete array */ }
  }
  
  // Extract instructions array (only if complete)
  const instructionsMatch = partialJson.match(/"instructions"\s*:\s*\[([\s\S]*?)\]/);
  if (instructionsMatch) {
    try {
      result.instructions = JSON.parse(`[${instructionsMatch[1]}]`);
    } catch (e) { /* incomplete array */ }
  }
  
  // Extract tip
  const tipMatch = partialJson.match(/"tip"\s*:\s*"([^"]+)"/);
  if (tipMatch) result.tip = tipMatch[1];
  
  // Extract health rating
  const healthMatch = partialJson.match(/"healthRating"\s*:\s*(\d+)/);
  if (healthMatch) result.healthRating = parseInt(healthMatch[1]);
  
  // Extract health notes
  const healthNotesMatch = partialJson.match(/"healthNotes"\s*:\s*"([^"]+)"/);
  if (healthNotesMatch) result.healthNotes = healthNotesMatch[1];
  
  return result;
};

module.exports = { 
  generateCocktail, 
  generateCocktailStream
};
