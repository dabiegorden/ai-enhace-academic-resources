import User from "../models/user.model.js";
import ChatRoom from "../models/chatroom.model.js";

const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ─── Notification room ────────────────────────────────────────────────────
    // The frontend calls socket.emit("join", `user-${userId}`) after connecting.
    // Without this handler the socket never enters the room, so
    // io.to(`user-${uid}`).emit("notification:new", …) is sent to nobody.
    socket.on("join", (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined notification room: ${room}`);
    });

    // ─── Chat rooms ───────────────────────────────────────────────────────────
    socket.on("join-room", async (data) => {
      try {
        const { roomId, userId } = data;

        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);

        const user = await User.findById(userId).select(
          "firstName lastName profileImage",
        );

        socket.to(roomId).emit("user-joined", {
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          profileImage: user.profileImage,
        });

        const chatRoom = await ChatRoom.findById(roomId)
          .select("-messages")
          .populate("members", "firstName lastName profileImage");

        socket.emit("room-info", chatRoom);
      } catch (error) {
        console.error("Join room error:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("leave-room", async (data) => {
      try {
        const { roomId, userId } = data;

        socket.leave(roomId);
        console.log(`User ${userId} left room ${roomId}`);

        const user = await User.findById(userId).select("firstName lastName");

        socket.to(roomId).emit("user-left", {
          userId,
          userName: `${user.firstName} ${user.lastName}`,
        });
      } catch (error) {
        console.error("Leave room error:", error);
      }
    });

    socket.on("typing", (data) => {
      const { roomId, userId, userName, isTyping } = data;
      socket.to(roomId).emit("user-typing", { userId, userName, isTyping });
    });

    socket.on("message-reaction", async (data) => {
      const { roomId, messageId, reaction } = data;
      socket.to(roomId).emit("message-reacted", {
        messageId,
        reaction,
        userId: data.userId,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

export { setupSocketHandlers };
