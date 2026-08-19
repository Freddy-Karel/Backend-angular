const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const BoardMember = sequelize.define('BoardMember', {
  boardId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'board_id',
  },
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'user_id',
  },
  role: {
    type: DataTypes.ENUM('admin', 'member', 'viewer'),
    defaultValue: 'member',
    allowNull: false,
  },
}, {
  tableName: 'Board_Members',
  timestamps: false,
});

module.exports = BoardMember;
