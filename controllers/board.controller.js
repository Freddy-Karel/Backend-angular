const Board = require('../models/Board.model');
const BoardMember = require('../models/BoardMember.model');
const List = require('../models/List.model');
const User = require('../models/User.model');

const getBoardMembers = async (boardId) => {
  const memberships = await BoardMember.findAll({
    where: { boardId },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'fullName', 'email', 'avatarUrl'],
    }],
    order: [['role', 'ASC'], ['userId', 'ASC']],
  });

  return memberships
    .filter((membership) => membership.user)
    .map((membership) => ({
      id: membership.user.id,
      userId: membership.userId,
      fullName: membership.user.fullName,
      email: membership.user.email,
      avatarUrl: membership.user.avatarUrl,
      role: membership.role,
    }));
};

const canManageMembers = async (boardId, userId) => {
  const membership = await BoardMember.findOne({ where: { boardId, userId } });
  return membership && membership.role === 'admin';
};

const boardController = {
  createBoard: async (req, res) => {
    try {
      const { title, description, backgroundColor, coverImageUrl } = req.body;
      const userId = req.user.id;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Le titre est requis'
        });
      }

      const board = await Board.create({
        title,
        description: description || null,
        backgroundColor: backgroundColor || null,
        coverImageUrl: coverImageUrl || null,
        ownerId: userId,
      });

      await BoardMember.create({
        boardId: board.id,
        userId: userId,
        role: 'admin',
      });

      const members = await getBoardMembers(board.id);

      res.status(201).json({
        success: true,
        message: 'Board créé avec succès',
        board: {
          ...board.toJSON(),
          members,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du board',
        error: error.message,
      });
    }
  },

  getBoards: async (req, res) => {
    try {
      const userId = req.user.id;

      const boardMembers = await BoardMember.findAll({
        where: { userId },
      });

      const boardIds = boardMembers.map((bm) => bm.boardId);

      const boards = await Board.findAll({
        where: {
          id: boardIds,
        },
      });

      const boardsWithMembers = await Promise.all(
        boards.map(async (board) => {
          const members = await getBoardMembers(board.id);
          return {
            ...board.toJSON(),
            members,
          };
        })
      );

      res.json({
        success: true,
        boards: boardsWithMembers,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des boards',
        error: error.message,
      });
    }
  },

  getBoardWithLists: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const board = await Board.findByPk(id);
      if (!board) {
        return res.status(404).json({ success: false, message: 'Board non trouvé' });
      }

      const isMember = await board.hasMember(userId);
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
      }

      const lists = await List.findAll({
        where: { boardId: id },
        order: [['position', 'ASC']],
      });

      const members = await getBoardMembers(id);

      res.json({
        success: true,
        board: {
          ...board.toJSON(),
          lists,
          members,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du board',
        error: error.message,
      });
    }
  },



  updateBoard: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const allowedFields = ['title', 'description', 'backgroundColor', 'coverImageUrl'];
      const updates = {};

      allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          updates[field] = req.body[field] || null;
        }
      });

      const board = await Board.findByPk(id);
      if (!board) {
        return res.status(404).json({ success: false, message: 'Board non trouve' });
      }

      const canManage = await canManageMembers(id, userId);
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Seul un administrateur peut modifier ce board' });
      }

      await board.update(updates);
      const members = await getBoardMembers(id);
      const updatedBoard = { ...board.toJSON(), members };
      req.app.get('io').to(`board-${id}`).emit('board-updated', { board: updatedBoard });

      res.json({ success: true, message: 'Board mis a jour avec succes', board: updatedBoard });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erreur lors de la mise a jour du board', error: error.message });
    }
  },

  deleteBoard: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const board = await Board.findByPk(id);
      if (!board) {
        return res.status(404).json({ success: false, message: 'Board non trouve' });
      }

      const canManage = await canManageMembers(id, userId);
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Seul un administrateur peut supprimer ce board' });
      }

      await board.destroy();
      req.app.get('io').to(`board-${id}`).emit('board-deleted', { boardId: Number(id) });

      res.json({ success: true, message: 'Board supprime avec succes' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erreur lors de la suppression du board', error: error.message });
    }
  },

  addMember: async (req, res) => {
    try {
      const { id } = req.params;
      const { email, role = 'member' } = req.body;
      const userId = req.user.id;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email requis' });
      }

      if (!['admin', 'member', 'viewer'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Role invalide' });
      }

      const board = await Board.findByPk(id);
      if (!board) {
        return res.status(404).json({ success: false, message: 'Board non trouve' });
      }

      const canManage = await canManageMembers(id, userId);
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Seul un administrateur peut ajouter des membres' });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      }

      const [membership, created] = await BoardMember.findOrCreate({
        where: { boardId: id, userId: user.id },
        defaults: { role },
      });

      if (!created && membership.role !== role) {
        membership.role = role;
        await membership.save();
      }

      const members = await getBoardMembers(id);
      req.app.get('io').to(`board-${id}`).emit('board-members-updated', { boardId: Number(id), members });

      res.status(created ? 201 : 200).json({
        success: true,
        message: created ? 'Membre ajoute avec succes' : 'Membre mis a jour avec succes',
        members,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l ajout du membre',
        error: error.message,
      });
    }
  },

  removeMember: async (req, res) => {
    try {
      const { id, userId: memberUserId } = req.params;
      const userId = req.user.id;

      const board = await Board.findByPk(id);
      if (!board) {
        return res.status(404).json({ success: false, message: 'Board non trouve' });
      }

      const canManage = await canManageMembers(id, userId);
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Seul un administrateur peut retirer des membres' });
      }

      if (Number(memberUserId) === board.ownerId) {
        return res.status(400).json({ success: false, message: 'Le proprietaire du board ne peut pas etre retire' });
      }

      const deleted = await BoardMember.destroy({ where: { boardId: id, userId: memberUserId } });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Membre introuvable sur ce board' });
      }

      const members = await getBoardMembers(id);
      req.app.get('io').to(`board-${id}`).emit('board-members-updated', { boardId: Number(id), members });

      res.json({ success: true, message: 'Membre retire avec succes', members });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors du retrait du membre',
        error: error.message,
      });
    }
  },
};

module.exports = boardController;
