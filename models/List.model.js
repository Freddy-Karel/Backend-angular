const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const List = sequelize.define('List', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  boardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'board_id',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'Lists',
  timestamps: false,
});

module.exports = List;
