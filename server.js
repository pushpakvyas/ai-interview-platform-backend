import "dotenv/config";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { expireOverdueInterviews } from "./src/services/interviewExpiryService.js";

const PORT = process.env.PORT || 5000;
const EXPIRY_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  expireOverdueInterviews().catch((err) => console.error("⚠️ Interview expiry sweep failed:", err.message));
  setInterval(() => {
    expireOverdueInterviews().catch((err) => console.error("⚠️ Interview expiry sweep failed:", err.message));
  }, EXPIRY_SWEEP_INTERVAL_MS);
}

start();
