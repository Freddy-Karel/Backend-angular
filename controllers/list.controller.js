const List = require('../models/List.model');
const Board = require('../models/Board.model');
const BoardMember = require('../models/BoardMember.model');
const Card = require('../models/Card.model');

const listController = {
  createList: async (req, res) => {
    try {
      const { boardId } = req.params;
      const { title } = req.body;
      const userId = req.user.id;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Le titre est requis'
        });
      }

      const board = await Board.findByPk(boardId);
      if (!board) {
        return res.status(404).json({
          success: false,
          message: 'Board non trouvé'
        });
      }

      const isMember = await BoardMember.findOne({
        where: {
          boardId,
          userId,
        },
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas membre de ce board'
        });
      }

      const maxPosition = await List.max('position', {
        where: { boardId },
      });

      const position = maxPosition ? maxPosition + 1 : 1;

      const list = await List.create({
        title,
        position,
        boardId,
      });

      res.status(201).json({
        success: true,
        message: 'Liste créée avec succès',
        list,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la liste',
        error: error.message,
      });
    }
  },

  getLists: async (req, res) => {
    try {
      const { boardId } = req.params;
      const userId = req.user.id;

      const board = await Board.findByPk(boardId);
      if (!board) {
        return res.status(404).json({
          success: false,
          message: 'Board non trouvé'
        });
      }

      const isMember = await BoardMember.findOne({
        where: {
          boardId,
          userId,
        },
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas membre de ce board'
        });
      }

      const lists = await List.findAll({
        where: { boardId },
        order: [['position', 'ASC']],
      });

      res.json({
        success: true,
        lists,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des listes',
        error: error.message,
      });
    }
  },

  updateList: async (req, res) => {
    try {
      const { listId } = req.params;
      const { title, position } = req.body;
      const userId = req.user.id;

      const list = await List.findByPk(listId);
      if (!list) {
        return res.status(404).json({
          success: false,
          message: 'Liste non trouvée'
        });
      }

      const isMember = await BoardMember.findOne({
        where: {
          boardId: list.boardId,
          userId,
        },
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas membre de ce board'
        });
      }

      await list.update({
        title: title || list.title,
        position: position !== undefined ? position : list.position,
      });

      res.json({
        success: true,
        message: 'Liste mise à jour avec succès',
        list,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la liste',
        error: error.message,
      });
    }
  },

  deleteList: async (req, res) => {
    try {
      const { listId } = req.params;
      const userId = req.user.id;

      const list = await List.findByPk(listId);
      if (!list) {
        return res.status(404).json({
          success: false,
          message: 'Liste non trouvée'
        });
      }

      const isMember = await BoardMember.findOne({
        where: {
          boardId: list.boardId,
          userId,
        },
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas membre de ce board'
        });
      }

      // Delete all cards in the list (cascade delete)
      await Card.destroy({
        where: { listId },
      });

      // Delete the list
      await list.destroy();

      res.json({
        success: true,
        message: 'Liste supprimée avec succès',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de la liste',
        error: error.message,
      });
    }
  },
};

module.exports = listController;
