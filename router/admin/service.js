const express = require('express');
const router = express.Router();

// Controllers
const ServiceController = require('../../controllers/ServiceController');
const xApiKey = require("../../middlewares/apiKey");
const userType = require("../../middlewares/permission");

//GET
router.get('/service', userType['validateOperator'], xApiKey, ServiceController.getServices);
router.get('/ticket', userType['validateOperator'], xApiKey, ServiceController.getTickets);

//POST
router.post('/service', userType['validateOperator'], xApiKey, ServiceController.createService);
router.post('/ticket', userType['validateOperator'], xApiKey, ServiceController.createTicket);

//PUT
router.put('/service', userType['validateOperator'], xApiKey, ServiceController.updateService);
router.put('/ticket', userType['validateOperator'], xApiKey, ServiceController.updateTicket);

//DELETE
router.delete('/service/:id', userType['validateAdmin'], xApiKey, ServiceController.deleteService);
router.delete('/ticket/:id', userType['validateAdmin'], xApiKey, ServiceController.deleteTicket);

module.exports = router;
