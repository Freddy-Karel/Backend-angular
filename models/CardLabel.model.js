const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const CardLabel = sequelize.define('CardLabel', {
  cardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'card_id',
    primaryKey: true,
  },
  labelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'label_id',
    primaryKey: true,
  },
}, {
  tableName: 'Card_Labels',
  timestamps: false,
});

module.exports = CardLabel;
