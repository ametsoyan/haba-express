const jwt = require('jsonwebtoken');
const httpError = require('http-errors');
const {not_auth} = require("../utils/resMessage");
const {JWT_SECRET} = process.env;

const EXCLUDE = [
  ['/admin/login', ['POST', 'GET']],
  ['/admin/checkAdminLogin', ['POST', 'GET']],
  ['/reset/token', ['POST', 'GET']],
];

function authorization(req, res, next) {
  try {
    const {authorization} = req.headers;
    const {path, method} = req;
    for ( let i = 0; i < EXCLUDE.length; i++ ){
      if ((EXCLUDE[i][0] === path && EXCLUDE[i][1].includes(method)) || method === 'OPTIONS'){
        next();
        return;
      }
    }
    let token;
    if (authorization){
      token = authorization.replace('Bearer ', '');
    } else{
      throw httpError(401, not_auth);
    }
    jwt.verify(token, JWT_SECRET, (err, data) => {
      if (!err){
        req.userId = data.userId;
        req.role = data.role;
        next();
      } else{
        throw httpError(401, not_auth);
      }
    });
  } catch (e) {
    next(e);
  }
}

module.exports = authorization;
