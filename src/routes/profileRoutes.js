const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get detailed user profile by ID
router.get('/user/:userId', authMiddleware, profileController.getUserProfile);

// Get profile stats
router.get('/stats', authMiddleware, profileController.getProfileStats);

// Update profile
router.put('/update', authMiddleware, profileController.updateProfile);

router.put('/completion', authMiddleware, profileController.updateProfileCompletion);


router.post('/logout', authMiddleware, profileController.logout);

module.exports = router;