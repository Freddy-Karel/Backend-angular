const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  cardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'card_id',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
  },
}, {
  tableName: 'Comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = Comment;
