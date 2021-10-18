const express = require('express');
const router = express.Router();

const admin = require('./admin/admin')
const location = require('./admin/location')
const service = require('./admin/service')
const statistics = require('./admin/statistics')

router.use('/', admin);
router.use('/', location);
router.use('/', service);
router.use('/', statistics);

module.exports = router;
