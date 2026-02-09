const User = require('../models/User');

// Get detailed user profile by ID
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-__v -phoneNumber -countryCode -termsAccepted -termsAcceptedAt -idDocument -gymMembershipDocument -currentStep -isActive -isBlocked -createdAt -updatedAt');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Format the response with all profile details
    const profileData = {
      id: user._id,
      name: user.firstName || user.name,
      firstName: user.firstName,
      age: user.age,
      birthday: user.birthday,
      gender: user.gender,
      interestedIn: user.interestedIn,
      lookingFor: user.lookingFor,
      ageRange: user.ageRange,
      bio: user.bio,
      interests: user.interests || [],
      photos: user.photos || [], // Return full photos array
      gymName: user.gymName,
      gymLocation: user.gymLocation,
      isPhoneVerified: user.isPhoneVerified,
      profileCompleted: user.profileCompleted,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      // Computed fields for backward compatibility
      verified: user.isPhoneVerified && user.idDocument && user.gymMembershipDocument,
      image: user.photos && user.photos.length > 0 ? user.photos[0].url : null,
      activities: user.interests || [],
      distance: user.gymLocation ? `${Math.floor(Math.random() * 10) + 1} km away` : 'Distance not available',
      gym: user.gymName || 'Gym not specified'
    };

    res.status(200).json({
      success: true,
      user: profileData,
      message: 'User profile retrieved successfully'
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user profile', 
      error: error.message 
    });
  }
};


exports.getProfileStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const totalFields = 11; 
    let completedFields = 0;

    if (user.gymName) completedFields++;
    if (user.firstName) completedFields++;
    if (user.birthday) completedFields++;
    if (user.gender) completedFields++;
    if (user.interestedIn) completedFields++;
    if (user.lookingFor) completedFields++;
    if (user.ageRange) completedFields++;
    if (user.interests && user.interests.length > 0) completedFields++;
    if (user.bio) completedFields++;
    if (user.photos && user.photos.length > 0) completedFields++;
    if (user.idDocument && user.gymMembershipDocument) completedFields++;

    const profileCompletionPercentage = Math.round((completedFields / totalFields) * 100);

 
    const profileStats = {
      user: {
        id: user._id,
        firstName: user.firstName || 'User',
        age: user.age || 24,
        profileImage: user.photos && user.photos.length > 0 ? user.photos[0].url : null,
        isVerified: user.isPhoneVerified && user.idDocument && user.gymMembershipDocument,
      },
      profileCompletion: {
        percentage: profileCompletionPercentage,
        isCompleted: user.profileCompleted,
      },
      subscription: {
        type: 'Free',
        features: [
          {
            name: 'See whos like you',
            freeAccess: true,
            premiumAccess: true,
          },
          {
            name: 'Top picks',
            freeAccess: true,
            premiumAccess: true,
          },
        ],
      },
      stats: {
        superLikes: 0, 
        profileViews: 0, 
        matches: 0, 
      },
    };

    res.status(200).json({
      success: true,
      data: profileStats,
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get profile stats', 
      error: error.message 
    });
  }
};


exports.updateProfileCompletion = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

  
    const isComplete = user.gymName && 
                      user.firstName && 
                      user.birthday && 
                      user.gender && 
                      user.interestedIn && 
                      user.lookingFor && 
                      user.ageRange && 
                      user.interests && 
                      user.interests.length > 0 && 
                      user.bio && 
                      user.photos && 
                      user.photos.length > 0 && 
                      user.idDocument && 
                      user.gymMembershipDocument;

    user.profileCompleted = isComplete;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile completion status updated',
      profileCompleted: user.profileCompleted,
    });
  } catch (error) {
    console.error('Update profile completion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile completion', 
      error: error.message 
    });
  }
};


exports.logout = async (req, res) => {
  try {
 
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to logout', 
      error: error.message 
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;

    // Fields that can be updated
    const allowedUpdates = [
      'firstName',
      'birthday',
      'age',
      'gender',
      'interestedIn',
      'lookingFor',
      'ageRange',
      'interests',
      'bio',
      'gymName',
      'gymLocation'
    ];

    // Filter only allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-__v -phoneNumber -countryCode -termsAccepted -termsAcceptedAt -idDocument -gymMembershipDocument');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check profile completion
    const isComplete = user.gymName && 
                      user.firstName && 
                      user.birthday && 
                      user.gender && 
                      user.interestedIn && 
                      user.lookingFor && 
                      user.ageRange && 
                      user.interests && 
                      user.interests.length > 0 && 
                      user.bio && 
                      user.photos && 
                      user.photos.length > 0;

    user.profileCompleted = isComplete;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        age: user.age,
        birthday: user.birthday,
        gender: user.gender,
        interestedIn: user.interestedIn,
        lookingFor: user.lookingFor,
        ageRange: user.ageRange,
        interests: user.interests,
        bio: user.bio,
        gymName: user.gymName,
        gymLocation: user.gymLocation,
        photos: user.photos,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};