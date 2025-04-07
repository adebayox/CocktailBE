const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

exports.authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    console.log("Token being verified:", token);
    console.log("Secret key exists:", !!process.env.JWTPRIVATEKEY);
    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
    console.log("Decoded token:", decoded);

    req.user = await User.findById(decoded._id);
    next();
  } catch (error) {
    console.log("Token verification error:", error);
    res.status(400).json({ message: "Invalid token." });
  }
};
