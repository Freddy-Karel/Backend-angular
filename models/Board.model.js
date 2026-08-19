const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const BoardMember = require('./BoardMember.model');

const Board = sequelize.define('Board', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  backgroundColor: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'background_color',
  },
  coverImageUrl: {
    type: DataTypes.TEXT('medium'),
    allowNull: true,
    field: 'cover_image_url',
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'owner_id',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'Boards',
  timestamps: false,
});

// Instance method to check if a user is a member of this board
Board.prototype.hasMember = async function(userId) {
  const member = await BoardMember.findOne({
    where: {
      boardId: this.id,
      userId: userId
    }
  });
  return !!member;
};

module.exports = Board;
