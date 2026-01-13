const User = require('../models/User');
const cloudinary = require('../config/cloudinary');


exports.updateGymSelection = async (req, res) => {
  try {
    console.log('=== UPDATE GYM SELECTION ===');
    const { gymName, gymLocation } = req.body;
    console.log('Gym data:', { gymName, gymLocation });

    if (!gymName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym name is required' 
      });
    }

    const currentUser = await User.findById(req.userId);
    console.log('Current user step before update:', currentUser.currentStep);

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        gymName,
        gymLocation,
        currentStep: Math.max(1, currentUser.currentStep || 0), // Move to step 1 after gym selection
      },
      { new: true }
    );

    console.log('Updated user step:', user.currentStep);
    console.log('Gym selection completed, user should proceed to TermsScreen');

    res.status(200).json({
      success: true,
      message: 'Gym selection updated successfully',
      user,
      nextStep: 'TermsScreen'
    });
  } catch (error) {
    console.error('Update gym error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update gym selection', 
      error: error.message 
    });
  }
};


exports.acceptTerms = async (req, res) => {
  try {
    
    const { termsAccepted } = req.body;
    console.log('Terms accepted:', termsAccepted);

    if (!termsAccepted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Terms must be accepted' 
      });
    }

    const currentUser = await User.findById(req.userId);
    console.log('Current user step before update:', currentUser.currentStep);

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        currentStep: Math.max(2, currentUser.currentStep || 0), // Move to step 2 after terms
      },
      { new: true }
    );

    console.log('Updated user step:', user.currentStep);
    console.log('Terms accepted, user should proceed to UploadDocuments');

    res.status(200).json({
      success: true,
      message: 'Terms accepted successfully',
      user,
      nextStep: 'UploadDocuments'
    });
  } catch (error) {
    console.error('Accept terms error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to accept terms', 
      error: error.message 
    });
  }
};


exports.uploadDocuments = async (req, res) => {
  try {
    console.log('=== UPLOAD DOCUMENTS ===');
    const { idDocumentUrl, idDocumentPublicId, gymDocumentUrl, gymDocumentPublicId } = req.body;
    console.log('Document data:', { idDocumentUrl: !!idDocumentUrl, gymDocumentUrl: !!gymDocumentUrl });
    console.log('User ID:', req.userId);

    if (!idDocumentUrl || !gymDocumentUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both ID and gym membership documents are required' 
      });
    }

    const currentUser = await User.findById(req.userId);
    console.log('Current user step before update:', currentUser.currentStep);
    console.log('Current user data:', {
      id: currentUser._id,
      phoneNumber: currentUser.phoneNumber,
      gymName: currentUser.gymName,
      termsAccepted: currentUser.termsAccepted,
      hasIdDocument: !!currentUser.idDocument?.url,
      hasGymDocument: !!currentUser.gymMembershipDocument?.url
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        idDocument: {
          url: idDocumentUrl,
          publicId: idDocumentPublicId,
          uploadedAt: new Date(),
        },
        gymMembershipDocument: {
          url: gymDocumentUrl,
          publicId: gymDocumentPublicId,
          uploadedAt: new Date(),
        },
        currentStep: Math.max(4, currentUser.currentStep || 0), // Move to step 4 after documents (ready for profile)
      },
      { new: true }
    );

    console.log('Updated user step:', user.currentStep);
    console.log('Documents uploaded, user should proceed to FirstName (profile steps)');
    console.log('Updated user data:', {
      id: user._id,
      currentStep: user.currentStep,
      hasIdDocument: !!user.idDocument?.url,
      hasGymDocument: !!user.gymMembershipDocument?.url
    });

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      user,
      nextStep: 'FirstName'
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload documents', 
      error: error.message 
    });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    console.log('=== UPDATE PROFILE ===');
    const {
      firstName,
      birthday,
      age,
      gender,
      interestedIn,
      lookingFor,
      ageRange,
      interests,
      bio,
      photos,
      currentStep,
    } = req.body;

    console.log('Profile update data:', {
      firstName: !!firstName,
      birthday: !!birthday,
      gender: !!gender,
      currentStep
    });

    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (birthday !== undefined) updateData.birthday = birthday;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (interestedIn !== undefined) updateData.interestedIn = interestedIn;
    if (lookingFor !== undefined) updateData.lookingFor = lookingFor;
    if (ageRange !== undefined) updateData.ageRange = ageRange;
    if (interests !== undefined) updateData.interests = interests;
    if (bio !== undefined) updateData.bio = bio;
    if (photos !== undefined) updateData.photos = photos;

    // Get current user to check existing data
    const currentUser = await User.findById(req.userId);
    console.log('Current user step before profile update:', currentUser.currentStep);
    
    // Increment step based on what's being updated
    let newStep = currentUser.currentStep || 4;
    if (currentStep !== undefined) {
      newStep = Math.max(currentStep, currentUser.currentStep || 4);
    } else {
      // Auto-increment based on profile completion
      if (firstName && !currentUser.firstName) newStep = Math.max(newStep, 4);
      if (birthday && !currentUser.birthday) newStep = Math.max(newStep, 5);
      if (gender && !currentUser.gender) newStep = Math.max(newStep, 6);
      if (interestedIn && !currentUser.interestedIn) newStep = Math.max(newStep, 7);
      if (lookingFor && !currentUser.lookingFor) newStep = Math.max(newStep, 8);
      if (ageRange && !currentUser.ageRange) newStep = Math.max(newStep, 9);
      if (interests && interests.length > 0 && (!currentUser.interests || currentUser.interests.length === 0)) newStep = Math.max(newStep, 10);
      if (bio && !currentUser.bio) newStep = Math.max(newStep, 11);
      if (photos && photos.length > 0 && (!currentUser.photos || currentUser.photos.length === 0)) newStep = Math.max(newStep, 11);
    }
    
    updateData.currentStep = newStep;
    console.log('New step will be:', newStep);
    
    // Check if profile should be marked as completed
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    );

    // Check profile completion after update
    const isProfileComplete = (
      updatedUser.gymName &&
      updatedUser.termsAccepted &&
      updatedUser.idDocument?.url &&
      updatedUser.gymMembershipDocument?.url &&
      updatedUser.firstName &&
      updatedUser.birthday &&
      updatedUser.gender &&
      updatedUser.interestedIn &&
      updatedUser.lookingFor &&
      updatedUser.ageRange &&
      updatedUser.interests?.length > 0 &&
      updatedUser.bio &&
      updatedUser.photos?.length > 0
    );

    if (isProfileComplete && !updatedUser.profileCompleted) {
      updatedUser.profileCompleted = true;
      updatedUser.currentStep = 11;
      await updatedUser.save();
      
      console.log(`Profile completed for user: ${updatedUser.phoneNumber}`);
    }

    console.log('Profile update completed, new step:', updatedUser.currentStep);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
      profileCompleted: updatedUser.profileCompleted
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


exports.completeRegistration = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

   
    const missingFields = [];
    if (!user.gymName) missingFields.push('gymName');
    if (!user.termsAccepted) missingFields.push('termsAccepted');
    if (!user.idDocument?.url) missingFields.push('idDocument');
    if (!user.gymMembershipDocument?.url) missingFields.push('gymMembershipDocument');
    if (!user.firstName) missingFields.push('firstName');
    if (!user.birthday) missingFields.push('birthday');
    if (!user.gender) missingFields.push('gender');
    if (!user.interestedIn) missingFields.push('interestedIn');
    if (!user.lookingFor) missingFields.push('lookingFor');
    if (!user.ageRange) missingFields.push('ageRange');
    if (!user.interests || user.interests.length === 0) missingFields.push('interests');
    if (!user.bio) missingFields.push('bio');
    if (!user.photos || user.photos.length === 0) missingFields.push('photos');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile incomplete', 
        missingFields 
      });
    }

    user.profileCompleted = true;
    user.currentStep = 11;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Registration completed successfully',
      user,
    });
  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to complete registration', 
      error: error.message 
    });
  }
};
