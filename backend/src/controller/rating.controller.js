import Rating from "../models/rating.model.js";

// @desc    Create rating
// @route   POST /api/ratings
// @access  Private (Student)
export const createRating = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can submit ratings",
      });
    }

    const {
      type,
      course,
      courseCode,
      lecturer,
      rating,
      comment,
      aspects,
      isAnonymous,
      academicYear,
      semester,
    } = req.body;

    if (!type || !rating || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate type-specific fields
    if (type === "course" && (!course || !courseCode)) {
      return res.status(400).json({
        success: false,
        message: "Course and course code are required for course ratings",
      });
    }

    if (type === "lecturer" && !lecturer) {
      return res.status(400).json({
        success: false,
        message: "Lecturer is required for lecturer ratings",
      });
    }

    const ratingData = {
      student: req.user.id,
      type,
      rating,
      comment,
      aspects,
      isAnonymous: isAnonymous !== undefined ? isAnonymous : true,
      academicYear,
      semester,
    };

    if (type === "course") {
      ratingData.course = course;
      ratingData.courseCode = courseCode;
    } else {
      ratingData.lecturer = lecturer;
    }

    const newRating = await Rating.create(ratingData);

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      data: newRating,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "You have already rated this course/lecturer for this semester",
      });
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get ratings
// @route   GET /api/ratings
// @access  Private
export const getRatings = async (req, res) => {
  try {
    const {
      type,
      course,
      lecturer,
      academicYear,
      semester,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (course) query.course = course;
    if (lecturer) query.lecturer = lecturer;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const ratings = await Rating.find(query)
      .populate("lecturer", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    // Hide student info for anonymous ratings
    const sanitizedRatings = ratings.map((r) => {
      const rating = r.toObject();
      if (rating.isAnonymous) {
        delete rating.student;
      }
      return rating;
    });

    const total = await Rating.countDocuments(query);

    res.status(200).json({
      success: true,
      count: sanitizedRatings.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: sanitizedRatings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get average ratings
// @route   GET /api/ratings/average
// @access  Private
export const getAverageRatings = async (req, res) => {
  try {
    const { type, course, lecturer } = req.query;

    const query = {};
    if (type) query.type = type;
    if (course) query.course = course;
    if (lecturer) query.lecturer = lecturer;

    const ratings = await Rating.find(query);

    if (ratings.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          averageRating: 0,
          totalRatings: 0,
          aspects: {},
        },
      });
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    // Calculate aspect averages
    const aspectTotals = {
      contentQuality: 0,
      teachingMethod: 0,
      availability: 0,
      fairness: 0,
    };
    const aspectCounts = {
      contentQuality: 0,
      teachingMethod: 0,
      availability: 0,
      fairness: 0,
    };

    ratings.forEach((r) => {
      if (r.aspects) {
        Object.keys(aspectTotals).forEach((key) => {
          if (r.aspects[key]) {
            aspectTotals[key] += r.aspects[key];
            aspectCounts[key]++;
          }
        });
      }
    });

    const aspectAverages = {};
    Object.keys(aspectTotals).forEach((key) => {
      aspectAverages[key] =
        aspectCounts[key] > 0
          ? (aspectTotals[key] / aspectCounts[key]).toFixed(2)
          : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        averageRating: averageRating.toFixed(2),
        totalRatings: ratings.length,
        aspects: aspectAverages,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
