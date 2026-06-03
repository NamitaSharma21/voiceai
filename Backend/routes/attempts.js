const express = require('express');
const attemptController = require('../controllers/attemptController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Attempt routes
router.post('/create', attemptController.createAttempt);
router.get('/user/:userId', attemptController.getUserAttempts);
router.get('/stats/:userId', attemptController.getUserStats);
router.get('/:attemptId', attemptController.getAttemptById);
router.delete('/:attemptId', attemptController.deleteAttempt);

module.exports = router;
