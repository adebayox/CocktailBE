require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const cocktailRoutes = require("./routes/cocktail");
const collectionRoutes = require("./routes/collectionRoutes");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const swaggerOptions = require("./swaggerOptions");

//db connection
connection();

const allowedOrigins = [
  "http://localhost:5173",
  "https://cocktailrecipegen.netlify.app/login",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors()); // Handle preflight requests

// app.use(cors());

// app.use(
//   cors({
//     origin: "https://cocktailrecipay.netlify.app",
//     credentials: true,
//   })
// );

// middlewares
app.use(express.json());

const specs = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

//routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cocktail", cocktailRoutes);
app.use("/api", collectionRoutes);

const port = process.env.PORT || 8090;
app.listen(port, () => console.log(`Listening on port ${port}...`));
