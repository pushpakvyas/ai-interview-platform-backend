import "dotenv/config";
import { createHash } from "crypto";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import TechnologyTemplate from "../src/models/TechnologyTemplate.js";

// The frontend now SHA-256-hashes passwords client-side before they ever
// reach the API (see frontend/src/utils/hash.js), and the backend bcrypt-hashes
// whatever string it receives. Seeded users must go through the same
// transformation or they won't be able to log in via the UI.
function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

async function seed() {
  await connectDB();

  const adminEmail = "admin@example.com";
  const adminPlaintextPassword = "ChangeMe123!";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      firstName: "Super",
      lastName: "Admin",
      email: adminEmail,
      mobile: "9999999999",
      password: sha256Hex(adminPlaintextPassword),
      roleType: "ADMIN",
      profileCompleted: true,
    });
    console.log(`✅ Created admin: ${adminEmail} / ${adminPlaintextPassword}`);
  } else {
    console.log("ℹ️ Admin already exists, skipping.");
  }

  const jsTemplate = await TechnologyTemplate.findOne({ technology: "JavaScript" });
  if (!jsTemplate) {
    await TechnologyTemplate.create({
      technology: "JavaScript",
      defaultSystemPrompt: `You are an expert AI Technical Interviewer conducting a live voice interview for a JavaScript Developer position. Your name is Sara.

INTERVIEW RULES:
- Start by greeting the candidate warmly and asking their name and years of JavaScript experience.
- Ask ONE focused technical question at a time. Wait for their complete answer before asking the next.
- Base each follow-up question on their previous answer.
- Cover topics like: closures, event loop, promises/async-await, prototypes, ES6+ features, DOM manipulation, error handling.
- Keep your questions and responses CONCISE — 2-3 sentences max.
- Be professional but encouraging. Do not give away answers.`,
      questionBank: [
        { question: "Can you explain what a closure is and give an example?", topic: "Closures", difficulty: "MEDIUM" },
        { question: "How does the JavaScript event loop work?", topic: "Event Loop", difficulty: "MEDIUM" },
        { question: "What's the difference between Promises and async/await?", topic: "Async", difficulty: "MEDIUM" },
      ],
      evaluationCriteria: ["Technical Knowledge", "Communication", "Domain Knowledge", "Confidence", "Clarity"],
      promptVersions: [{ version: 1, systemPrompt: "Initial JS prompt" }],
    });
    console.log("✅ Created JavaScript technology template");
  } else {
    console.log("ℹ️ JavaScript template already exists, skipping.");
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
