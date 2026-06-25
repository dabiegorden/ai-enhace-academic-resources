import { getAIModel } from "../config/github-ai.js";
import LectureNote from "../models/lecturenote.model.js";
import ChatRoom from "../models/chatroom.model.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a compact, anonymised transcript of the last N messages.
 */
const buildTranscript = (messages, limit = 60) => {
  const roleMap = {};
  const roleCounts = {};

  return messages
    .slice(-limit)
    .map((msg) => {
      const uid = msg.user?._id?.toString?.() ?? msg.user?.toString?.();
      if (!uid) return null;

      if (!roleMap[uid]) {
        const role = msg.user?.role ?? "User";
        roleCounts[role] = (roleCounts[role] ?? 0) + 1;
        roleMap[uid] =
          `${role.charAt(0).toUpperCase() + role.slice(1)} ${roleCounts[role]}`;
      }

      const name = roleMap[uid];
      const time = msg.timestamp
        ? new Date(msg.timestamp).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      return `[${time}] ${name}: ${msg.message}`;
    })
    .filter(Boolean)
    .join("\n");
};

/**
 * Strips common Markdown syntax (headings, bold/italic, bullets, code
 * fences, etc.) so AI output renders as clean plain text in the UI.
 */
const stripMarkdown = (text) =>
  text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[ \t]*[-*+]\s+/gm, "• ")
    .replace(/^[ \t]*\d+\.\s+/gm, (m) => m.trimStart())
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/**
 * Builds a concise context block from a LectureNote document for use
 * in AI prompts — avoids repeating the same interpolation everywhere.
 */
const buildNoteContext = (note) =>
  [
    `Title: ${note.title}`,
    `Course: ${note.course} (${note.courseCode})`,
    note.description ? `Description: ${note.description}` : null,
    note.aiSummary ? `Existing Summary: ${note.aiSummary}` : null,
  ]
    .filter(Boolean)
    .join("\n");

// ─── Summarise Lecture Note ────────────────────────────────────────────────────
// @route  POST /api/ai/summarize-note/:id
// @access Private
export const summarizeLectureNote = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);
    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    // Return cached summary immediately
    if (lectureNote.aiSummary) {
      return res.status(200).json({
        success: true,
        message: "Summary already exists",
        data: { summary: lectureNote.aiSummary },
      });
    }

    const model = getAIModel();

    const prompt = `You are an AI assistant helping students understand lecture materials.
Summarise the following lecture note clearly and concisely for students.

${buildNoteContext(lectureNote)}

Structure your response as:
1. A brief overview (2-3 sentences)
2. Key concepts covered
3. Important points to remember

Keep the summary academic but accessible. Respond in plain text only —
do NOT use Markdown formatting (no #, ##, **, *, _, backticks, or
[links](url)). For lists, start each item on its own line with a
simple dash "-" followed by a space.`;

    const result = await model.generateContent(prompt);
    const summary = stripMarkdown(result.response.text());

    lectureNote.aiSummary = summary;
    await lectureNote.save();

    res.status(200).json({
      success: true,
      message: "Lecture note summarised successfully",
      data: { summary },
    });
  } catch (error) {
    console.error("AI Summary error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate summary",
    });
  }
};

// ─── Answer Student Question ──────────────────────────────────────────────────
// @route  POST /api/ai/answer-question
// @access Private
export const answerStudentQuestion = async (req, res) => {
  try {
    const { question, lectureNoteId, context } = req.body;
    if (!question) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide a question" });
    }

    let contextInfo = context || "";
    if (lectureNoteId) {
      const lectureNote = await LectureNote.findById(lectureNoteId);
      if (lectureNote) contextInfo = buildNoteContext(lectureNote);
    }

    const model = getAIModel();

    const prompt = `You are an AI academic assistant for Catholic University of Ghana students.
${contextInfo ? `Context:\n${contextInfo}\n` : ""}
Student Question: ${question}

Answer clearly and educationally, using examples where helpful. Be friendly and encourage further learning.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    res.status(200).json({ success: true, data: { question, answer } });
  } catch (error) {
    console.error("AI Answer error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get answer",
    });
  }
};

// ─── Summarise Chat Discussion ────────────────────────────────────────────────
// @route  POST /api/ai/summarize-chat/:roomId
// @access Private
export const summarizeChatDiscussion = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.roomId).populate(
      "messages.user",
      "firstName lastName role",
    );
    if (!chatRoom) {
      return res
        .status(404)
        .json({ success: false, message: "Chat room not found" });
    }
    if (!chatRoom.messages.length) {
      return res
        .status(400)
        .json({ success: false, message: "No messages to summarise" });
    }

    const transcript = buildTranscript(chatRoom.messages);
    const model = getAIModel();

    const prompt = `Summarise this student discussion from the chat room "${chatRoom.name}".

${transcript}

Include:
1. Main topics discussed
2. Key questions raised
3. Important conclusions or consensus reached
4. Any unresolved questions

Be brief and focus on academic content.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    chatRoom.aiSummary = summary;
    await chatRoom.save();

    res.status(200).json({
      success: true,
      message: "Chat discussion summarised successfully",
      data: { summary },
    });
  } catch (error) {
    console.error("AI Chat Summary error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to summarise chat",
    });
  }
};

// ─── Analyse Chat Room — STREAMING (SSE) ─────────────────────────────────────
// @route  GET /api/ai/chat-analysis/:roomId
// @access Private
export const analyseChatRoom = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.roomId).populate(
      "messages.user",
      "firstName lastName role",
    );

    if (!chatRoom) {
      return res
        .status(404)
        .json({ success: false, message: "Chat room not found" });
    }

    const messages = chatRoom.messages ?? [];
    const totalMessages = messages.length;

    const participantSet = new Set(
      messages.map((m) => m.user?._id?.toString() ?? m.user?.toString()),
    );
    const uniqueParticipants = participantSet.size;

    const avgLength =
      totalMessages > 0
        ? Math.round(
            messages.reduce((s, m) => s + (m.message?.length ?? 0), 0) /
              totalMessages,
          )
        : 0;

    const now = Date.now();
    const DAY = 86_400_000;
    const activityByDay = Array.from({ length: 7 }, (_, i) => {
      const start = now - (6 - i) * DAY;
      const end = start + DAY;
      return messages.filter((m) => {
        const t = new Date(m.timestamp).getTime();
        return t >= start && t < end;
      }).length;
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (totalMessages === 0) {
      res.write(
        `data: ${JSON.stringify({
          type: "metrics",
          payload: {
            totalMessages: 0,
            uniqueParticipants: 0,
            avgLength: 0,
            activityByDay,
            sentiment: "neutral",
            engagementScore: 0,
            topics: [],
          },
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({ type: "text", chunk: "No messages yet in this room." })}\n\n`,
      );
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
      return;
    }

    const transcript = buildTranscript(messages, 80);
    const model = getAIModel();

    const jsonPrompt = `Analyse the following chat room transcript from "${chatRoom.name}" at Catholic University of Ghana.

TRANSCRIPT:
${transcript}

Respond ONLY with a valid JSON object (no markdown, no backticks) with this exact shape:
{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "engagementScore": <integer 0-100>,
  "topics": [<up to 5 short topic strings>],
  "emotionalTone": "<one short phrase, e.g. 'collaborative and curious'>",
  "riskFlags": [<any concerning patterns, empty array if none>]
}`;

    let structured = {
      sentiment: "neutral",
      engagementScore: 50,
      topics: [],
      emotionalTone: "neutral",
      riskFlags: [],
    };

    try {
      const jsonResult = await model.generateContent(jsonPrompt);
      const raw = jsonResult.response
        .text()
        .replace(/```json|```/g, "")
        .trim();
      structured = JSON.parse(raw);
    } catch {
      // Fall back to defaults
    }

    res.write(
      `data: ${JSON.stringify({
        type: "metrics",
        payload: {
          totalMessages,
          uniqueParticipants,
          avgLength,
          activityByDay,
          ...structured,
        },
      })}\n\n`,
    );

    const insightPrompt = `You are an AI academic monitor for Catholic University of Ghana.

You have analysed the chat room "${chatRoom.name}" and produced these findings:
- Sentiment: ${structured.sentiment}
- Engagement Score: ${structured.engagementScore}/100
- Topics: ${structured.topics.join(", ") || "general conversation"}
- Emotional Tone: ${structured.emotionalTone}
- Risk Flags: ${structured.riskFlags.length ? structured.riskFlags.join("; ") : "none"}

Write a concise, warm, 3–5 sentence insight paragraph for the dashboard.
- Describe what the conversation reveals about the students' engagement and understanding.
- Highlight any positive patterns or areas that need attention.
- End with a practical suggestion for the educator or administrator.
- Write in second person ("The students appear…", "You may want to…").
- Do NOT use bullet points or headers. Plain flowing prose only.`;

    const streamResult = await model.generateContentStream(insightPrompt);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ type: "text", chunk: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    console.error("AI Chat Analysis error:", error);
    if (res.headersSent) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
      );
      res.end();
    } else {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to analyse chat",
      });
    }
  }
};

// ─── Generate Exam Questions ──────────────────────────────────────────────────
// @route  POST /api/ai/generate-exam
// @access Private (Lecturer / Admin)
export const generateExamQuestions = async (req, res) => {
  try {
    const { lectureNoteIds, numberOfQuestions, difficulty, questionTypes } =
      req.body;

    if (!lectureNoteIds?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide lecture note IDs" });
    }

    const lectureNotes = await LectureNote.find({
      _id: { $in: lectureNoteIds },
    });
    if (!lectureNotes.length) {
      return res
        .status(404)
        .json({ success: false, message: "No lecture notes found" });
    }

    const notesContext = lectureNotes
      .map((n) => buildNoteContext(n))
      .join("\n---\n");

    const model = getAIModel();

    const prompt = `Generate ${numberOfQuestions || 10} exam questions for university students.

Lecture Materials:
${notesContext}

Requirements:
- Difficulty: ${difficulty || "Medium"}
- Question Types: ${questionTypes?.join(", ") || "multiple-choice, true-false, short-answer"}

Return ONLY a JSON array (no markdown) with this structure:
[{
  "question": "...",
  "type": "multiple-choice" | "true-false" | "short-answer",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "...",
  "points": 1-5
}]`;

    const result = await model.generateContent(prompt);
    let generatedText = result.response
      .text()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let questions;
    try {
      questions = JSON.parse(generatedText);
    } catch {
      return res.status(200).json({
        success: true,
        message: "Exam questions generated (raw format)",
        data: {
          rawQuestions: generatedText,
          lectureNotes: lectureNotes.map((n) => ({
            id: n._id,
            title: n.title,
          })),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam questions generated successfully",
      data: {
        questions,
        lectureNotes: lectureNotes.map((n) => ({ id: n._id, title: n.title })),
      },
    });
  } catch (error) {
    console.error("AI Exam Generation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate exam questions",
    });
  }
};

// ─── Study Suggestions ────────────────────────────────────────────────────────
// @route  POST /api/ai/study-suggestions
// @access Private (Student)
export const getStudySuggestions = async (req, res) => {
  try {
    const { course, topics, upcomingExam } = req.body;
    const model = getAIModel();

    const prompt = `You are an AI study advisor for Catholic University of Ghana students.

Course: ${course || "General"}
Topics: ${topics?.join(", ") || "Various"}
Upcoming Exam: ${upcomingExam ? "Yes" : "No"}

Provide a personalised study plan including: study schedule, key focus areas, techniques, time management tips${upcomingExam ? ", and exam preparation strategies" : ""}. Be practical and encouraging.`;

    const result = await model.generateContent(prompt);
    const suggestions = result.response.text();

    res.status(200).json({ success: true, data: { suggestions } });
  } catch (error) {
    console.error("AI Study Suggestions error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate study suggestions",
    });
  }
};

// ─── Explain Concept ──────────────────────────────────────────────────────────
// @route  POST /api/ai/explain-concept
// @access Private
export const explainConcept = async (req, res) => {
  try {
    const { concept, level } = req.body;
    if (!concept) {
      return res.status(400).json({
        success: false,
        message: "Please provide a concept to explain",
      });
    }

    const model = getAIModel();

    const prompt = `You are an AI tutor at Catholic University of Ghana.

Concept: ${concept}
Student Level: ${level || "Undergraduate"}

Explain this concept starting with a simple definition, breaking down key components, giving real-world examples, flagging common misconceptions, and suggesting how to remember or apply it. Use clear, accessible language.`;

    const result = await model.generateContent(prompt);
    const explanation = result.response.text();

    res.status(200).json({ success: true, data: { concept, explanation } });
  } catch (error) {
    console.error("AI Explain Concept error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to explain concept",
    });
  }
};

// ─── NEW: Generate Quiz from Lecture Note ─────────────────────────────────────
// Generates a self-assessment quiz derived specifically from the content of a
// single lecture note. Results are cached on the document to avoid redundant
// AI calls; pass `force=true` in the request body to regenerate.
//
// @route  POST /api/ai/generate-quiz/:id
// @access Private
export const generateNoteQuiz = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);
    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    const {
      numberOfQuestions = 10,
      difficulty = "mixed",
      questionTypes = ["multiple-choice", "true-false", "short-answer"],
      force = false,
    } = req.body;

    // Return cached quiz unless caller explicitly requests a fresh one
    if (!force && lectureNote.aiQuiz?.questions?.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Quiz loaded from cache",
        data: {
          quiz: lectureNote.aiQuiz,
          noteTitle: lectureNote.title,
          course: lectureNote.course,
          courseCode: lectureNote.courseCode,
        },
      });
    }

    const model = getAIModel();

    const difficultyInstructions = {
      easy: "Focus on basic recall and simple understanding questions suitable for first-time learners.",
      medium:
        "Mix recall, comprehension, and basic application questions appropriate for mid-semester review.",
      hard: "Emphasise analysis, evaluation, and application questions that challenge deep understanding.",
      mixed:
        "Include a balanced mix of easy, medium, and hard questions covering recall through analysis.",
    };

    const prompt = `You are an AI academic quiz generator for Catholic University of Ghana.
Generate a self-assessment quiz for students based on the following lecture note.

LECTURE NOTE DETAILS:
${buildNoteContext(lectureNote)}

QUIZ REQUIREMENTS:
- Number of questions: ${numberOfQuestions}
- Difficulty: ${difficulty} — ${difficultyInstructions[difficulty] || difficultyInstructions.mixed}
- Question types to include: ${questionTypes.join(", ")}
- Each question must have a clear, unambiguous correct answer.
- For multiple-choice, provide exactly 4 options (A–D).
- For true-false, options must be exactly ["True", "False"].
- For short-answer, correctAnswer should be a concise model answer (1–3 sentences).
- Include a brief explanation (1–2 sentences) for each answer to aid learning.
- Assign difficulty per question: "easy", "medium", or "hard".
- Assign points: easy = 1, medium = 2, hard = 3.

Respond ONLY with a valid JSON array (no markdown, no backticks, no preamble):
[
  {
    "question": "<question text>",
    "type": "multiple-choice" | "true-false" | "short-answer",
    "options": ["<A>", "<B>", "<C>", "<D>"],
    "correctAnswer": "<correct option or text>",
    "explanation": "<why this is correct>",
    "difficulty": "easy" | "medium" | "hard",
    "points": 1 | 2 | 3
  }
]`;

    const result = await model.generateContent(prompt);
    const raw = result.response
      .text()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let questions;
    try {
      questions = JSON.parse(raw);
    } catch (parseErr) {
      console.error("Quiz JSON parse error:", parseErr);
      return res.status(500).json({
        success: false,
        message: "AI returned malformed quiz data. Please try again.",
        raw,
      });
    }

    // Validate and sanitise each question before storing
    const validTypes = new Set([
      "multiple-choice",
      "true-false",
      "short-answer",
    ]);
    const validDifficulties = new Set(["easy", "medium", "hard"]);

    const sanitised = questions
      .filter((q) => q.question && validTypes.has(q.type) && q.correctAnswer)
      .map((q) => ({
        question: String(q.question),
        type: q.type,
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctAnswer: String(q.correctAnswer),
        explanation: q.explanation ? String(q.explanation) : "",
        difficulty: validDifficulties.has(q.difficulty)
          ? q.difficulty
          : "medium",
        points: typeof q.points === "number" && q.points > 0 ? q.points : 1,
      }));

    if (sanitised.length === 0) {
      return res.status(500).json({
        success: false,
        message:
          "AI could not generate valid questions for this note. Please try again.",
      });
    }

    // Persist to the note document
    lectureNote.aiQuiz = {
      questions: sanitised,
      generatedAt: new Date(),
      difficulty,
    };
    await lectureNote.save();

    res.status(200).json({
      success: true,
      message: `Quiz generated successfully with ${sanitised.length} questions`,
      data: {
        quiz: lectureNote.aiQuiz,
        noteTitle: lectureNote.title,
        course: lectureNote.course,
        courseCode: lectureNote.courseCode,
      },
    });
  } catch (error) {
    console.error("AI Quiz Generation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate quiz",
    });
  }
};

// ─── NEW: Get Recommendations for Lecture Note ────────────────────────────────
// Returns AI-generated study recommendations, related topics, prerequisites,
// and further reading suggestions for a given lecture note.
// Results are cached; pass `force=true` to regenerate.
//
// @route  POST /api/ai/note-recommendations/:id
// @access Private
export const getNoteRecommendations = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);
    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    const { force = false } = req.body;

    // Return cached recommendations unless regeneration is forced
    if (!force && lectureNote.aiRecommendations?.content) {
      return res.status(200).json({
        success: true,
        message: "Recommendations loaded from cache",
        data: {
          recommendations: lectureNote.aiRecommendations,
          noteTitle: lectureNote.title,
          course: lectureNote.course,
          courseCode: lectureNote.courseCode,
        },
      });
    }

    // Enrich context: pull sibling notes from the same course for cross-linking
    const siblingNotes = await LectureNote.find({
      courseCode: lectureNote.courseCode,
      _id: { $ne: lectureNote._id },
    })
      .select("title description")
      .limit(10)
      .lean();

    const siblingsContext =
      siblingNotes.length > 0
        ? `\nOther notes available in ${lectureNote.courseCode}:\n${siblingNotes
            .map(
              (n, i) =>
                `${i + 1}. ${n.title}${n.description ? ` — ${n.description}` : ""}`,
            )
            .join("\n")}`
        : "";

    const model = getAIModel();

    const prompt = `You are an AI academic advisor for Catholic University of Ghana students.
Analyse the following lecture note and produce personalised study recommendations.

LECTURE NOTE:
${buildNoteContext(lectureNote)}
${siblingsContext}

Generate a comprehensive recommendation package in STRICT JSON (no markdown, no backticks):
{
  "content": "<3–5 sentence plain-prose overview of how to approach studying this material, written warmly and encouragingly>",
  "relatedTopics": [
    "<up to 6 closely related academic topics the student should explore>"
  ],
  "studyTips": [
    "<up to 5 concrete, actionable study tips tailored to this specific material>"
  ],
  "prerequisites": [
    "<up to 4 concepts or topics the student should understand before or alongside this note>"
  ],
  "furtherReading": [
    "<up to 5 suggested textbooks, academic papers, or reputable online resources with brief descriptions>"
  ]
}

Rules:
- All arrays must contain strings, not objects.
- furtherReading items should follow the pattern: "Resource title / author — one-sentence description."
- Keep all text concise and directly relevant to the lecture note content.
- Do NOT invent unrelated topics; ground every suggestion in the note's subject matter.`;

    const result = await model.generateContent(prompt);
    const raw = result.response
      .text()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error("Recommendations JSON parse error:", parseErr);
      return res.status(500).json({
        success: false,
        message: "AI returned malformed recommendations. Please try again.",
        raw,
      });
    }

    // Sanitise the parsed output
    const sanitised = {
      content: typeof parsed.content === "string" ? parsed.content : "",
      relatedTopics: Array.isArray(parsed.relatedTopics)
        ? parsed.relatedTopics.map(String).slice(0, 6)
        : [],
      studyTips: Array.isArray(parsed.studyTips)
        ? parsed.studyTips.map(String).slice(0, 5)
        : [],
      prerequisites: Array.isArray(parsed.prerequisites)
        ? parsed.prerequisites.map(String).slice(0, 4)
        : [],
      furtherReading: Array.isArray(parsed.furtherReading)
        ? parsed.furtherReading.map(String).slice(0, 5)
        : [],
    };

    if (!sanitised.content) {
      return res.status(500).json({
        success: false,
        message:
          "AI could not generate valid recommendations. Please try again.",
      });
    }

    // Persist to the note document
    lectureNote.aiRecommendations = {
      ...sanitised,
      generatedAt: new Date(),
    };
    await lectureNote.save();

    res.status(200).json({
      success: true,
      message: "Recommendations generated successfully",
      data: {
        recommendations: lectureNote.aiRecommendations,
        noteTitle: lectureNote.title,
        course: lectureNote.course,
        courseCode: lectureNote.courseCode,
        siblingNotesFound: siblingNotes.length,
      },
    });
  } catch (error) {
    console.error("AI Recommendations error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate recommendations",
    });
  }
};
