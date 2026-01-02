const mongoose = require("mongoose");

const getHealth = async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const status = dbStatus === "connected" ? "OK" : "ERROR";

  res.status(status === "OK" ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
};

module.exports = {
  getHealth,
};
