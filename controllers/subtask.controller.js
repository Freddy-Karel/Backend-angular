const Subtask = require('../models/Subtask.model');
const Card = require('../models/Card.model');
const List = require('../models/List.model');
const Board = require('../models/Board.model');

exports.createSubtask = async (req, res) => {
  try {
    const { cardId, title } = req.body;
    const userId = req.user.id;

    const card = await Card.findByPk(cardId);
    if (!card) return res.status(404).json({ success: false, message: 'Carte non trouvée' });

    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'Accès non autorisé' });

    const subtask = await Subtask.create({ cardId, title });
    
    const io = req.app.get('io');
    io.to(`board-${board.id}`).emit('subtask-created', { subtask, cardId });

    res.status(201).json({ success: true, data: subtask });
  } catch (error) {
    console.error('Erreur createSubtask:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const { isCompleted, title } = req.body;
    const userId = req.user.id;

    const subtask = await Subtask.findByPk(id);
    if (!subtask) return res.status(404).json({ success: false, message: 'Sous-tâche non trouvée' });

    const card = await Card.findByPk(subtask.cardId);
    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'Accès non autorisé' });

    await subtask.update({ isCompleted, title });

    const io = req.app.get('io');
    io.to(`board-${board.id}`).emit('subtask-updated', { subtask });

    res.status(200).json({ success: true, data: subtask });
  } catch (error) {
    console.error('Erreur updateSubtask:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const subtask = await Subtask.findByPk(id);
    if (!subtask) return res.status(404).json({ success: false, message: 'Sous-tâche non trouvée' });

    const card = await Card.findByPk(subtask.cardId);
    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'Accès non autorisé' });

    await subtask.destroy();

    const io = req.app.get('io');
    io.to(`board-${board.id}`).emit('subtask-deleted', { subtaskId: id });

    res.status(200).json({ success: true, message: 'Sous-tâche supprimée' });
  } catch (error) {
    console.error('Erreur deleteSubtask:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
