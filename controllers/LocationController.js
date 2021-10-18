const _ = require("lodash");
const Validate = require("../config/validate");
const Country = require("../models/country");
const City = require("../models/city");
const Route = require("../models/route");
const Service = require("../models/service");
const {errorHandler, successHandler} = require("../utils/responseHandlers");
const {getPagination, getPagingData} = require("../config/pagination");

const {
  location_create, location_update, location_delete, country_del_err, country_exist, nothing_updated,
  city_create, city_update, city_delete, city_has_route, route_create, route_delete, route_has_service,
  city_exist, city_exist_err
} = require("../utils/resMessage");

let pageSize = 15;

class LocationController {

  static getCountries = async (req, res, next) => {
    try {
      const {page = 1} = req.query;
      await Validate(req.query, {page: 'integer'})

      const {limit, offset} = getPagination(page, pageSize);

      await Country.findAndCountAll({
        offset: offset,
        limit: limit,
      }).then((data) => {
        const result = getPagingData(data, page, limit);
        const country = successHandler('ok', result || [])
        return res.json(country);
      }).catch((err) => {
        return res.status(500).json({errors: err.message});
      });
    } catch (e) {
      next(e);
    }
  }
  static getCites = async (req, res, next) => {
    try {
      const {page = 1} = req.query;
      await Validate(req.query, {page: 'integer'})

      const {limit, offset} = getPagination(page, pageSize);

      await City.findAndCountAll({
        include: [{
          model: Country,
          as: 'country',
          required: false,
        }],
        offset: offset,
        limit: limit,
      }).then((data) => {
        const result = getPagingData(data, page, limit);
        const city = successHandler('ok', result || [])
        return res.json(city);
      }).catch((err) => {
        return res.status(500).json({errors: err.message});
      });
    } catch (e) {
      next(e);
    }
  }
  static getRoute = async (req, res, next) => {
    try {
      const {page = 1} = req.query;
      await Validate(req.query, {page: 'integer'})

      const {limit, offset} = getPagination(page, pageSize);

      await Route.findAndCountAll({
        include: [{
          model: City,
          as: 'routesTo',
          required: false,
        }, {
          model: City,
          as: 'routesFrom',
          required: false,
        }],
        offset: offset,
        limit: limit,
      }).then((data) => {
        const result = getPagingData(data, page, limit);
        const route = successHandler('ok', result || [])
        return res.json(route);
      }).catch((err) => {
        return res.status(500).json({errors: err.message});
      });
    } catch (e) {
      next(e);
    }
  }

  static createCountry = async (req, res, next) => {
    try {
      const {name, coords} = req.body;
      await Validate(req.body, {
        name: 'alpha|string|required',
        coords: 'array|required|latLong|length:2',
      })

      const country = await Country.findOne({where: {name}});
      if (!_.isEmpty(country)){
        const error = errorHandler(country_exist);
        return res.json(error);
      }

      const location = await Country.create({name, coords});

      const result = successHandler(location_create, location || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static createCity = async (req, res, next) => {
    try {
      const {name, coords, countryId, isCanTakePassengers} = req.body;
      await Validate(req.body, {
        name: 'alpha|string|required',
        coords: 'array|required|latLong|length:2',
        countryId: 'integer|required',
        isCanTakePassengers: 'boolean',
      })

      const cityExist = await City.findOne({where: {name}});

      if (!_.isEmpty(cityExist)){
        const error = errorHandler(city_exist);
        return res.json(error);
      }

      const city = await City.create({
        name,
        coords,
        countryId: +countryId,
        isCanTakePassengers: isCanTakePassengers ? isCanTakePassengers : true
      });

      const result = successHandler(city_create, city || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static createRoute = async (req, res, next) => {
    try {
      const {to, from} = req.body;
      await Validate(req.body, {
        to: 'integer|required',
        from: 'integer|required',
      })

      const cityTo = await City.findByPk(to);
      const cityFrom = await City.findByPk(from);
      if (!cityTo || !cityFrom){
        const error = errorHandler(city_exist_err)
        return res.json(error);
      }

      const route = await Route.create({to: +to, from: +from});

      const result = successHandler(route_create, route || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static updateCountry = async (req, res, next) => {
    try {
      const {id, name, coords} = req.body;
      await Validate(req.body, {
        id: 'required|integer',
        name: 'string|alpha',
        coords: 'array|latLong|length:2',
      })

      let toUpdate = {};
      if (name){
        toUpdate.name = name;
      }
      if (coords){
        toUpdate.coords = coords;
      }

      const country = await Country.findOne({where: {name}});
      if (!_.isEmpty(country)){
        const error = errorHandler(country_exist);
        return res.json(error);
      }

      const location = await Country.update({...toUpdate}, {where: {id}});

      const result = location[0] === 0 ? errorHandler(nothing_updated) : successHandler(location_update)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static updateCity = async (req, res, next) => {
    try {
      const {id, name, coords, isCanTakePassengers} = req.body;
      await Validate(req.body, {
        id: 'required|integer',
        name: 'string|alpha',
        coords: 'array|latLong|length:2',
        isCanTakePassengers: 'boolean',
      })

      let toUpdate = {};
      if (name){
        toUpdate.name = name;
      }
      if (coords){
        toUpdate.coords = coords;
      }
      if (isCanTakePassengers){
        toUpdate.isCanTakePassengers = isCanTakePassengers;
      }

      const cityExist = await City.findOne({where: {name}});
      if (!_.isEmpty(cityExist)){
        const error = errorHandler(country_exist);
        return res.json(error);
      }

      const city = await City.update({...toUpdate}, {where: {id}});

      const result = city[0] === 0 ? errorHandler(nothing_updated) : successHandler(city_update, city || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static deleteCountry = async (req, res, next) => {
    try {
      const {id} = req.params;
      await Validate(req.params, {
        id: 'required|integer',
      })

      const city = await City.findAll({
        where: {countryId: id},
      });

      if (!_.isEmpty(city)){
        const error = errorHandler(country_del_err, city);
        return res.json(error);
      }

      const location = await Country.destroy({
        where: {id},
        limit: 1
      });

      const result = successHandler(location_delete, location)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static deleteCity = async (req, res, next) => {
    try {
      const {id} = req.params;
      await Validate(req.params, {
        id: 'required|integer',
      })

      const route = await Route.findAll({
        where: {
          $or: {
            to: id,
            from: id,
          }
        },
        include: [
          {
            model: City,
            as: 'routesTo',
            required: false,
          }, {
            model: City,
            as: 'routesFrom',
            required: false,
          },
        ]
      });

      if (!_.isEmpty(route)){
        const error = errorHandler(city_has_route, route);
        return res.json(error);
      }

      const city = await City.destroy({
        where: {id},
        limit: 1
      });

      const result = successHandler(city_delete, city)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static deleteRoute = async (req, res, next) => {
    try {
      const {id} = req.params;
      await Validate(req.params, {
        id: 'required|integer',
      })

      const service = await Service.findAll({
        where: {routeId: id},
      });

      if (!_.isEmpty(service)){
        const error = errorHandler(route_has_service, service);
        return res.json(error);
      }

      const route = await Route.destroy({
        where: {id},
        limit: 1
      });

      const result = successHandler(route_delete, route)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

}

module.exports = LocationController;
