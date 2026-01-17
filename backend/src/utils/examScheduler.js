import cron from "node-cron";
import Exam from "../models/exam.model.js";

// Run every minute to check for expired exams
export const startExamScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      console.log("[v0] Checking for expired exams...");

      // Find all active exams
      const activeExams = await Exam.find({ status: "active" });

      for (const exam of activeExams) {
        if (!exam.startedAt) continue;

        const startTime = new Date(exam.startedAt).getTime();
        const durationInMs = exam.durationInMinutes * 60 * 1000;
        const endTime = startTime + durationInMs;
        const now = Date.now();

        // If current time has passed the end time, end the exam
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
