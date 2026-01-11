import { getGeminiModel } from "../config/gemini.js";
import LectureNote from "../models/lecturenote.model.js";
import ChatRoom from "../models/chatroom.model.js";

// @desc    Summarize lecture note content
// @route   POST /api/ai/summarize-note/:id
// @access  Private
export const summarizeLectureNote = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);

    if (!lectureNote) {
      return res.status(404).json({
        success: false,
        message: "Lecture note not found",
      });
    }

    // Check if already summarized
    if (lectureNote.aiSummary) {
      return res.status(200).json({
        success: true,
        message: "Summary already exists",
        data: {
          summary: lectureNote.aiSummary,
        },
      });
    }

    const models = getGeminiModel();

    const prompt = `You are an AI assistant helping students understand lecture materials. 
Summarize the following lecture note in a clear, concise manner suitable for students:

Title: ${lectureNote.title}
Course: ${lectureNote.course} (${lectureNote.courseCode})
Description: ${lectureNote.description || "No description provided"}

Please provide:
1. A brief overview (2-3 sentences)
2. Key concepts covered (bullet points)
3. Important points to remember

Keep the summary academic but accessible.`;

    const response = await models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    const summary = response.text;

    // Save summary to database
    lectureNote.aiSummary = summary;
    await lectureNote.save();

    res.status(200).json({
      success: true,
      message: "Lecture note summarized successfully",
      data: {
        summary,
      },
    });
  } catch (error) {
    console.error("AI Summary error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Answer student questions based on lecture content
// @route   POST /api/ai/answer-question
// @access  Private
export const answerStudentQuestion = async (req, res) => {
  try {
    const { question, lectureNoteId, context } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Please provide a question",
      });
    }

    let contextInfo = context || "";

    // If lectureNoteId provided, get lecture note context
    if (lectureNoteId) {
      const lectureNote = await LectureNote.findById(lectureNoteId);
      if (lectureNote) {
        contextInfo = `
Course: ${lectureNote.course} (${lectureNote.courseCode})
Topic: ${lectureNote.title}
Description: ${lectureNote.description || ""}
${lectureNote.aiSummary ? `Summary: ${lectureNote.aiSummary}` : ""}
        `;
      }
    }

    const models = getGeminiModel();

    const prompt = `You are an AI academic assistant for Catholic University of Ghana students. 
Answer the following student question clearly and concisely.

${contextInfo ? `Context:\n${contextInfo}\n` : ""}

Student Question: ${question}

Provide a clear, educational answer that:
1. Directly addresses the question
2. Explains key concepts
3. Uses examples where helpful
4. Encourages further learning

Keep the response academic but friendly and accessible.`;

    const response = await models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    const answer = response.text;

    res.status(200).json({
      success: true,
      data: {
        question,
        answer,
      },
    });
  } catch (error) {
    console.error("AI Answer error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Summarize chat room discussions
// @route   POST /api/ai/summarize-chat/:roomId
// @access  Private
export const summarizeChatDiscussion = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.roomId).populate(
      "messages.user",
      "firstName lastName"
    );

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    if (chatRoom.messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No messages to summarize",
      });
    }

    // Get recent messages (last 50)
    const recentMessages = chatRoom.messages.slice(-50);

    // Format messages for AI
    const messagesText = recentMessages
      .map(
        (msg) => `${msg.user.firstName} ${msg.user.lastName}: ${msg.message}`
      )
      .join("\n");

    const models = getGeminiModel();

    const prompt = `You are summarizing a student discussion in a chat room for ${chatRoom.name}.

Recent Discussion:
${messagesText}

Provide a concise summary that includes:
1. Main topics discussed (bullet points)
2. Key questions raised
3. Important conclusions or consensus reached
4. Any unresolved questions

Keep it brief and focused on academic content.`;

    const response = await models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    const summary = response.text;

    // Save summary to chat room
    chatRoom.aiSummary = summary;
    await chatRoom.save();

    res.status(200).json({
      success: true,
      message: "Chat discussion summarized successfully",
      data: {
        summary,
      },
    });
  } catch (error) {
    console.error("AI Chat Summary error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate exam questions from lecture notes
// @route   POST /api/ai/generate-exam
// @access  Private (Lecturer/Admin)
export const generateExamQuestions = async (req, res) => {
  try {
    const { lectureNoteIds, numberOfQuestions, difficulty, questionTypes } =
      req.body;

    if (!lectureNoteIds || lectureNoteIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide lecture note IDs",
      });
    }

    // Fetch lecture notes
    const lectureNotes = await LectureNote.find({
      _id: { $in: lectureNoteIds },
    });

    if (lectureNotes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No lecture notes found",
      });
    }

    // Prepare context from lecture notes
    const notesContext = lectureNotes
      .map(
        (note) => `
Title: ${note.title}
Course: ${note.course}
Description: ${note.description || ""}
${note.aiSummary ? `Summary: ${note.aiSummary}` : ""}
    `
      )
      .join("\n---\n");

    const models = getGeminiModel();

    const prompt = `You are creating exam questions for university students based on lecture materials.

Lecture Materials:
${notesContext}

Generate ${
      numberOfQuestions || 10
    } exam questions with the following requirements:
- Difficulty Level: ${difficulty || "Medium"}
- Question Types: ${
      questionTypes?.join(", ") || "multiple-choice, true-false, short-answer"
    }

For each question, provide:
1. The question text
2. Question type (multiple-choice, true-false, or short-answer)
3. For multiple-choice: 4 options (A, B, C, D)
4. The correct answer
5. Points value (1-5 based on difficulty)

Format your response as a JSON array of question objects with this structure:
[
  {
    "question": "question text here",
    "type": "multiple-choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "points": 2
  }
]

Ensure questions test understanding, not just memorization.`;

    const response = await models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    let generatedText = response.text;

    // Clean up the response to extract JSON
    generatedText = generatedText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let questions;
    try {
      questions = JSON.parse(generatedText);
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
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
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get AI study suggestions
// @route   POST /api/ai/study-suggestions
// @access  Private (Student)
export const getStudySuggestions = async (req, res) => {
  try {
    const { course, topics, upcomingExam } = req.body;

    const models = getGeminiModel();

    const prompt = `You are an AI study advisor for university students at Catholic University of Ghana.

Student Information:
- Course: ${course || "General"}
- Topics to study: ${topics?.join(", ") || "Various topics"}
- Upcoming Exam: ${upcomingExam ? "Yes" : "No"}

Provide personalized study suggestions including:
1. Study plan (how to organize study time)
2. Key focus areas
3. Study techniques for these topics
4. Time management tips
5. Exam preparation strategies (if exam is upcoming)

Keep advice practical and encouraging.`;

    const response = await models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    const suggestions = response.text;

    res.status(200).json({
      success: true,
      data: {
        suggestions,
      },
    });
  } catch (error) {
    console.error("AI Study Suggestions error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Explain concept in simple terms
// @route   POST /api/ai/explain-concept
// @access  Private
export const explainConcept = async (req, res) => {
  try {
    const { concept, level } = req.body;

    if (!concept) {
      return res.status(400).json({
        success: false,
        message: "Please provide a concept to explain",
      });
    }

    const models = getGeminiModel();

    const prompt = `You are an AI tutor helping students understand academic concepts.

Concept: ${concept}
Student Level: ${level || "Undergraduate"}

Please explain this concept in a way that:
1. Starts with a simple definition
2. Breaks down the key components
3. Provides real-world examples
4. Highlights common misconceptions
5. Suggests how to remember or apply it

Use clear, accessible language while maintaining academic accuracy.`;

    const response = await models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    const explanation = response.text;

    res.status(200).json({
      success: true,
      data: {
        concept,
        explanation,
      },
    });
  } catch (error) {
    console.error("AI Explain Concept error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
