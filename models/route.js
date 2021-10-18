const {Model, DataTypes} = require('sequelize');
const db = require("../config/pool");
const City = require("./city");

class Route extends Model {

}

Route.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
}, {
  sequelize: db,
  tableName: 'routes',
  modelName: 'routes',
});

Route.belongsTo(City, {
  foreignKey: {
    name: 'to',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'routesTo',
});
City.hasMany(Route, {
  foreignKey: {
    name: 'to',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'routesToR',
});

Route.belongsTo(City, {
  foreignKey: {
    name: 'from',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'routesFrom',
});
City.hasMany(Route, {
  foreignKey: {
    name: 'from',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'routesFromR',
});

module.exports = Route;
