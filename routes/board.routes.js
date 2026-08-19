const express = require('express');
const router = express.Router();
const boardController = require('../controllers/board.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, boardController.createBoard);
router.get('/', authMiddleware, boardController.getBoards);
router.get('/:id', authMiddleware, boardController.getBoardWithLists);
router.patch('/:id', authMiddleware, boardController.updateBoard);
router.delete('/:id', authMiddleware, boardController.deleteBoard);
router.post('/:id/members', authMiddleware, boardController.addMember);
router.delete('/:id/members/:userId', authMiddleware, boardController.removeMember);

module.exports = router;
