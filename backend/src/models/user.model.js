import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    studentId: {
      type: String,
      sparse: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["student", "lecturer", "admin"],
      default: "student",
    },
    faculty: {
      type: String,
      enum: [
        "Engineering",
        "Business",
        "Arts",
        "Science",
        "Health Sciences",
        "Law",
        "Education",
      ],
      required: function () {
        return this.role === "student" || this.role === "lecturer";
      },
    },
    program: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },
    yearOfStudy: {
      type: Number,
      min: 1,
      max: 5,
      required: function () {
        return this.role === "student";
      },
    },
    profileImage: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
