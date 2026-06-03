const Attempt = require('../models/Attempt');
const User = require('../models/User');

// @route   POST /api/attempts/create
// @desc    Create a new attempt
// @access  Private
exports.createAttempt = async (req, res) => {
  try {
    const {
      attemptType,
      score,
      totalQuestions,
      correctAnswers,
      timeSpent,
      audioFile,
      questions,
      groupMembers,
      feedback
    } = req.body;

    // Validation
    if (!attemptType || score === undefined || !totalQuestions) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newAttempt = new Attempt({
      userId: req.userId,
      attemptType,
      score,
      totalQuestions,
      correctAnswers,
      timeSpent,
      audioFile,
      questions: questions || [],
      groupMembers: groupMembers || [],
      feedback,
      status: 'completed'
    });

    await newAttempt.save();

    // Update user statistics
    await User.findByIdAndUpdate(
      req.userId,
      {
        $inc: { totalAttempts: 1 },
        $set: { 
          averageScore: (await calculateAverageScore(req.userId))
        }
      }
    );

    res.status(201).json({
      success: true,
      message: 'Attempt recorded successfully',
      attempt: newAttempt
    });
  } catch (error) {
    console.error('Create attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/attempts/user/:userId
// @desc    Get all attempts for a user
// @access  Private
exports.getUserAttempts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, page = 1, type } = req.query;

    const query = { userId };
    if (type) query.attemptType = type;

    const skip = (page - 1) * limit;

    const attempts = await Attempt.find(query)
      .populate('userId', 'name email')
      .populate('groupMembers', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attempt.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      attempts
    });
  } catch (error) {
    console.error('Get user attempts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/attempts/:attemptId
// @desc    Get single attempt details
// @access  Private
exports.getAttemptById = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId)
      .populate('userId', 'name email')
      .populate('groupMembers', 'name email');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check authorization
    if (attempt.userId._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.status(200).json({
      success: true,
      attempt
    });
  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/attempts/stats/:userId
// @desc    Get user statistics
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('totalAttempts averageScore');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const attempts = await Attempt.find({ userId });
    
    const singleModeAttempts = attempts.filter(a => a.attemptType === 'single');
    const groupModeAttempts = attempts.filter(a => a.attemptType === 'group');

    const avgSingleScore = singleModeAttempts.length
      ? singleModeAttempts.reduce((sum, a) => sum + a.score, 0) / singleModeAttempts.length
      : 0;

    const avgGroupScore = groupModeAttempts.length
      ? groupModeAttempts.reduce((sum, a) => sum + a.score, 0) / groupModeAttempts.length
      : 0;

    const totalTimeSpent = attempts.reduce((sum, a) => sum + a.timeSpent, 0);

    res.status(200).json({
      success: true,
      stats: {
        totalAttempts: user.totalAttempts,
        averageScore: user.averageScore,
        singleModeCount: singleModeAttempts.length,
        groupModeCount: groupModeAttempts.length,
        avgSingleScore: Math.round(avgSingleScore * 100) / 100,
        avgGroupScore: Math.round(avgGroupScore * 100) / 100,
        totalTimeSpent: Math.round(totalTimeSpent / 60), // in minutes
        lastAttemptDate: attempts[0]?.createdAt || null
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   DELETE /api/attempts/:attemptId
// @desc    Delete an attempt
// @access  Private
exports.deleteAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check authorization
    if (attempt.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Attempt.findByIdAndDelete(attemptId);

    // Update user statistics
    await User.findByIdAndUpdate(
      req.userId,
      {
        $inc: { totalAttempts: -1 },
        $set: { 
          averageScore: (await calculateAverageScore(req.userId))
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Attempt deleted successfully'
    });
  } catch (error) {
    console.error('Delete attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate average score
const calculateAverageScore = async (userId) => {
  const attempts = await Attempt.find({ userId, status: 'completed' });
  if (attempts.length === 0) return 0;
  
  const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
  return Math.round((totalScore / attempts.length) * 100) / 100;
};
