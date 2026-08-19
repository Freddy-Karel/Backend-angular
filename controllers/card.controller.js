const Card = require('../models/Card.model');
const List = require('../models/List.model');
const Board = require('../models/Board.model');
const Subtask = require('../models/Subtask.model');
const Comment = require('../models/Comment.model');
const User = require('../models/User.model');
const BoardMember = require('../models/BoardMember.model');
const sequelize = require('../config/db.config');
const { Op } = require('sequelize');

// Créer une carte
exports.createCard = async (req, res) => {
  try {
    const { title, description, listId: bodyListId, dueDate, assigneeId } = req.body;
    const { listId: paramListId } = req.params;
    const listId = paramListId || bodyListId;
    const userId = req.user.id;

    if (!listId) {
      return res.status(400).json({ success: false, message: 'List ID est requis' });
    }

    // Vérifier que la liste existe et que l'utilisateur a accès au board
    const list = await List.findByPk(listId);
    if (!list) {
      return res.status(404).json({ success: false, message: 'Liste non trouvée' });
    }

    const board = await Board.findByPk(list.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    if (assigneeId) {
      const assigneeMembership = await BoardMember.findOne({ where: { boardId: board.id, userId: assigneeId } });
      if (!assigneeMembership) {
        return res.status(400).json({ success: false, message: 'Le responsable doit etre membre du tableau' });
      }
    }

    // Calculer la position
    const maxPosition = await Card.max('position', { where: { listId } });
    const position = (maxPosition || 0) + 1;

    const card = await Card.create({
      title,
      description,
      dueDate: dueDate || null,
      assigneeId: assigneeId || null,
      listId,
      position,
    });

    // Récupérer la carte avec ses relations
    const newCard = await Card.findByPk(card.id, {
      include: [
        { model: User, as: 'assignee' },
        { model: Subtask, as: 'subtasks' },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user' }] },
      ],
    });

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    io.to(`board-${list.boardId}`).emit('card-created', {
      card: newCard,
      listId: listId,
      boardId: list.boardId,
    });

    res.status(201).json({ success: true, data: newCard });
  } catch (error) {
    console.error('Erreur createCard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupérer les cartes d'une liste
exports.getCards = async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.id;

    const list = await List.findByPk(listId);
    if (!list) {
      return res.status(404).json({ success: false, message: 'Liste non trouvée' });
    }

    const board = await Board.findByPk(list.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const cards = await Card.findAll({
      where: { listId },
      order: [['position', 'ASC']],
      include: [
        { model: User, as: 'assignee' },
        { model: Subtask, as: 'subtasks' },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user' }] },
      ],
    });

    res.status(200).json({ success: true, data: cards });
  } catch (error) {
    console.error('Erreur getCards:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mettre à jour une carte
exports.updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const card = await Card.findByPk(id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Carte non trouvée' });
    }

    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    if (updates.assigneeId) {
      const assigneeMembership = await BoardMember.findOne({ where: { boardId: board.id, userId: updates.assigneeId } });
      if (!assigneeMembership) {
        return res.status(400).json({ success: false, message: 'Le responsable doit etre membre du tableau' });
      }
    }

    await card.update(updates);

    // Récupérer la carte mise à jour
    const updatedCard = await Card.findByPk(id, {
      include: [
        { model: User, as: 'assignee' },
        { model: Subtask, as: 'subtasks' },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user' }] },
      ],
    });

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    io.to(`board-${board.id}`).emit('card-updated', {
      card: updatedCard,
      boardId: board.id,
    });

    res.status(200).json({ success: true, data: updatedCard });
  } catch (error) {
    console.error('Erreur updateCard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprimer une carte
exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const card = await Card.findByPk(id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Carte non trouvée' });
    }

    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    await card.destroy();

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    io.to(`board-${board.id}`).emit('card-deleted', {
      cardId: id,
      boardId: board.id,
      listId: card.listId,
    });

    res.status(200).json({ success: true, message: 'Carte supprimée avec succès' });
  } catch (error) {
    console.error('Erreur deleteCard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mettre à jour la position d'une carte (Drag & Drop)
exports.updateCardPosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { listId, position } = req.body;
    const userId = req.user.id;

    const card = await Card.findByPk(id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Carte non trouvée' });
    }

    const currentList = await List.findByPk(card.listId);
    const board = await Board.findByPk(currentList.boardId);
    const isMember = await board.hasMember(userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    // Si la carte change de liste
    if (listId && listId !== card.listId) {
      // Réorganiser les positions dans la nouvelle liste
      await Card.update(
        { position: sequelize.literal('position + 1') },
        { where: { listId: listId, position: { [Op.gte]: position } } }
      );
      // Réorganiser les positions dans l'ancienne liste
      await Card.update(
        { position: sequelize.literal('position - 1') },
        { where: { listId: card.listId, position: { [Op.gt]: card.position } } }
      );
      await card.update({ listId: listId, position });
    } else if (position !== undefined) {
      // Même liste, déplacement
      if (position > card.position) {
        await Card.update(
          { position: sequelize.literal('position - 1') },
          { where: { listId: card.listId, position: { [Op.between]: [card.position + 1, position] } } }
        );
      } else if (position < card.position) {
        await Card.update(
          { position: sequelize.literal('position + 1') },
          { where: { listId: card.listId, position: { [Op.between]: [position, card.position - 1] } } }
        );
      }
      await card.update({ position });
    }

    // Récupérer la carte mise à jour
    const updatedCard = await Card.findByPk(id, {
      include: [
        { model: User, as: 'assignee' },
        { model: Subtask, as: 'subtasks' },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user' }] },
      ],
    });

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    io.to(`board-${board.id}`).emit('card-moved', {
      card: updatedCard,
      boardId: board.id,
      previousListId: card.listId,
      newListId: listId || card.listId,
    });

    res.status(200).json({ success: true, data: updatedCard });
  } catch (error) {
    console.error('Erreur updateCardPosition:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
