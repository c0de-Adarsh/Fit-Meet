const User = require('../models/User');
const Match = require('../models/Match');

exports.getPotentialMatches = async (req, res) => {
  try {
    const currentUserId = req.userId;
    
   
    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const matches = await User.find({
      _id: { $ne: currentUserId },
      profileCompleted: true,
      isActive: true,
      isBlocked: false,
      gender: currentUser.interestedIn === 'Every one' ? { $exists: true } : currentUser.interestedIn,
      photos: { $exists: true, $not: { $size: 0 } } 
    })
    .select('firstName age gender gymName gymLocation photos interests birthday')
    .limit(20); 

   
    const processedMatches = matches.map(match => {
  
      let calculatedAge = match.age;
      if (match.birthday && !calculatedAge) {
        const birthDate = new Date(match.birthday);
        const today = new Date();
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
      }

      
      let distance = Math.floor(Math.random() * 10) + 1; 
      
      return {
        id: match._id,
        name: match.firstName,
        age: calculatedAge || 25,
        distance: `${distance} km away`,
        gym: match.gymName || 'Gym Training',
        gender: match.gender,
        image: match.photos && match.photos.length > 0 ? match.photos[0].url : null,
        activities: match.interests && match.interests.length > 0 ? match.interests : ['Fitness', 'Gym Training'],
        verified: true 
      };
    });

    res.status(200).json({
      success: true,
      matches: processedMatches
    });
  } catch (error) {
    console.error('Get potential matches error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get potential matches', 
      error: error.message 
    });
  }
};

exports.likeProfile = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { likedUserId } = req.body;

    console.log('Like profile request:', { currentUserId, likedUserId });

    if (!likedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Liked user ID is required'
      });
    }

    // Check if liked user exists
    const likedUser = await User.findById(likedUserId);
    if (!likedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already liked
    const existingLike = await Match.findOne({
      user1: currentUserId,
      user2: likedUserId,
      status: { $in: ['liked', 'matched'] }
    });

    if (existingLike) {
      // Get user details even for existing matches
      const currentUser = await User.findById(currentUserId)
        .select('firstName age photos profileImage');
      
      const matchedUserDetails = await User.findById(likedUserId)
        .select('firstName age photos profileImage');

      return res.status(200).json({
        success: true,
        isMatch: existingLike.status === 'matched',
        message: existingLike.status === 'matched' ? 'Already matched!' : 'Already liked!',
        currentUser: {
          id: currentUser._id,
          name: currentUser.firstName,
          age: currentUser.age,
          profileImage: currentUser.profileImage || (currentUser.photos && currentUser.photos.length > 0 ? currentUser.photos[0].url : null)
        },
        matchedUser: {
          id: matchedUserDetails._id,
          name: matchedUserDetails.firstName,
          age: matchedUserDetails.age,
          profileImage: matchedUserDetails.profileImage || (matchedUserDetails.photos && matchedUserDetails.photos.length > 0 ? matchedUserDetails.photos[0].url : null)
        }
      });
    }

    // Check if the other user has already liked this user (mutual like)
    const mutualLike = await Match.findOne({
      user1: likedUserId,
      user2: currentUserId,
      status: 'liked'
    });

    let isMatch = false;
    let status = 'liked';

    if (mutualLike) {
      // It's a match! Update the mutual like to matched status
      await Match.findByIdAndUpdate(mutualLike._id, {
        status: 'matched',
        matchedAt: new Date()
      });
      
      isMatch = true;
      status = 'matched';
    }

    // Create the like/match record
    await Match.create({
      user1: currentUserId,
      user2: likedUserId,
      status: status,
      likedAt: new Date(),
      matchedAt: isMatch ? new Date() : null
    });

    // Get user details for match response
    const currentUser = await User.findById(currentUserId)
      .select('firstName age photos profileImage');
    
    const matchedUserDetails = await User.findById(likedUserId)
      .select('firstName age photos profileImage');

    console.log('Sending response:', { isMatch, currentUser: currentUser?.firstName, matchedUser: matchedUserDetails?.firstName });

    res.status(200).json({
      success: true,
      isMatch,
      message: isMatch ? 'It\'s a match!' : 'Profile liked successfully',
      currentUser: {
        id: currentUser._id,
        name: currentUser.firstName,
        age: currentUser.age,
        profileImage: currentUser.profileImage || (currentUser.photos && currentUser.photos.length > 0 ? currentUser.photos[0].url : null)
      },
      matchedUser: {
        id: matchedUserDetails._id,
        name: matchedUserDetails.firstName,
        age: matchedUserDetails.age,
        profileImage: matchedUserDetails.profileImage || (matchedUserDetails.photos && matchedUserDetails.photos.length > 0 ? matchedUserDetails.photos[0].url : null)
      }
    });

  } catch (error) {
    console.error('Like profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like profile',
      error: error.message
    });
  }
};

exports.unlikeProfile = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { likedUserId } = req.params;

    console.log('Unlike profile request:', { currentUserId, likedUserId });

    if (!likedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Liked user ID is required'
      });
    }


    const result = await Match.findOneAndDelete({
      user1: currentUserId,
      user2: likedUserId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Like not found'
      });
    }

    console.log('Successfully unliked profile');

    res.status(200).json({
      success: true,
      message: 'Profile unliked successfully'
    });

  } catch (error) {
    console.error('Unlike profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlike profile',
      error: error.message
    });
  }
};

exports.getLikedProfiles = async (req, res) => {
  try {
    const currentUserId = req.userId;
    
    console.log('Get liked profiles request for user:', currentUserId);

    
    const likedMatches = await Match.find({
      user1: currentUserId,
      status: { $in: ['liked', 'matched'] }
    }).populate({
      path: 'user2',
      select: 'firstName age gender photos profileImage birthday',
      match: { isActive: true, isBlocked: false }
    });

    console.log('Found liked matches:', likedMatches.length);

    // Process the liked profiles
    const likedProfiles = likedMatches
      .filter(match => match.user2) // Filter out null populated users
      .map(match => {
        const user = match.user2;
        
        // Calculate age if not present
        let calculatedAge = user.age;
        if (user.birthday && !calculatedAge) {
          const birthDate = new Date(user.birthday);
          const today = new Date();
          calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
        }

        // Generate random time left (for UI purposes)
        const timeLeft = Math.floor(Math.random() * 5) + 1;
        
        return {
          id: user._id,
          name: user.firstName,
          age: calculatedAge || 25,
          timeLeft: `${timeLeft} hrs left`,
          image: user.profileImage || (user.photos && user.photos.length > 0 ? user.photos[0].url : null),
          isVerified: true,
          likedAt: match.likedAt,
          status: match.status
        };
      });

    console.log('Processed liked profiles:', likedProfiles.length);

    res.status(200).json({
      success: true,
      likedProfiles: likedProfiles
    });

  } catch (error) {
    console.error('Get liked profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get liked profiles',
      error: error.message
    });
  }
};