const User = require('../models/User');


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