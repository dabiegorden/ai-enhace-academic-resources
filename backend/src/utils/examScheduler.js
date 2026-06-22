import cron from "node-cron";
import Exam from "../models/exam.model.js";

// Run every minute to check for expired exams
export const startExamScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      console.log("[v0] Checking for expired exams...");

      // Find all active exams.
      //
      // Exams now use PER-STUDENT timing (each student gets durationInMinutes
      // from when they personally start), so we no longer auto-close an exam
      // just because durationInMinutes has elapsed since the lecturer started
      // it — that was the cause of the "exam expired" bug for students who
      // joined later. The exam stays open until the lecturer ends it, OR until
      // an explicit global endedAt (if one was set) is reached.
      const activeExams = await Exam.find({
        status: "active",
        endedAt: { $ne: null, $exists: true },
      });

      for (const exam of activeExams) {
        if (!exam.endedAt) continue;

        const endTime = new Date(exam.endedAt).getTime();
        const now = Date.now();

        // If current time has passed the global end time, end the exam
        if (now >= endTime) {
          console.log(
            `[v0] Auto-ending expired exam: ${exam.title} (${exam._id})`,
          );

          exam.status = "ended";
          exam.endedAt = new Date();
          await exam.save();

          console.log(`[v0] Exam ended successfully: ${exam.title}`);
        }
      }
    } catch (error) {
      console.error("[v0] Error in exam scheduler:", error);
    }
  });

  console.log("[v0] Exam scheduler started - checking every minute");
};
