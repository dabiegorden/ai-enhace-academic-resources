import User from "../models/User.model.js";
import ChatRoom from "../models/chatroom.model.js";

const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join chat room
    socket.on("join-room", async (data) => {
      try {
        const { roomId, userId } = data;

        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);

        // Get user info
        const user = await User.findById(userId).select(
          "firstName lastName profileImage"
        );

        // Broadcast to room
        socket.to(roomId).emit("user-joined", {
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          profileImage: user.profileImage,
        });

        // Send room info to user
        const chatRoom = await ChatRoom.findById(roomId)
          .select("-messages")
          .populate("members", "firstName lastName profileImage");

        socket.emit("room-info", chatRoom);
      } catch (error) {
        console.error("Join room error:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Leave chat room
    socket.on("leave-room", async (data) => {
      try {
        const { roomId, userId } = data;

        socket.leave(roomId);
        console.log(`User ${userId} left room ${roomId}`);

        const user = await User.findById(userId).select("firstName lastName");

        // Broadcast to room
        socket.to(roomId).emit("user-left", {
          userId,
          userName: `${user.firstName} ${user.lastName}`,
        });
      } catch (error) {
        console.error("Leave room error:", error);
      }
    });

    // Typing indicator
    socket.on("typing", (data) => {
      const { roomId, userId, userName, isTyping } = data;
      socket.to(roomId).emit("user-typing", {
        userId,
        userName,
        isTyping,
      });
    });

    // Message reactions (future feature)
    socket.on("message-reaction", async (data) => {
      const { roomId, messageId, reaction } = data;
      socket.to(roomId).emit("message-reacted", {
        messageId,
        reaction,
        userId: data.userId,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

export { setupSocketHandlers };
