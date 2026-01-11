import ChatRoom from "../models/chatroom.model.js";

// @desc    Create chat room
// @route   POST /api/chat/rooms
// @access  Private
export const createChatRoom = async (req, res) => {
  try {
    const { name, description, type, course, faculty, program } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Please provide room name and type",
      });
    }

    // Validate type-specific fields
    if (type === "course" && !course) {
      return res.status(400).json({
        success: false,
        message: "Course is required for course-type rooms",
      });
    }

    if ((type === "faculty" || type === "program") && !faculty) {
      return res.status(400).json({
        success: false,
        message: "Faculty is required",
      });
    }

    if (type === "program" && !program) {
      return res.status(400).json({
        success: false,
        message: "Program is required for program-type rooms",
      });
    }

    const chatRoom = await ChatRoom.create({
      name,
      description,
      type,
      course,
      faculty,
      program,
      createdBy: req.user.id,
      members: [req.user.id],
    });

    await chatRoom.populate("createdBy", "firstName lastName email role");

    res.status(201).json({
      success: true,
      message: "Chat room created successfully",
      data: chatRoom,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all chat rooms
// @route   GET /api/chat/rooms
// @access  Private
export const getAllChatRooms = async (req, res) => {
  try {
    const { type, faculty, program, course, search } = req.query;

    const query = {};

    if (type) query.type = type;
    if (faculty) query.faculty = faculty;
    if (program) query.program = program;
    if (course) query.course = { $regex: course, $options: "i" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const chatRooms = await ChatRoom.find(query)
      .populate("createdBy", "firstName lastName email")
      .select("-messages")
      .sort({ lastActivity: -1 });

    res.status(200).json({
      success: true,
      count: chatRooms.length,
      data: chatRooms,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get my chat rooms
// @route   GET /api/chat/my-rooms
// @access  Private
export const getMyChatRooms = async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({ members: req.user.id })
      .populate("createdBy", "firstName lastName email")
      .select("-messages")
      .sort({ lastActivity: -1 });

    res.status(200).json({
      success: true,
      count: chatRooms.length,
      data: chatRooms,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get chat room by ID with messages
// @route   GET /api/chat/rooms/:id
// @access  Private
export const getChatRoomById = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const chatRoom = await ChatRoom.findById(req.params.id)
      .populate("createdBy", "firstName lastName email role")
      .populate("members", "firstName lastName email role profileImage");

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Get paginated messages
    const messages = chatRoom.messages
      .slice(
        -Number.parseInt(limit) - Number.parseInt(skip),
        chatRoom.messages.length - Number.parseInt(skip)
      )
      .reverse();

    // Populate message users
    const populatedMessages = await ChatRoom.populate(messages, {
      path: "user",
      select: "firstName lastName email profileImage",
    });

    const roomData = {
      _id: chatRoom._id,
      name: chatRoom.name,
      description: chatRoom.description,
      type: chatRoom.type,
      course: chatRoom.course,
      faculty: chatRoom.faculty,
      program: chatRoom.program,
      createdBy: chatRoom.createdBy,
      members: chatRoom.members,
      aiSummary: chatRoom.aiSummary,
      lastActivity: chatRoom.lastActivity,
      createdAt: chatRoom.createdAt,
      messages: populatedMessages,
      totalMessages: chatRoom.messages.length,
    };

    res.status(200).json({
      success: true,
      data: roomData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Join chat room
// @route   POST /api/chat/rooms/:id/join
// @access  Private
export const joinChatRoom = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Check if already a member
    if (chatRoom.members.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this room",
      });
    }

    chatRoom.members.push(req.user.id);
    await chatRoom.save();

    // Emit socket event
    const io = req.app.get("io");
    io.to(req.params.id).emit("user-joined", {
      userId: req.user.id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
    });

    res.status(200).json({
      success: true,
      message: "Joined chat room successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Leave chat room
// @route   POST /api/chat/rooms/:id/leave
// @access  Private
export const leaveChatRoom = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Remove user from members
    chatRoom.members = chatRoom.members.filter(
      (memberId) => memberId.toString() !== req.user.id
    );
    await chatRoom.save();

    // Emit socket event
    const io = req.app.get("io");
    io.to(req.params.id).emit("user-left", {
      userId: req.user.id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
    });

    res.status(200).json({
      success: true,
      message: "Left chat room successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send message to chat room
// @route   POST /api/chat/rooms/:id/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Check if user is a member
    if (!chatRoom.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You must join the room to send messages",
      });
    }

    // Add message
    const newMessage = {
      user: req.user.id,
      message: message.trim(),
      timestamp: new Date(),
    };

    chatRoom.messages.push(newMessage);
    chatRoom.lastActivity = new Date();
    await chatRoom.save();

    // Populate user info for the response
    const populatedMessage = {
      ...newMessage,
      user: {
        _id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        profileImage: req.user.profileImage,
      },
    };

    // Emit socket event
    const io = req.app.get("io");
    io.to(req.params.id).emit("new-message", populatedMessage);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update chat room
// @route   PUT /api/chat/rooms/:id
// @access  Private (Creator/Admin)
export const updateChatRoom = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Check if user is creator or admin
    if (
      chatRoom.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this chat room",
      });
    }

    const { name, description } = req.body;

    if (name) chatRoom.name = name;
    if (description) chatRoom.description = description;

    await chatRoom.save();

    res.status(200).json({
      success: true,
      message: "Chat room updated successfully",
      data: chatRoom,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete chat room
// @route   DELETE /api/chat/rooms/:id
// @access  Private (Creator/Admin)
export const deleteChatRoom = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Check if user is creator or admin
    if (
      chatRoom.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this chat room",
      });
    }

    await chatRoom.deleteOne();

    // Emit socket event
    const io = req.app.get("io");
    io.to(req.params.id).emit("room-deleted", {
      roomId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Chat room deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get chat room statistics
// @route   GET /api/chat/stats
// @access  Private (Admin)
export const getChatRoomStats = async (req, res) => {
  try {
    const totalRooms = await ChatRoom.countDocuments();

    const roomsByType = await ChatRoom.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const mostActiveRooms = await ChatRoom.find()
      .select("name type lastActivity members")
      .sort({ lastActivity: -1 })
      .limit(10)
      .populate("createdBy", "firstName lastName");

    const totalMessages = await ChatRoom.aggregate([
      {
        $project: {
          messageCount: { $size: "$messages" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$messageCount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRooms,
        roomsByType,
        mostActiveRooms,
        totalMessages: totalMessages[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
