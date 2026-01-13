const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const authMiddleware = require('../middlewares/authMiddleware');


router.use(authMiddleware);


router.post('/gym-selection', registrationController.updateGymSelection);


router.post('/accept-terms', registrationController.acceptTerms);


router.post('/upload-documents', registrationController.uploadDocuments);


router.post('/update-profile', registrationController.updateProfile);


router.post('/complete', registrationController.completeRegistration);

module.exports = router;
