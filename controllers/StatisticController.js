const _ = require("lodash");
const Validate = require("../config/validate");
const Service = require("../models/service");
const Ticket = require("../models/ticket");
const ServiceDetails = require("../models/serviceDetails");
const moment = require('moment');
const Passenger = require("../models/passenger");
const Cargo = require("../models/cargo");
const Route = require("../models/route");
const City = require("../models/city");
const {successHandler} = require("../utils/responseHandlers");

class StatisticController {

  static getStatistics = async (req, res, next) => {
    try {
      const {
        toCountry, toCity, fromCountry, fromCity, toStartDate, fromStartDate, serviceType, serviceState
      } = req.query;
      await Validate(req.query, {
        toCountry: 'integer',
        toCity: 'integer',
        fromCountry: 'integer',
        fromCity: 'integer',
        toStartDate: 'iso8601',
        fromStartDate: 'iso8601',
        serviceType: 'integer',
        serviceState: 'integer',
      })

      let filter = {};
      if (toCountry){
        filter['$route.routesTo.countryId$'] = toCountry;
      }
      if (fromCountry){
        filter['$route.routesFrom.countryId$'] = fromCountry;
      }
      if (toCity){
        filter['$route.to$'] = toCity;
      }
      if (fromCity){
        filter['$route.from$'] = fromCity;
      }
      if (fromStartDate || toStartDate){
        filter.startDate = {
          $gte: fromStartDate ? new Date(moment(fromStartDate).format('YYYY-MM-DD 00:00:00')) : 0,
          $lte: toStartDate ? new Date(moment(toStartDate).format('YYYY-MM-DD 23:59:59')) : new Date(),
        };
      }
      if (serviceType){
        filter['$details.type$'] = serviceType;
      }
      if (serviceState){
        filter.state = serviceState;
      }

      const statistics = await Service.findAndCountAll({
        where: [filter],
        include: [{
          model: ServiceDetails,
          as: 'details',
          required: false,
        }, {
          model: Ticket,
          as: 'serviceTickets',
          required: false,
          include: [{
            model: Passenger,
            as: 'detailsPassenger',
            required: false,
          }, {
            model: Cargo,
            as: 'detailsCargo',
            required: false,
          }],
        }, {
          model: Route,
          as: 'route',
          required: false,
          include: [{
            model: City,
            as: 'routesTo',
            required: false,
          }, {
            model: City,
            as: 'routesFrom',
            required: false,
          }],
        }],
        subQuery: false,
        distinct: true,
      })

      const result = successHandler("ok", statistics || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

}

module.exports = StatisticController;
