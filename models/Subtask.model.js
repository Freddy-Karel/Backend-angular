const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Subtask = sequelize.define('Subtask', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_completed',
  },
  cardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'card_id',
  },
}, {
  tableName: 'Subtasks',
  timestamps: false,
});

module.exports = Subtask;
