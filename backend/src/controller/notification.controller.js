import cron from "node-cron";
import Notification from "../models/notification.model.js";

// @desc    Get my notifications
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res) => {
  try {
    const { isRead, page = 1, limit = 50 } = req.query;

    const query = { user: req.user.id };

    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: notifications,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Check authorization
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Check authorization
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to create notification
export const createNotification = async (
  userId,
  type,
  title,
  message,
  relatedId,
  relatedModel,
  scheduledFor
) => {
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      relatedId,
      relatedModel,
      scheduledFor,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

// Schedule lecture reminders (runs every minute)
export const scheduleLectureReminders = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 20 * 60000); // 20 minutes from now

      // This is a simplified version - in production, you'd need more sophisticated scheduling
      console.log("Checking for upcoming lectures...");
    } catch (error) {
      console.error("Error in lecture reminder scheduler:", error);
    }
  });
};
