// swaggerOptions.js
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cocktail Recipe Generator",
      version: "1.0.0",
      description: "API Documentation for Cocktail Recipe Generator",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    servers: [
      {
        url: "http://localhost:8090",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

module.exports = options;
