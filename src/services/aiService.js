import { ChatGroq } from "@langchain/groq";

// Initialize Groq model (use env var for flexibility)
const groq = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,        // ← Change from OPENAI_API_KEY
  model: process.env.CHAT_MODEL || "llama-3.3-70b-versatile", // or "llama-3.1-70b-versatile", "mixtral-8x7b-32768", etc.
  temperature: 0.7,
  maxTokens: 400,          // equivalent to max_tokens
  maxRetries: 2,
});

// Separate instance for transcript evaluation (lower temperature, longer output)
const groqEvaluator = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.CHAT_MODEL || "llama-3.3-70b-versatile",
  temperature: 0.3,
  maxTokens: 800,
  maxRetries: 2,
});

/**
 * Generate the next interviewer message (greeting, follow-up question, etc.)
 * history: [{ role: 'user' | 'model', text }]
 */
export async function getNextInterviewerMessage({
  systemPrompt,
  history = [],
  candidateMessage,
  isStart = false,
  minutesLeft = 30,
  difficulty = "Medium",
  candidateName,
  candidateExperience,
}) {
  const candidateContext = candidateName
    ? `\nCandidate name: ${candidateName}.\nCandidate experience: ${candidateExperience ?? 0} years.\nThis information was already collected at registration — do NOT ask the candidate for their name or years of experience. Greet them by name if this is the start of the interview, and use their stated experience level to calibrate question difficulty.`
    : "";

  const normalizedDifficulty = ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium";

  const DIFFICULTY_GUIDANCE = {
    Easy: "Ask fundamental, entry-level questions. Focus on core definitions, basic syntax, and everyday usage. Avoid edge cases, internals, system design, or trick questions. Keep questions approachable and confidence-building for a beginner.",
    Medium: "Ask intermediate questions that go beyond definitions into applied reasoning: how and why something works, common pitfalls, and practical trade-offs. Assume solid working knowledge but do not require deep internals or large-scale system design.",
    Hard: "Ask advanced, expert-level questions: internals, performance/scalability trade-offs, architecture and system design, debugging subtle edge cases, and 'why would you choose X over Y' style reasoning. Push follow-ups that probe depth, not just recall.",
  };

  // Difficulty is stated as its own governing directive at the very top of
  // the prompt (and reiterated below) so the model treats it as a hard
  // constraint rather than a trailing detail it can drift from over a long
  // conversation.
  const fullSystemPrompt = `DIFFICULTY LEVEL: ${normalizedDifficulty.toUpperCase()}
${DIFFICULTY_GUIDANCE[normalizedDifficulty]}
Every question you ask for the rest of this interview MUST match the ${normalizedDifficulty} difficulty level described above, regardless of anything the base instructions below say about difficulty.

${systemPrompt}
${candidateContext}

Time remaining: approximately ${minutesLeft} minutes.
Reminder: difficulty level for every question is ${normalizedDifficulty}.
Only mention time or wrap up when minutesLeft is below 5.
Respond in plain conversational text only. Do NOT use markdown formatting (no asterisks, no bullet points, no headings).`;

  const messages = [{ role: "system", content: fullSystemPrompt }];

  history.forEach((h) => {
    messages.push({
      role: h.role === "user" ? "user" : "assistant",
      content: h.text,
    });
  });

  if (!isStart && candidateMessage) {
    messages.push({ role: "user", content: candidateMessage });
  }

  const response = await groq.invoke(messages);
  return response.content?.trim() || "Could you please repeat that?";
}

/**
 * Evaluate a full interview transcript and produce structured scores.
 */
export async function evaluateInterviewTranscript({ textTranscript, technology, evaluationCriteria }) {
  if (!textTranscript || textTranscript.length < 30) {
    return {
      technicalKnowledge: 0,
      communication: 0,
      domainKnowledge: 0,
      confidence: 0,
      clarity: 0,
      overallScore: 0,
      strengths: [],
      weaknesses: [],
      improvementSuggestions: [],
      hiringRecommendation: "Reject",
      aiFeedback: "Not enough conversation data to evaluate.",
    };
  }

  const candidateLines = (textTranscript.match(/^Candidate:\s*(.*)$/gim) || [])
  .map((l) => l.replace(/^Candidate:\s*/i, "").trim())
  .filter((l) => l.length > 3 && !/^(i\s*don'?t\s*know|no idea|pass|skip|n\/?a)\.?$/i.test(l));

if (candidateLines.length === 0) {
  return {
    technicalKnowledge: 0,
    communication: 0,
    domainKnowledge: 0,
    confidence: 0,
    clarity: 0,
    overallScore: 0,
    strengths: [],
    weaknesses: ["No substantive answers were provided during the interview."],
    improvementSuggestions: ["Attend the interview prepared to answer the interviewer's questions."],
    hiringRecommendation: "Reject",
    aiFeedback: "The candidate did not provide any substantive answers during this interview, so no positive evaluation could be made.",
  };
}

  const scoringPrompt = `Analyze this ${technology} developer interview transcript. Evaluate against: ${evaluationCriteria.join(", ")}.
  Scoring rules — follow these strictly:
- Score ONLY what the CANDIDATE actually said. Never give credit for a question just because the interviewer asked it well.
- If a question went unanswered, was answered with a non-answer ("I don't know", silence, an unrelated remark), score that topic as 0 for technicalKnowledge/domainKnowledge — do not round up or give benefit of the doubt.
- If the candidate skipped or failed to answer most of the questions, technicalKnowledge, domainKnowledge and overallScore must all be low (below 20), and hiringRecommendation must be "Reject", regardless of how confident or polished the small amount of speech is.
- Base communication/confidence/clarity strictly on how the candidate actually communicated, not on assumptions.

Return ONLY raw JSON (no markdown, no code fences, no extra text) matching exactly this shape:

{
  "technicalKnowledge": number (0-100),
  "communication": number (0-100),
  "domainKnowledge": number (0-100),
  "confidence": number (0-100),
  "clarity": number (0-100),
  "strengths": [string, ...],
  "weaknesses": [string, ...],
  "improvementSuggestions": [string, ...],
  "hiringRecommendation": "Strong Hire" | "Hire" | "Borderline" | "Reject",
  "aiFeedback": "3-4 sentence summary"
}

Transcript:
${textTranscript}`;

  const response = await groqEvaluator.invoke([
    { role: "system", content: "You are a strict but fair senior technical interviewer evaluator. Output only valid JSON." },
    { role: "user", content: scoringPrompt },
  ]);

  const raw = response.content?.trim() || "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw;

  try {
    const parsed = JSON.parse(jsonStr);
    const subScores = [
      parsed.technicalKnowledge,
      parsed.communication,
      parsed.domainKnowledge,
      parsed.confidence,
      parsed.clarity,
    ].map((n) => (Number.isFinite(n) ? n : 0));
    parsed.overallScore = Math.round(subScores.reduce((sum, n) => sum + n, 0) / subScores.length);
    return parsed;
  } catch (err) {
    console.error("⚠️ Failed to parse AI evaluation JSON:", err.message);
    return {
      technicalKnowledge: 50,
      communication: 50,
      domainKnowledge: 50,
      confidence: 50,
      clarity: 50,
      overallScore: 50,
      strengths: [],
      weaknesses: [],
      improvementSuggestions: [],
      hiringRecommendation: "Borderline",
      aiFeedback: "Automated scoring failed; manual review recommended.",
    };
  }
}