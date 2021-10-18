const {Model, DataTypes} = require('sequelize');
const db = require("../config/pool");
const Driver = require("./driver");
const Route = require("./route");

class Service extends Model {

}

Service.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  state: {
    type: DataTypes.ENUM('1', '2', '3', '4', '5'),
    allowNull: true,
    defaultValue: 1,
  },
  driverMinimumSalary: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  paidSalary: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  waitTimeMin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize: db,
  tableName: 'service',
  modelName: 'service',
});

Service.belongsTo(Driver, {
  foreignKey: {
    name: 'availableDrivers',
    allowNull: true,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'availDrivers',
});
Driver.hasMany(Service, {
  foreignKey: {
    name: 'availableDrivers',
    allowNull: true,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'driversAvailable'
});

Service.belongsTo(Driver, {
  foreignKey: {
    name: 'driver',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'serviceDriver',
});
Driver.hasMany(Service, {
  foreignKey: {
    name: 'driver',
    allowNull: false,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'driverService'
});

Service.belongsTo(Route, {
  foreignKey: {
    name: 'routeId',
    allowNull: true,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'route',
});
Route.hasMany(Service, {
  foreignKey: {
    name: 'routeId',
    allowNull: true,
  },
  onUpdate: 'cascade',
  onDelete: 'cascade',
  as: 'routeService'
});

module.exports = Service;
