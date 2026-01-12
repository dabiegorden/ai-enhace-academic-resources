import User from "../models/user.model.js";
import LectureNote from "../models/lecturenote.model.js";
import ChatRoom from "../models/chatroom.model.js";
import Assignment from "../models/assignment.model.js";
import Exam from "../models/exam.model.js";
import Announcement from "../models/announcement.model.js";
import Rating from "../models/rating.model.js";
import Vote from "../models/voting.model.js";

// Get comprehensive stats for admin dashboard
export const getAdminStats = async (_, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const studentCount = await User.countDocuments({ role: "student" });
    const lecturerCount = await User.countDocuments({ role: "lecturer" });
    const adminCount = await User.countDocuments({ role: "admin" });
    const activeUsers = await User.countDocuments({ isActive: true });

    // Academic content statistics
    const totalNotes = await LectureNote.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalExams = await Exam.countDocuments();
    const totalAnnouncements = await Announcement.countDocuments();

    // Community statistics
    const totalChatRooms = await ChatRoom.countDocuments();
    const totalMessages = await ChatRoom.aggregate([
      {
        $group: { _id: null, totalMessages: { $sum: { $size: "$messages" } } },
      },
    ]);

    // Rating and feedback statistics
    const totalRatings = await Rating.countDocuments();
    const avgCourseRating = await Rating.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$overallRating" } } },
    ]);
    const avgLecturerRating = await Rating.aggregate([
      { $match: { type: "lecturer" } },
      { $group: { _id: null, avgRating: { $avg: "$overallRating" } } },
    ]);

    // Voting statistics
    const totalVotes = await Vote.countDocuments();
    const srcVotes = await Vote.countDocuments({ category: "SRC" });
    const facultyVotes = await Vote.countDocuments({ category: "faculty" });

    // Faculty distribution
    const facultyStats = await User.aggregate([
      { $match: { role: { $in: ["student", "lecturer"] } } },
      { $group: { _id: "$faculty", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Program distribution
    const programStats = await User.aggregate([
      { $match: { role: "student", program: { $exists: true } } },
      { $group: { _id: "$program", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Year of study distribution
    const yearStats = await User.aggregate([
      { $match: { role: "student", yearOfStudy: { $exists: true } } },
      { $group: { _id: "$yearOfStudy", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Recent activities
    const recentNotes = await LectureNote.find();
    const recentUsers = await User.find()
      .select("firstName lastName email role createdAt")
      .sort({ createdAt: -1 })
      .limit(5);
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          students: studentCount,
          lecturers: lecturerCount,
          admins: adminCount,
          active: activeUsers,
        },
        academic: {
          notes: totalNotes,
          assignments: totalAssignments,
          exams: totalExams,
          announcements: totalAnnouncements,
        },
        community: {
          chatRooms: totalChatRooms,
          messages: totalMessages[0]?.totalMessages || 0,
        },
        ratings: {
          total: totalRatings,
          avgCourseRating: avgCourseRating[0]?.avgRating || 0,
          avgLecturerRating: avgLecturerRating[0]?.avgRating || 0,
        },
        votes: {
          total: totalVotes,
          srcVotes,
          facultyVotes,
        },
        distributions: {
          faculty: facultyStats,
          program: programStats,
          year: yearStats,
        },
        recent: {
          users: recentUsers,
          notes: recentNotes,
          assignments: recentAssignments,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching stats",
      error: error.message,
    });
  }
};

// Get lecturer specific stats
export const getLecturerStats = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const notesCount = await LectureNote.countDocuments({
      uploadedBy: userObjectId,
    });
    const assignmentsCount = await Assignment.countDocuments({
      createdBy: userObjectId,
    });
    const examsCount = await Exam.countDocuments({ createdBy: userObjectId });

    const avgRating = await Rating.aggregate([
      { $match: { lecturerId: userObjectId } },
      { $group: { _id: null, avgRating: { $avg: "$overallRating" } } },
    ]);

    res.json({
      success: true,
      data: {
        notesCount,
        assignmentsCount,
        examsCount,
        avgRating: avgRating[0]?.avgRating || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching lecturer stats",
      error: error.message,
    });
  }
};

// Get student specific stats
export const getStudentStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const submittedAssignments = await Assignment.countDocuments({
      "submissions.studentId": userId,
    });

    const completedExams = await Exam.countDocuments({
      "submissions.studentId": userId,
    });

    const chatRoomsJoined = await ChatRoom.countDocuments({
      members: userId,
    });

    res.json({
      success: true,
      data: {
        submittedAssignments,
        completedExams,
        chatRoomsJoined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching student stats",
      error: error.message,
    });
  }
};
