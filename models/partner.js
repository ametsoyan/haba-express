const {Model, DataTypes} = require('sequelize');
const db = require("../config/pool");
const User = require("./user");

class Partner extends Model {

}

Partner.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize: db,
  tableName: 'partner',
  modelName: 'partner',
});

Partner.belongsTo(User, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'partnerUser',
});
User.hasMany(Partner, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'userPartners',
});


module.exports = Partner;
