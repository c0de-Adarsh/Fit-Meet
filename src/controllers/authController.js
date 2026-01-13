const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET 
const JWT_EXPIRES_IN = '30d';


const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};


exports.sendOTP = async (req, res) => {
  try {
    console.log('=== SEND OTP BACKEND DEBUG ===');
    const { phoneNumber, countryCode, isSignIn = false } = req.body;
    console.log('Request body:', { phoneNumber, countryCode, isSignIn });

    if (!phoneNumber) {
      console.log('ERROR: Phone number missing');
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }

    if (!countryCode) {
      console.log('ERROR: Country code missing');
      return res.status(400).json({ 
        success: false, 
        message: 'Country code is required' 
      });
    }

    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    console.log('Normalized phone:', normalizedPhone);
    
    let user = await User.findOne({ phoneNumber: normalizedPhone });
    console.log('User lookup result:', user ? 'Found' : 'Not found');
    
    if (user) {
      console.log('User details:', {
        id: user._id,
        currentStep: user.currentStep,
        profileCompleted: user.profileCompleted,
        isPhoneVerified: user.isPhoneVerified
      });
    }

    // For Sign In - user must exist
    if (isSignIn && !user) {
      console.log('ERROR: SignIn attempted but user not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Account not found. Please sign up first.' 
      });
    }

    // For Sign In - user must have completed profile
    if (isSignIn && user && !user.profileCompleted) {
      const getStepDescription = (step) => {
        switch (step) {
          case 0: return 'gym selection';
          case 1: return 'terms acceptance';
          case 2: return 'document upload';
          case 3:
          case 4: return 'basic profile information';
          default: return 'profile setup';
        }
      };

      const getNextScreen = (step) => {
        if (step >= 4) return 'FirstName';
        if (step >= 3) return 'UploadDocuments';
        if (step >= 2) return 'TermsScreen';
        if (step >= 1) return 'SelectGym';
        return 'SelectGym';
      };

      const progressPercent = Math.round((user.currentStep / 11) * 100);
      const stepDescription = getStepDescription(user.currentStep);
      const nextScreen = getNextScreen(user.currentStep);

      console.log('SignIn with incomplete profile:', {
        progressPercent,
        stepDescription,
        nextScreen,
        currentStep: user.currentStep
      });

      return res.status(400).json({ 
        success: false, 
        message: `Your profile is ${progressPercent}% complete. Please complete your ${stepDescription} to continue.`,
        requiresRegistration: true,
        userId: user._id,
        currentStep: user.currentStep,
        progressPercent,
        stepDescription,
        nextScreen
      });
    }

    // For Sign Up - check if user already exists with completed profile
    if (!isSignIn && user && user.profileCompleted) {
      console.log('ERROR: SignUp attempted but user already exists with completed profile');
      return res.status(400).json({ 
        success: false, 
        message: 'Account already exists with this phone number. Please sign in instead.',
        accountExists: true
      });
    }

    // For Sign Up - if user exists but profile not completed, allow to continue
    if (!isSignIn && user && !user.profileCompleted) {
      console.log(`Continuing registration for existing user: ${normalizedPhone}`);
      console.log(`OTP for ${countryCode}-${normalizedPhone}: 0000 (bypassed)`);
      
      return res.status(200).json({
        success: true,
        message: 'Continue your registration',
        userId: user._id,
        otp: '0000',
        continueRegistration: true,
        currentStep: user.currentStep
      });
    }

    // For Sign Up - create new user only if doesn't exist
    if (!isSignIn && !user) {
      console.log(`Creating new user: ${normalizedPhone}`);
      user = new User({
        phoneNumber: normalizedPhone,
        countryCode,
        currentStep: 0,
        profileCompleted: false,
        isPhoneVerified: false,
      });
      await user.save();
      console.log(`New user created: ${normalizedPhone}`);
    }

    console.log(`OTP for ${countryCode}-${normalizedPhone}: 0000 (bypassed)`);

    const responseData = {
      success: true,
      message: 'OTP sent successfully',
      userId: user._id,
      otp: '0000',
      isNewUser: !user.profileCompleted,
      currentStep: user.currentStep
    };

    console.log('=== SEND OTP SUCCESS RESPONSE ===');
    console.log('Response:', JSON.stringify(responseData, null, 2));

    res.status(200).json(responseData);
  } catch (error) {
    console.error('=== SEND OTP ERROR ===');
    console.error('Error details:', error);
    
    // Handle duplicate key error
    if (error.code === 11000 && error.keyPattern?.phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number already registered. Please sign in instead.',
        accountExists: true
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP', 
      error: error.message 
    });
  }
};


exports.verifyOTP = async (req, res) => {
  try {
    console.log('=== VERIFY OTP BACKEND DEBUG ===');
    const { phoneNumber, otp } = req.body;
    console.log('Request body:', { phoneNumber, otp });

    if (!phoneNumber || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and OTP are required' 
      });
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    console.log('Normalized phone:', normalizedPhone);

    // Find user by phone number
    const user = await User.findOne({ phoneNumber: normalizedPhone });
    console.log('User found:', user ? 'Yes' : 'No');
    console.log('User details:', {
      id: user?._id,
      currentStep: user?.currentStep,
      profileCompleted: user?.profileCompleted
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Verify OTP (using 0000 for testing)
    if (otp !== '0000') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Use 0000 for testing' 
      });
    }

    // Mark phone as verified
    user.isPhoneVerified = true;
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Determine next step based on profile completion
    let nextScreen = 'SelectGym'; // Default for new users
    let stepDescription = '';
    let progressPercent = 0;
    
    console.log('=== DETERMINING NEXT SCREEN ===');
    console.log('Profile completed:', user.profileCompleted);
    console.log('Current step:', user.currentStep);
    
    if (user.profileCompleted) {
      nextScreen = 'Home'; // Completed users go to home
      progressPercent = 100;
      stepDescription = 'Profile completed';
      console.log('User has completed profile - going to Home');
    } else {
      progressPercent = Math.round((user.currentStep / 11) * 100);
      
      // Determine where to continue based on currentStep
      if (user.currentStep >= 11) {
        nextScreen = 'Home';
        stepDescription = 'Profile completed';
      } else if (user.currentStep >= 4) {
        nextScreen = 'FirstName';
        stepDescription = 'Complete your profile information';
      } else if (user.currentStep >= 3) {
        nextScreen = 'UploadDocuments';
        stepDescription = 'Upload your documents';
      } else if (user.currentStep >= 2) {
        nextScreen = 'TermsScreen';
        stepDescription = 'Accept terms and conditions';
      } else if (user.currentStep >= 1) {
        nextScreen = 'SelectGym';
        stepDescription = 'Select your gym';
      } else {
        nextScreen = 'SelectGym';
        stepDescription = 'Start with gym selection';
      }
      
      console.log('User needs to complete registration:');
      console.log('- Next screen:', nextScreen);
      console.log('- Progress:', progressPercent + '%');
      console.log('- Description:', stepDescription);
    }

    const responseData = {
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        currentStep: user.currentStep,
        profileCompleted: user.profileCompleted,
        firstName: user.firstName,
        gymName: user.gymName,
        termsAccepted: user.termsAccepted,
      },
      nextScreen,
      requiresRegistration: !user.profileCompleted,
      progressPercent,
      stepDescription
    };

    console.log('=== SENDING RESPONSE ===');
    console.log('Response data:', JSON.stringify(responseData, null, 2));

    res.status(200).json(responseData);
  } catch (error) {
    console.error('=== VERIFY OTP BACKEND ERROR ===');
    console.error('Error details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP', 
      error: error.message 
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get profile', 
      error: error.message 
    });
  }
};
