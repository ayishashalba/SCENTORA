import Review from "../models/reviewModel.js";


// ✅ GET ALL REVIEWS (with filters)
export const getAllReviews = async (req, res) => {
  try {
    const { search, rating, status, sort } = req.query;

    let query = {};

    // Search (product or user name)
    if (search) {
      query.$or = [
        { reviewText: { $regex: search, $options: "i" } },
      ];
    }

    if (rating) query.rating = Number(rating);
    if (status) query.status = status;

    let sortOption = { createdAt: -1 }; // default newest

    if (sort === "oldest") sortOption = { createdAt: 1 };

    const reviews = await Review.find(query)
      .populate("user", "name")
      .populate("product", "name images")
      .sort(sortOption);

    res.json({
      success: true,
      data: reviews,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ✅ GET SINGLE REVIEW
export const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("user", "name")
      .populate("product", "name images");

    if (!review) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: review });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ✅ UPDATE STATUS (Approve / Reject)
export const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({ success: true, data: review });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};