const express = require('express');
const router = express.Router();
const listController = require('../controllers/list.controller');
const cardController = require('../controllers/card.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/:boardId/lists', authMiddleware, listController.createList);
router.get('/:boardId/lists', authMiddleware, listController.getLists);
router.patch('/:listId', authMiddleware, listController.updateList);
router.delete('/:listId', authMiddleware, listController.deleteList);
router.post('/:listId/cards', authMiddleware, cardController.createCard);

module.exports = router;
