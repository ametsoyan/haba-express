const {Model, DataTypes} = require('sequelize');
const db = require("../config/pool");
const Users = require("./user");

class Referrals extends Model {

}

Referrals.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
}, {
  sequelize: db,
  tableName: 'referrals',
  modelName: 'referrals',
});

Referrals.belongsTo(Users, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'invitor',
});
Users.hasMany(Referrals, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'userInviters'
});

Referrals.belongsTo(Users, {
  foreignKey: {
    name: 'refId',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'referral',
});
Users.hasMany(Referrals, {
  foreignKey: {
    name: 'refId',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'userReferrals'
});

module.exports = Referrals;
