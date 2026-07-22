const express = require('express');
const attemptController = require('../controllers/attemptController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const getGroqEvaluation = async ({ topic, answer, participants }) => {
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Groq API key is missing');
  }

  const prompt = participants?.length
    ? `Topic: ${topic}\n\n${participants.map((text, index) => `Person ${index + 1}: ${text || 'No response'}`).join('\n')}`
    : `Topic: ${topic}\nAnswer: ${answer}`;

  const systemMessage = participants?.length
    ? 'Evaluate each participant separately. Return a clear response with one section per participant using the format: Person 1\nScore: X/10\nStrengths: ...\nImprovement: ...\n\nPerson 2\nScore: X/10\nStrengths: ...\nImprovement: ...'
    : 'You are a speech evaluator. Give feedback + score out of 100. Keep it concise and easy to read.';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Groq evaluation failed');
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || 'No response';
};

// All routes require authentication
router.use(protect);

router.post('/create', attemptController.createAttempt);
router.post('/single', async (req, res, next) => {
  try {
    const aiResponse = await getGroqEvaluation({ topic: req.body.topic, answer: req.body.answer });
    req.body.attemptType = 'single';
    req.body.score = req.body.score ?? 0;
    req.body.totalQuestions = req.body.totalQuestions ?? 1;
    req.body.correctAnswers = req.body.correctAnswers ?? 1;
    req.body.timeSpent = req.body.timeSpent ?? 0;
    req.body.feedback = req.body.feedback || aiResponse;
    req.body.aiResponse = aiResponse;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Evaluation failed' });
  }
}, attemptController.createAttempt);

router.post('/group', async (req, res, next) => {
  try {
    const aiResponse = await getGroqEvaluation({ topic: req.body.topic, participants: req.body.participants });
    req.body.attemptType = 'group';
    req.body.score = req.body.score ?? 0;
    req.body.totalQuestions = req.body.totalQuestions ?? 1;
    req.body.correctAnswers = req.body.correctAnswers ?? 1;
    req.body.timeSpent = req.body.timeSpent ?? 0;
    req.body.feedback = req.body.feedback || aiResponse;
    req.body.aiResponse = aiResponse;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Evaluation failed' });
  }
}, attemptController.createAttempt);

router.get('/user/:userId', attemptController.getUserAttempts);
router.get('/stats/:userId', attemptController.getUserStats);
router.get('/:attemptId', attemptController.getAttemptById);
router.delete('/:attemptId', attemptController.deleteAttempt);

module.exports = router;
