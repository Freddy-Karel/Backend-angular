const express = require('express');
const router = express.Router();
const cardController = require('../controllers/card.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/list/:listId', cardController.getCards);
router.post('/', cardController.createCard);
router.put('/:id', cardController.updateCard);
router.delete('/:id', cardController.deleteCard);
router.patch('/:id/position', cardController.updateCardPosition);

module.exports = router;
