const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const compression = require("compression");
const helmet = require("helmet");
const createError = require("http-errors");

const serverHost = require("./middlewares/serverHost");
const headers = require("./middlewares/headers");
const authorization = require("./middlewares/authorization");

const app = express();

app.use(helmet());
app.use(compression());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(headers);
app.use(serverHost);
app.use(authorization);
app.set(`trust proxy`, 1);
app.disable('x-powered-by');

app.use("/", require('./router/index'));

app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  req.app.get('env') === 'development' ?
    res.json({
      status: false,
      message: err.errors ? err.errors : err.message,
      data: null,
    }) : res.json({
      status: false,
      message: err.errors ? err.errors : err.message,
      data: null,
    });
});

module.exports = app;
