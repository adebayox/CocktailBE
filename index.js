require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const cocktailRoutes = require("./routes/cocktail");
const collectionRoutes = require("./routes/collectionRoutes");

//db connection
connection();

// middlewares
app.use(express.json());
app.use(cors());

//routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cocktail", cocktailRoutes);
app.use("/api", collectionRoutes);

const port = process.env.PORT || 8090;
app.listen(port, () => console.log(`Listening on port ${port}...`));
