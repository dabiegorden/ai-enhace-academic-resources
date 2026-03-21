import { getGeminiModel } from "../config/gemini.js";
import LectureNote from "../models/lecturenote.model.js";
import ChatRoom from "../models/chatroom.model.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a compact, anonymised transcript of the last N messages.
 * We anonymise by role (Student A, Lecturer B, etc.) so the AI focuses
 * on content, not identity.
 */
const buildTranscript = (messages, limit = 60) => {
  const roleMap = {};
  const roleCounts = {};

  const recent = messages.slice(-limit);

  return recent
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

    if (lectureNote.aiSummary) {
      return res.status(200).json({
        success: true,
        message: "Summary already exists",
        data: { summary: lectureNote.aiSummary },
      });
    }

    const model = getGeminiModel("gemini-3-flash-preview");
    const prompt = `You are an AI assistant helping students understand lecture materials.
Summarise the following lecture note clearly and concisely for students.

Title: ${lectureNote.title}
Course: ${lectureNote.course} (${lectureNote.courseCode})
Description: ${lectureNote.description || "No description provided"}

Provide:
1. A brief overview (2-3 sentences)
2. Key concepts covered (bullet points)
3. Important points to remember

Keep the summary academic but accessible.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

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
      if (lectureNote) {
        contextInfo = `Course: ${lectureNote.course} (${lectureNote.courseCode})
Topic: ${lectureNote.title}
Description: ${lectureNote.description || ""}
${lectureNote.aiSummary ? `Summary: ${lectureNote.aiSummary}` : ""}`;
      }
    }

    const model = getGeminiModel("gemini-3-flash-preview");
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
    const model = getGeminiModel("gemini-3-flash-preview");

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
// Performs sentiment analysis, engagement scoring, topic extraction, and
// a natural-language insight in one shot. Streams the insight text using
// Server-Sent Events so the frontend can render it with a typing effect.
//
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

    // ── Quick metrics (computed server-side, not streamed) ────────────────────
    const totalMessages = messages.length;

    // Unique participants
    const participantSet = new Set(
      messages.map((m) => m.user?._id?.toString() ?? m.user?.toString()),
    );
    const uniqueParticipants = participantSet.size;

    // Message length average (engagement proxy)
    const avgLength =
      totalMessages > 0
        ? Math.round(
            messages.reduce((s, m) => s + (m.message?.length ?? 0), 0) /
              totalMessages,
          )
        : 0;

    // Activity over time — last 7 days
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

    // If there are no messages, skip the AI call and return empty analysis
    if (totalMessages === 0) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      // Send metrics first
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

    // ── Build transcript for AI ───────────────────────────────────────────────
    const transcript = buildTranscript(messages, 80);

    // ── SSE headers ───────────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // ── Step 1: structured JSON analysis (non-streamed internally) ────────────
    const model = getGeminiModel("gemini-3-flash-preview");

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
      // Fall back to defaults if parsing fails
    }

    // Send metrics + structured data as first SSE event
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

    // ── Step 2: Natural-language insight (streamed) ───────────────────────────
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
    // Try to send error over SSE if headers already sent, otherwise normal JSON
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
// @access Private (Lecturer/Admin)
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
      .map(
        (n) =>
          `Title: ${n.title}\nCourse: ${n.course}\nDescription: ${n.description || ""}\n${n.aiSummary ? `Summary: ${n.aiSummary}` : ""}`,
      )
      .join("\n---\n");

    const model = getGeminiModel("gemini-3-flash-preview");

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
    const model = getGeminiModel("gemini-3-flash-preview");

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

    const model = getGeminiModel("gemini-3-flash-preview");

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
