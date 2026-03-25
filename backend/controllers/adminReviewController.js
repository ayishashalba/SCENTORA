const AdminReview = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');

// GET all reviews (with optional filters)
exports.getReviews = async (req, res) => {
    try {
        const { status, rating, search } = req.query;
        let filter = {};

        if (status) filter.status = status;
        if (rating) filter.rating = Number(rating);
        if (search) {
            const users = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id');
            const products = await Product.find({ name: { $regex: search, $options: 'i' } }).select('_id');
            filter.$or = [
                { user: { $in: users } },
                { product: { $in: products } }
            ];
        }

        const reviews = await AdminReview.find(filter)
            .populate('user', 'name email')
            .populate('product', 'name images')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: reviews });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// UPDATE review status (Approve/Reject)
exports.updateReviewStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const review = await AdminReview.findByIdAndUpdate(id, { status }, { new: true });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.json({ success: true, data: review });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// DELETE review
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await AdminReview.findByIdAndDelete(id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
