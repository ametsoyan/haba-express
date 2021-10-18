const _ = require("lodash");
const HttpError = require('http-errors');
const jwt = require("jsonwebtoken");
const Promise = require('bluebird');
const Users = require("../models/user");
const Validate = require("../config/validate");
const Referrals = require("../models/referrals");
const Driver = require("../models/driver");
const Car = require("../models/car");
const DriverState = require("../models/driverState");
const Partner = require("../models/partner");
const PartnerBranch = require("../models/partnerBranch");
const Country = require("../models/country");
const City = require("../models/city");
const Roles = require("../models/roles");
const {subQueryPaging} = require("../config/pagination");
const {checkVerifyCode} = require("../config/smsVerify");
const {sendVerifyCode} = require("../config/smsVerify");
const {successHandler, errorHandler} = require("../utils/responseHandlers");
const {getPagination, getPagingData} = require("../config/pagination");
const {
  login_error, digit_code_check, digit_code_error, login, not_authenticate, phone_err, user_create,
  driver_create, email_err, user_update, user_delete, driver_update, driver_delete, perm_err,
  partner_create, partner_update, partner_delete, not_found, digit_code_send_err, verified_error, nothing_updated,
  ref_error, user_exist_err, number_exist, driver_exist, invitor_exist_err
} = require("../utils/resMessage");

const {JWT_SECRET, JWT_REFRESH_SECRET} = process.env;
let pageSize = 15;

class AdminController {

  static getUsers = async (req, res, next) => {
    try {
      const {id, phoneNumber, username, email, verified, deleted, role, page = 1} = req.query;
      await Validate(req.query, {
        id: 'integer',
        phoneNumber: 'string|maxLength:12',
        verified: 'boolean',
        deleted: 'boolean',
        role: 'integer',
        email: 'string',
        page: 'integer',
        username: 'string',
      }, {phoneNumber})

      let filter = {};
      if (id){
        filter.id = id
      }
      if (phoneNumber){
        filter.phoneNumber = {$like: `%${ phoneNumber }%`}
      }
      if (username){
        filter.username = username
      }
      if (email){
        filter.email = {$like: `%${ email }%`};
      }
      if (verified){
        filter.verified = verified
      }
      if (deleted){
        filter.deleted = deleted
      }
      if (role){
        filter.role = role
      }

      const {limit, offset} = getPagination(page, pageSize);

      await Users.findAndCountAll({
        where: [
          filter,
          {role: {$notIn: +req.role === 2 ? [1, 2] : []}}
        ],
        include: [{
          model: Users,
          as: 'invite',
          required: false,
        }, {
          model: Users,
          as: 'userInvitor',
          required: false,
        }, {
          model: Roles,
          as: 'roles',
          required: false,
        }],
        offset: offset,
        limit: limit,
      }).then((data) => {
        const result = getPagingData(data, page, limit);
        const users = successHandler('ok', result);
        return res.json(users);
      }).catch((err) => {
        return res.status(500).json({errors: err.message});
      });
    } catch (e) {
      next(e);
    }
  }
  static getDriver = async (req, res, next) => {
    try {
      const {id, make, model, color, year, passengersSeat, number, page = 1} = req.query;
      await Validate(req.query, {
        id: 'integer',
        make: 'string',
        model: 'string',
        color: 'string',
        year: 'string',
        passengersSeat: 'integer',
        number: 'string',
        page: 'integer|required',
      })

      let filter = {};
      if (id){
        filter.id = id
      }
      if (make){
        filter['$driverCars.make$'] = make
      }
      if (model){
        filter['$driverCars.model$'] = model
      }
      if (color){
        filter['$driverCars.color$'] = color;
      }
      if (year){
        filter['$driverCars.year$'] = year
      }
      if (passengersSeat){
        filter['$driverCars.passengersSeat$'] = passengersSeat
      }
      if (number){
        filter['$driverCars.number$'] = number
      }

      await Driver.findAndCountAll({
        where: [filter],
        include: [{
          model: DriverState,
          as: 'stateDriver',
          required: false,
        }, {
          model: Car,
          as: 'driverCars',
          required: false,
        }, {
          model: Users,
          as: 'driverUser',
          required: false,
        }],
        subQuery: false,
        distinct: true,
      }).then((data) => {
        const result = subQueryPaging(data, page, pageSize);
        const drivers = successHandler('ok', result);
        return res.json(drivers);
      }).catch((err) => {
        return res.status(500).json({errors: err.message});
      });
    } catch (e) {
      next(e);
    }
  }
  static getPartners = async (req, res, next) => {
    try {
      const {country, city, name, user, page = 1} = req.query;
      await Validate(req.query, {
        country: 'integer',
        city: 'integer',
        name: 'string',
        user: 'integer',
        page: 'integer|required',
      })

      let filter = {};
      if (country){
        filter['$partnerBranches.countryId$'] = country
      }
      if (city){
        filter['$partnerBranches.cityId$'] = city
      }
      if (name){
        filter.name = name
      }
      if (user){
        filter.userId = user;
      }

      await Partner.findAndCountAll({
        where: [filter],
        include: [{
          model: PartnerBranch,
          as: 'partnerBranches',
          required: false,
          include: [{
            model: Country,
            as: 'branchCountry',
            required: false,
          }, {
            model: City,
            as: 'branchCity',
            required: false,
          }]
        }],
        subQuery: false,
        distinct: true,
      }).then((data) => {
        const result = subQueryPaging(data, page, pageSize);
        const partner = successHandler('ok', result);
        return res.json(partner);
      }).catch((err) => {
        return res.status(500).json({errors: err.message});
      });
    } catch (e) {
      next(e);
    }
  }

  static adminLogin = async (req, res, next) => {
    try {
      const {phoneNumber, password} = req.body;
      await Validate(req.body, {
        phoneNumber: 'string|required|minLength:9|maxLength:12',
        password: 'required|minLength:8|maxLength:20',
      }, {phoneNumber})

      const user = await Users.findOne({
        where: {phoneNumber}
      });

      if (!user || user.getDataValue('password') !== Users.passwordHash(password)){
        const error = errorHandler(login_error);
        return res.status(422).json(error);
      }

      if (![1, 2].includes(+user.role)){
        const error = errorHandler(not_found);
        return res.status(404).json(error);
      }

      const verifyStatus = await sendVerifyCode(phoneNumber);

      let result;
      if (verifyStatus && verifyStatus.status === "pending"){
        await Users.update({verifyId: verifyStatus.sid, verified: false}, {
          where: {id: user.id}
        });
        result = successHandler(digit_code_check, verifyStatus)
      } else{
        result = errorHandler(digit_code_send_err)
      }

      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static checkAdminLogin = async (req, res, next) => {
    try {
      const {phoneNumber, code} = req.body;
      await Validate(req.body, {
        phoneNumber: 'string|required|minLength:9|maxLength:12',
        code: 'integer|required|minLength:4|maxLength:4',
      }, {phoneNumber})

      const user = await Users.findOne({
        where: {phoneNumber}
      });

      if (![1, 2].includes(+user.role)){
        const error = errorHandler(not_found);
        return res.status(404).json(error);
      }

      const verifyStatus = await checkVerifyCode(phoneNumber, code);

      if (!user || !verifyStatus || verifyStatus?.status !== "approved"){
        const error = errorHandler(digit_code_error);
        return res.status(200).json(error);
      }
      if (user.verified === true){
        const error = errorHandler(verified_error);
        return res.status(200).json(error);
      }

      let token, refresh_token;
      if (user){
        token = jwt.sign({userId: user.id, role: user.role}, JWT_SECRET, {expiresIn: '1h'});
        refresh_token = jwt.sign({userId: user.id, role: user.role}, JWT_REFRESH_SECRET, {expiresIn: '7d'});
        await Users.update({verified: true, restoreVerifyId: verifyStatus.sid, refreshToken: refresh_token}, {
          where: {id: user.id}
        });
      }

      const result = successHandler(login, {access_token: token, refresh_token})
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static resetToken = async (req, res, next) => {
    try {
      await Validate(req.body, {
        refreshToken: 'required|string',
      })
      const {refreshToken} = req.body;

      if (!refreshToken){
        const error = errorHandler(not_authenticate)
        return res.json(error);
      }
      const user = await Users.findOne({
        where: {refreshToken}
      });

      if (_.isEmpty(user)){
        const error = errorHandler(not_authenticate);
        return res.status(401).json(error);
      }

      jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, data) => {
        if (!err){
          const accessToken = jwt.sign({userId: data.id, role: data.role}, JWT_SECRET, {expiresIn: '1h'});
          const result = successHandler("ok", accessToken)
          return res.json(result);
        } else{
          throw HttpError(401, {status: false, errors: not_authenticate, data: null});
        }
      });
    } catch (e) {
      next(e);
    }
  }

  static createUser = async (req, res, next) => {
    try {
      const {phoneNumber, password, verified, invitor, role} = req.body;
      await Validate(req.body, {
        phoneNumber: 'string|required|minLength:9|maxLength:12',
        password: 'required|minLength:8|maxLength:20',
        verified: 'boolean',
        invitor: 'integer',
        role: 'integer',
      }, {phoneNumber})

      if (phoneNumber){
        const uniquePhone = await Users.findOne({where: {phoneNumber}});
        if (uniquePhone){
          const error = errorHandler(phone_err)
          return res.status(422).json(error);
        }
      }
      if (invitor){
        const invitorExist = await Users.findOne({where: {invitor}});
        if (!invitorExist){
          const error = errorHandler(invitor_exist_err)
          return res.status(422).json(error);
        }
      }

      const user = await Users.create({
        phoneNumber, password, verified: verified ? verified : 0, invitor: invitor ? invitor : null,
        role: role && +req.role === 1 ? role : [3, 4].includes(role) && +req.role === 2 ? role : 4
      });

      const result = successHandler(user_create, user || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static createDriver = async (req, res, next) => {
    try {
      const {userId, carMake, carModel, carColor, carYear, carPassengersSeat, carNumber} = req.body;
      await Validate(req.body, {
        userId: 'integer|required',
        carMake: 'string|alphaDash',
        carModel: 'string|alphaDash',
        carColor: 'string|alpha',
        carYear: 'integer',
        carPassengersSeat: 'integer',
        carNumber: 'string|alphaNumeric',
      })

      if (userId){
        const unique = await Driver.findOne({where: {userId}});
        if (unique){
          const error = errorHandler(driver_exist)
          return res.json(error);
        }
      }

      const driver = await Driver.create({
        userId
      });

      let car;
      if (driver){
        if (carNumber){
          const unique = await Car.findOne({where: {number: carNumber}});
          if (unique){
            const error = errorHandler(number_exist)
            return res.json(error);
          }
        }
        car = await Car.create({
          driverId: driver.id, make: carMake, model: carModel, color: carColor,
          year: carYear, passengersSeat: carPassengersSeat ? carPassengersSeat : null, number: carNumber,
        });
      }

      const result = successHandler(driver_create, {driver, car} || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static createPartner = async (req, res, next) => {
    try {
      const {name, user, address, country, city, isGeneral, coords} = req.body;
      await Validate(req.body, {
        name: 'alpha|string|required',
        user: 'integer|required',
        address: 'string|alphaDash',
        country: 'integer|required',
        city: 'integer|required',
        isGeneral: 'boolean',
        coords: 'array|required',
      })

      const partner = await Partner.create({name, userId: +user});

      let branch;
      if (partner){
        branch = await PartnerBranch.create({
          address,
          countryId: +country,
          cityId: +city,
          isGeneral: isGeneral ? isGeneral : false,
          coords: coords[0] && coords[1] ? coords : null,
          partnerId: partner.id,
        });
      }

      const result = successHandler(partner_create, {partner: partner || {}, branch: branch || {}})
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static updateUser = async (req, res, next) => {
    try {
      const {
        id, phoneNumber, username, firstName, lastName, email,
        password, verified, invitor, deleted, role, referralIds
      } = req.body;
      await Validate(req.body, {
        id: 'required|integer',
        phoneNumber: 'alphaDash|string|minLength:9|maxLength:12',
        password: 'minLength:8|maxLength:20',
        verified: 'boolean',
        deleted: 'boolean',
        role: 'integer',
        email: 'email',
        invitor: 'integer',
        username: 'string|alphaDash',
        firstName: 'string|alphaDash',
        lastName: 'string|alphaDash',
        referralIds: 'array',
      }, {phoneNumber})

      if (phoneNumber){
        const uniquePhone = await Users.findOne({where: {phoneNumber}});
        if (uniquePhone){
          const error = errorHandler(phone_err)
          return res.json(error);
        }
      }
      if (email){
        const uniqueEmail = await Users.findOne({where: {email}})
        if (uniqueEmail){
          const error = errorHandler(email_err)
          return res.json(error);
        }
      }

      let field = {};
      if (invitor){
        field.invitor = invitor
      }
      if (phoneNumber){
        field.phoneNumber = phoneNumber
      }
      if (username){
        field.username = username
      }
      if (firstName){
        field.firstName = firstName
      }
      if (lastName){
        field.lastName = lastName
      }
      if (verified){
        field.verified = verified
      }
      if (deleted){
        field.deleted = deleted
      }
      if (email){
        field.email = email
      }
      if (password){
        field.password = password
      }
      if (role && +req.role === 1){
        field.role = role
      }
      let userRole;
      if (role && +req.role === 2){
        if (role !== 1 || role !== 2){
          userRole = await Users.update({role}, {where: {id, role: {$ne: 1}}});
        } else{
          const error = errorHandler(perm_err)
          return res.json(error);
        }
      }

      const user = await Users.update({...field}, {where: {id}});
      if (referralIds){
        let uniqueId, exist;
        await Promise.map(referralIds, async (v) => {
          uniqueId = await Referrals.findOne({where: {userId: id, refId: +v}});
          if (!uniqueId){
            exist = await Users.findOne({where: {id: +v}});
            if (exist){
              await Referrals.create({userId: id, refId: +v})
            }
          }
        })
        if (uniqueId){
          const result = errorHandler(ref_error);
          return res.json(result);
        }
        if (!exist){
          const result = errorHandler(user_exist_err);
          return res.json(result);
        }
      }

      const result = user[0] === 0 && userRole[0] === 0 ? errorHandler(nothing_updated) :
        successHandler(user_update, user)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static updateDriver = async (req, res, next) => {
    try {
      const {
        id, status, rating, carMake, carModel, carColor,
        carYear, carPassengersSeat, carNumber, state, orderType, orderId
      } = req.body;
      await Validate(req.body, {
        id: 'integer|required',
        status: 'string|alphaDash',
        rating: 'string|alphaDash',
        carMake: 'string|alphaDash',
        carModel: 'string|alphaDash',
        carColor: 'string|alpha',
        carYear: 'integer',
        carPassengersSeat: 'string|alphaDash',
        carNumber: 'string|alphaDash',
        state: 'string|alphaDash',
        orderType: 'string|alphaDash',
        orderId: 'string|alphaDash',
      })
      let update = {};
      if (status){
        update.status = status
      }
      if (rating){
        update.rating = rating
      }

      const driver = await Driver.update({...update}, {where: {id}});

      const ds = await DriverState.findOne({where: {driverId: id}})
      let newOrderType, newOrderId, driverState;
      if (state && state !== 'available' && ds.state !== 'available'){
        newOrderType = orderType;
        newOrderId = orderId;
      }

      if (_.isEmpty(ds)){
        driverState = await DriverState.create({
          state: state ? state : 1, orderType: newOrderType, orderId: newOrderId, driverId: id
        });
      } else{
        driverState = await DriverState.update({
          state: state ? state : ds.state,
          orderType: orderType ? newOrderType : ds.orderType,
          orderId: orderId ? newOrderId : ds.orderId
        }, {
          where: {id: ds.id}
        });
      }

      let car;
      if (driver){
        let carUpdate = {};
        if (carMake){
          carUpdate.make = carMake
        }
        if (carModel){
          carUpdate.model = carModel
        }
        if (carColor){
          carUpdate.color = carColor
        }
        if (carYear){
          carUpdate.year = carYear
        }
        if (carPassengersSeat){
          carUpdate.passengersSeat = carPassengersSeat
        }
        if (carNumber){
          carUpdate.number = carNumber
        }
        car = await Car.update({...carUpdate}, {where: {driverId: id}});
      }

      const result = successHandler(driver_update, {driver, car, driverState} || [])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static updatePartner = async (req, res, next) => {
    try {
      const {id, name, user, branchId, address, country, city, isGeneral, coords} = req.body;
      await Validate(req.body, {
        id: 'integer|required',
        name: 'string|alpha',
        user: 'integer',
        branchId: 'integer',
        address: 'string|alphaDash',
        country: 'integer',
        city: 'integer',
        isGeneral: 'boolean',
        coords: 'array',
      })

      let update = {};
      if (name){
        update.name = name
      }
      if (user){
        update.userId = user
      }
      const partner = await Partner.update({...update}, {where: {id}});

      let updateBranch = {};
      if (address){
        updateBranch.address = address
      }
      if (country){
        updateBranch.countryId = country
      }
      if (city){
        updateBranch.cityId = city
      }
      if (isGeneral){
        updateBranch.isGeneral = isGeneral
      }
      if (coords && coords[0] && coords[1]){
        updateBranch.coords = coords
      }
      const partnerBranch = await PartnerBranch.update({...updateBranch}, {
        where: {id: branchId, partnerId: id}
      });

      const result = partner[0] === 0 && partnerBranch[0] === 0 ?
        errorHandler(nothing_updated, {partner, partnerBranch}) :
        successHandler(partner_update, {partner, partnerBranch});
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static deleteUser = async (req, res, next) => {
    try {
      const {id} = req.params;
      await Validate(req.params, {
        id: 'required|integer',
      })

      let user;
      if (+req.role === 1){
        user = await Users.update({
          deleted: true,
        }, {
          where: {id, deleted: false},
          limit: 1
        });
      }
      if (+req.role === 2){
        user = await Users.update({
          deleted: true,
        }, {
          where: {id, deleted: false, role: {$ne: 1}},
          limit: 1
        });
      }

      const result = successHandler(user_delete, user[0])
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static deleteDriver = async (req, res, next) => {
    try {
      const {id} = req.params;
      await Validate(req.params, {
        id: 'required|integer',
      })

      let driver;
      if (+req.role === 1){
        driver = await Driver.destroy({
          where: {id,},
          limit: 1
        });
      }
      if (+req.role === 2){
        driver = await Driver.destroy({
          where: {id, role: {$ne: 1}},
          limit: 1
        });
      }

      const result = successHandler(driver_delete, driver)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  static deletePartner = async (req, res, next) => {
    try {
      const {id} = req.params;
      await Validate(req.params, {
        id: 'required|integer',
      })

      const partner = await Partner.destroy({
        where: {id},
        limit: 1
      });

      const result = successHandler(partner_delete, partner)
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

}

module.exports = AdminController;
