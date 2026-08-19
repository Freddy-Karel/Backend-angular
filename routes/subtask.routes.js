const express = require('express');
const router = express.Router();
const subtaskController = require('../controllers/subtask.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/', subtaskController.createSubtask);
router.put('/:id', subtaskController.updateSubtask);
router.delete('/:id', subtaskController.deleteSubtask);

module.exports = router;
