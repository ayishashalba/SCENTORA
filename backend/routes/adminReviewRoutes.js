const express = require('express');
const router = express.Router();
const adminProtect = require('../middleware/adminProtect'); // admin auth middleware
const {
    getReviews,
    updateReviewStatus,
    deleteReview
} = require('../controllers/adminReviewController');

// All routes protected by admin login
router.use(adminProtect);

router.get('/', getReviews);              // GET all reviews
router.patch('/:id', updateReviewStatus); // PATCH status
router.delete('/:id', deleteReview);      // DELETE review

module.exports = router;
