const _ = require("lodash");
const Validate = require("../config/validate");
const Service = require("../models/service");
const Ticket = require("../models/ticket");
const ServiceDetails = require("../models/serviceDetails");
const Passenger = require("../models/passenger");
const Cargo = require("../models/cargo");
const PayDetails = require("../models/payDetails");
const Driver = require("../models/driver");
const Route = require("../models/route");
const Users = require("../models/user");
const {errorHandler, successHandler} = require("../utils/responseHandlers");
const {subQueryPaging} = require("../config/pagination");
const moment = require('moment');

const {
  service_create, service_update, service_delete, service_has_ticket, ticket_create, ticket_update, ticket_delete,
  available_count_error, driver_exist_err, nothing_updated, route_exist_err, user_exist_err, service_exist_err
} = require("../utils/resMessage");

let pageSize = 15;

class ServiceController {

  static getServices = async (req, res, next) => {
    try {
      const {
        id, toStartDate, fromStartDate, state, type, availableCount,
        ticketPriceRange, ticket, user, sort = 1, page = 1
      } = req.query;
      await Validate(req.query, {
        id: 'integer',
        toStartDate: 'iso8601',
        fromStartDate: 'iso8601',
        state: 'integer',
        type: 'integer',
        availableCount: 'integer',
        ticketPriceRange: 'array|length:2',
        'ticketPriceRange.*': 'integer',
        ticket: 'string',
        user: 'string',
        sort: 'integer',
        page: 'required|integer',
      })
      const maxPrice = await ServiceDetails.max('price');

      let filter = {};
      if (id){
        filter.id = id;
      }
      if (fromStartDate || toStartDate){
        filter.startDate = {
          $gte: fromStartDate ? new Date(moment(fromStartDate).format('YYYY-MM-DD 00:00:00')) : 0,
          $lte: toStartDate ? new Date(moment(toStartDate).format('YYYY-MM-DD 23:59:59')) : new Date(),
        };
      }
      if (state){
        filter.state = state;
      }
      if (type){
        filter['$details.type$'] = type;
      }
      if (availableCount){
        filter['$details.availableCount$'] = availableCount;
      }
      if (ticketPriceRange){
        filter['$details.price$'] = {$between: [ticketPriceRange[0] || 0, ticketPriceRange[1] || maxPrice]}
      }
      if (ticket){
        filter['$serviceTickets.id$'] = ticket
      }
      if (user){
        filter['$serviceTickets.userId$'] = user
      }

      await Service.findAndCountAll({
        where: [filter],
        include: [{
          model: ServiceDetails,
          as: 'details',
          required: false,
        }, {
          model: Ticket,
          as: 'serviceTickets',
          required: false,
        }],
        order: [
          +sort === 1 ? ['startDate', 'ASC'] : ['createdAt', 'ASC'],
        ],
        subQuery: false,
        distinct: true,
      }).then((data) => {
        const result = subQueryPaging(data, page, pageSize);
        const service = successHandler('ok', result || [])
        return res.json(service);
      }).catch((err) => {
        return res.status(500).json({errors: err.message});
      });
    } catch (e) {
      next(e);
    }
  }
  static getTickets = async (req, res, next) => {
    try {
      const {
        id, toStartDate, fromStartDate, status, user, page = 1
      } = req.query;
      await Validate(req.query, {
        id: 'integer',
        toStartDate: 'iso8601',
        fromStartDate: 'iso8601',
        status: 'integer',
        user: 'integer',
        page: 'required|integer',
      })

      let filter = {};
      if (id){
        filter.id = id;
      }
      if (fromStartDate || toStartDate){
        filter['$ticketService.startDate$'] = {
          $gte: fromStartDate ? new Date(moment(fromStartDate).format('YYYY-MM-DD 00:00:00')) : 0,
          $lte: toStartDate ? new Date(moment(toStartDate).format('YYYY-MM-DD 23:59:59')) : new Date(),
        };
      }
      if (status){
        filter.status = status;
      }
      if (user){
        filter.userId = user;
      }

      await Ticket.findAndCountAll({
        where: [filter],
        include: [{
          model: Service,
          as: 'ticketService',
          required: false,
        }, {
          model: ServiceDetails,
          as: 'serviceTicket',
          required: false,
        }, {
          model: Cargo,
          as: 'detailsCargo',
          required: false,
        }, {
          model: Passenger,
          as: 'detailsPassenger',
          required: false,
        }],
        subQuery: false,
        distinct: true,
      }).then((data) => {
        const result = subQueryPaging(data, page, pageSize);
        const ticket = successHandler('ok', result || [])
        return res.json(ticket);
      }).catch((err) => {
        return res.status(500).json({errors: err.message});
      });
    } catch (e) {
      next(e);
    }
  }

  static createService = async (req, res, next) => {
    try {
      const {
        startDate, state, availableDrivers, driver, driverMinimumSalary, route,
        promoCode, status, createdDate, cancelDate, price, userId
      } = req.body;
      await Validate(req.body, {
        startDate: 'iso8601',
        state: 'string|alphaDash',
        availableDrivers: 'string|alphaDash',
        driver: 'integer|alphaDash|required',
        driverMinimumSalary: 'integer',
        route: 'integer|alphaDash',
        promoCode: 'string|alphaDash',
        status: 'string|alphaDash',
        createdDate: 'iso8601',
        cancelDate: 'iso8601',
        price: 'integer',
        userId: 'integer',
      })

      const exist = await Driver.findByPk(driver);
      if (_.isEmpty(exist)){
        const error = errorHandler(driver_exist_err);
        return res.json(error);
      }
      if (route){
        const exist = await Route.findByPk(route);
        if (_.isEmpty(exist)){
          const error = errorHandler(route_exist_err);
          return res.json(error);
        }
      }
      const service = await Service.create({
        startDate: startDate ? startDate : null,
        state: state ? state : 1,
        availableDrivers: availableDrivers ? availableDrivers : null,
        driver: +driver,
        driverMinimumSalary: driverMinimumSalary ? +driverMinimumSalary : null,
        routeId: route ? +route : null,
      })
      const details = await ServiceDetails.create({serviceId: service.id})
      const ticket = await Ticket.create({
        promoCode,
        status: status ? status : 1,
        createdDate: createdDate ? createdDate : null,
        cancelDate: cancelDate ? cancelDate : null,
        price: price ? +price : null,
        serviceId: details.serviceId,
        serviceDetailsId: details.id,
        userId: userId ? +userId : null
      })

      const result = successHandler(service_create, {service, details, ticket} || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static createTicket = async (req, res, next) => {
    try {
      const {
        promoCode, service, user, details, method, price, orderId
      } = req.body;
      await Validate(req.body, {
        service: 'integer|required',
        promoCode: 'string|alphaDash',
        user: 'integer|required',
        details: 'array',
        'details.*': 'alphaDash',
        method: 'string|alphaDash',
        price: 'integer',
        orderId: 'string|alphaDash',
      })

      const exist = await Users.findByPk(user);
      if (_.isEmpty(exist)){
        const error = errorHandler(user_exist_err);
        return res.json(error);
      }

      const serviceId = await Service.findOne({
        where: {id: service},
        include: [{
          model: ServiceDetails,
          as: 'details',
          required: false,
        }]
      });
      if (_.isEmpty(serviceId)){
        const error = errorHandler(service_exist_err);
        return res.json(error);
      }

      if (serviceId && +serviceId.details.availableCount === 0){
        const error = errorHandler(available_count_error, +serviceId.details.availableCount);
        return res.json(error);
      }

      const ticket = await Ticket.create({
        promoCode, serviceId: +service, userId: +user,
      });

      if (!_.isEmpty(ticket)){
        await PayDetails.create({
          method, price: price ? price : null, orderId, ticketId: +ticket.id
        });

        if (serviceId && +serviceId.details.type === 1){
          await Promise.map(details, async (d) => {
            await Passenger.create({
              ...d, ticketId: ticket.id
            });
          })
          await ServiceDetails.update({
            availableCount: +serviceId.details.availableCount - 1
          }, {where: {serviceId: serviceId.id}});
        }
        if (serviceId && +serviceId.details.type === 2){
          await Promise.map(details, async (d) => {
            await Cargo.create({
              ...d, ticketId: ticket.id
            });
          })
          await ServiceDetails.update({
            availableCount: +serviceId.details.availableCount - +serviceId.detailsCargo.kg
          }, {where: {serviceId: serviceId.id}});
        }
      }

      const result = successHandler(ticket_create, ticket || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static updateService = async (req, res, next) => {
    try {
      const {
        id, startDate, state, availableDrivers, driver, routeId: route,
        promoCode, status, createdDate, cancelDate, price,
      } = req.body;
      await Validate(req.body, {
        id: 'required|integer',
        startDate: 'iso8601',
        state: 'string|alphaDash',
        availableDrivers: 'string|alphaDash',
        driver: 'integer|alphaDash',
        route: 'integer|alphaDash',
        promoCode: 'string|alphaDash',
        status: 'string|alphaDash',
        createdDate: 'iso8601',
        cancelDate: 'iso8601',
        price: 'integer',
      })

      let update = {};
      if (startDate){
        update.startDate = startDate
      }
      if (state){
        update.state = state
      }
      if (availableDrivers){
        update.availableDrivers = availableDrivers
      }
      if (driver){
        const exist = await Driver.findByPk(driver);
        if (_.isEmpty(exist)){
          const error = errorHandler(driver_exist_err);
          return res.json(error);
        }
        update.driver = driver
      }
      if (route){
        const exist = await Route.findByPk(route);
        if (_.isEmpty(exist)){
          const error = errorHandler(route_exist_err);
          return res.json(error);
        }
        update.routeId = route
      }
      const service = await Service.update({...update}, {where: {id}});

      let updateTicket = {};
      if (promoCode){
        update.promoCode = promoCode
      }
      if (status){
        update.status = status
      }
      if (createdDate){
        update.createdDate = createdDate
      }
      if (cancelDate){
        update.cancelDate = cancelDate
      }
      if (price){
        update.price = price
      }
      const ticket = await Ticket.update({...updateTicket}, {where: {serviceId: id}});

      const result = service[0] === 1 || ticket[0] === 1 ?
        successHandler(service_update, {service, ticket}) :
        errorHandler(nothing_updated);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static updateTicket = async (req, res, next) => {
    try {
      const {
        id, state, detailsState, detailsId
      } = req.body;
      await Validate(req.body, {
        id: 'required|integer',
        state: 'integer',
        detailsId: 'integer|requiredWith:detailsState',
        detailsState: 'integer',
      })
      let s;
      if (state){
        s = state
      }
      const details = await Ticket.findOne({
        where: {id},
        include: [{
          model: Service,
          as: 'ticketService',
          required: false,
        }, {
          model: ServiceDetails,
          as: 'serviceTicket',
          required: false,
        }, {
          model: Cargo,
          as: 'detailsCargo',
          required: false,
        }, {
          model: Passenger,
          as: 'detailsPassenger',
          required: false,
        }]
      });

      let ticket, ticketDetails;
      if (details && details.ticketService && (new Date(details.ticketService.startDate).getHours() - new Date().getHours()) >
        details.ticketService.waitTimeMin){
        ticket = await Ticket.update({status: s}, {where: {id}});

        if (details.serviceTicket){
          if (ticket && ticket[0] === 1 && +state === 3){
            const count = +details.serviceTicket.availableCount + 1
            await ServiceDetails.update({availableCount: count <= +details.serviceTicket.maxCount ? count : +details.serviceTicket.maxCount},
              {where: {id: details.serviceTicket.id}})
          }

          if (+details.serviceTicket.type === 1 && detailsState && detailsId){
            ticketDetails = await Passenger.update({state: detailsState},
              {where: {id: detailsId}});
            if (ticketDetails && ticketDetails[0] === 1 && +detailsState === 3){
              const count = +details.serviceTicket.availableCount + 1
              await ServiceDetails.update({availableCount: count <= +details.serviceTicket.maxCount ? count : +details.serviceTicket.maxCount},
                {where: {id: details.serviceTicket.id}})
            }
          } else{
            if (detailsState && detailsId){
              ticketDetails = await Cargo.update({state: detailsState},
                {where: {id: detailsId}});
            }
            if (ticketDetails && ticketDetails[0] === 1 && +detailsState === 3 && details.detailsCargo){
              const count = +details.serviceTicket.availableCount + +details.detailsCargo[0].kg
              await ServiceDetails.update({availableCount: count <= +details.serviceTicket.maxCount ? count : +details.serviceTicket.maxCount},
                {where: {id: details.serviceTicket.id}})
            }
          }
        }
      }

      const result = ticket && ticket[0] === 1 || ticketDetails && ticketDetails[0] === 1 ?
        successHandler(ticket_update, {ticket, ticketDetails}) :
        errorHandler(nothing_updated);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static deleteService = async (req, res, next) => {
    try {
      const {id} = req.params;
      await Validate(req.params, {
        id: 'required|integer',
      })

      const ticket = await Ticket.findAll({
        where: {serviceId: id},
      });

      if (!_.isEmpty(ticket)){
        const error = errorHandler(service_has_ticket);
        return res.json(error);
      }

      const service = await Service.destroy({
        where: {id},
        limit: 1
      });

      const result = successHandler(service_delete, service)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static deleteTicket = async (req, res, next) => {
    try {
      const {id} = req.params;
      await Validate(req.params, {
        id: 'required|integer',
      })

      const ticket = await Ticket.destroy({
        where: {id},
        limit: 1
      });

      const result = successHandler(ticket_delete, ticket)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

}

module.exports = ServiceController;
