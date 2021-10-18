const {Model, DataTypes} = require('sequelize');
const db = require("../config/pool");
const Users = require("./user");

class Driver extends Model {

}

Driver.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('1', '2'),
    allowNull: true,
    defaultValue: 1,
  },
}, {
  sequelize: db,
  tableName: 'drivers',
  modelName: 'drivers',
});

Driver.belongsTo(Users, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'driverUser',
});
Users.hasMany(Driver, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'userDriver'
});

module.exports = Driver;
