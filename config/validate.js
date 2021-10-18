const {Validator} = require('node-input-validator');
const httpErrors = require('http-errors');
const _ = require('lodash');
const {errorHandler} = require("../utils/responseHandlers");

async function Validate(inputs, rules, regex, mobile, customError, messages) {
  let v = new Validator(inputs, rules, messages);
  if (!await v.check() || inputs.password){
    const errors = {};
    _.forEach(regex, (value, key) => {
      if (key === 'phone' && !/^(374|\+374|0|)?(\d{2})(\d{2})(\d{2})(\d{2})$/.test(value)){
        errors.phone = 'Please enter a valid phone number (+374|374|0)+8 numbers';
      }
    });

    (function checkForm(input) {
      let re;
      if (input.password){
        if (input.password === input.email){
          errors['password'] = 'Password must be different from Username!';
          return false;
        }
        re = /[0-9]/;
        if (!re.test(input.password)){
          errors['password'] = 'Password must contain at least one number (0-9)!';
          return false;
        }
        re = /[a-z]/;
        if (!re.test(input.password)){
          errors['password'] = 'Password must contain at least one lowercase letter (a-z)!';
          return false;
        }
        re = /[A-Z]/;
        if (!re.test(input.password)){
          errors['password'] = 'Password must contain at least one uppercase letter (A-Z)!';
          return false;
        }
        re = /[<>{}]/;
        if (re.test(input.password)){
          errors['password'] = 'Password can\'t contain this special character (<,>,{,})';
          return false;
        }
        return true;
      }
      return true;
    })(inputs);

    _.forEach(v.errors, (e, k) => {
      errors[k] = e.message || e;
    });
    v.errors = errors;
    if (customError){
      v = customError(v);
    }

    if (!_.isEmpty(v.errors)){
      if (mobile){
        return errorHandler(v.errors);
      }
      throw httpErrors(422, v)
    }
  }
}

module.exports = Validate;
