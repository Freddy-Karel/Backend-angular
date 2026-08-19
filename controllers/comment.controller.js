const Comment = require('../models/Comment.model');
const Card = require('../models/Card.model');
const List = require('../models/List.model');
const Board = require('../models/Board.model');
const User = require('../models/User.model');

exports.createComment = async (req, res) => {
  try {
    const { cardId, content } = req.body;
    const userId = req.user.id;

    const card = await Card.findByPk(cardId);
    if (!card) return res.status(404).json({ success: false, message: 'Carte non trouvée' });

    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'Accès non autorisé' });

    const comment = await Comment.create({ cardId, userId, content });
    
    // Récupérer le commentaire avec l'utilisateur
    const newComment = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'user' }],
    });

    const io = req.app.get('io');
    io.to(`board-${board.id}`).emit('comment-created', { comment: newComment, cardId });

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    console.error('Erreur createComment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    if (!comment) return res.status(404).json({ success: false, message: 'Commentaire non trouvé' });

    // Vérifier que l'utilisateur est l'auteur du commentaire
    if (comment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez supprimer que vos propres commentaires' });
    }

    const card = await Card.findByPk(comment.cardId);
    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);

    await comment.destroy();

    const io = req.app.get('io');
    io.to(`board-${board.id}`).emit('comment-deleted', { commentId: id, cardId: comment.cardId });

    res.status(200).json({ success: true, message: 'Commentaire supprimé' });
  } catch (error) {
    console.error('Erreur deleteComment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
