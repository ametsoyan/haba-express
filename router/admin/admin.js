const express = require('express');
const router = express.Router();

// Controllers
const AdminController = require('../../controllers/AdminController');
const userType = require("../../middlewares/permission");
const {limiter, SpeedLimiter} = require("../../config/limiters");
const xApiKey = require("../../middlewares/apiKey");

//POST
router.post('/admin/login', limiter, SpeedLimiter, xApiKey, AdminController.adminLogin);
router.post('/admin/checkAdminLogin', limiter, SpeedLimiter, xApiKey, AdminController.checkAdminLogin);
router.post('/reset/token', limiter, SpeedLimiter, xApiKey, AdminController.resetToken);
router.post('/user', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.createUser);
router.post('/user/driver', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.createDriver);
router.post('/partner', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.createPartner);

//GET
router.get('/user', userType['validateOperator'], xApiKey, AdminController.getUsers);
router.get('/user/driver', userType['validateOperator'], xApiKey, AdminController.getDriver);
router.get('/partner', userType['validateOperator'], xApiKey, AdminController.getPartners);

//PUT
router.put('/user', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.updateUser);
router.put('/user/driver', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.updateDriver);
router.put('/partner', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.updatePartner);

//DELETE
router.delete('/user/:id', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.deleteUser);
router.delete('/user/driver/:id', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.deleteDriver);
router.delete('/partner/:id', userType['validateOperator'], limiter, SpeedLimiter, xApiKey, AdminController.deletePartner);

module.exports = router;
