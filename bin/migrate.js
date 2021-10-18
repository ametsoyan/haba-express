const Users = require("../models/user");
const Roles = require("../models/roles");
const Referrals = require("../models/referrals");
const Driver = require("../models/driver");
const DriverState = require("../models/driverState");
const Car = require("../models/car");
const Country = require("../models/country");
const City = require("../models/city");
const Route = require("../models/route");
const Partner = require("../models/partner");
const PartnerBranch = require("../models/partnerBranch");
const Service = require("../models/service");
const ServiceDetails = require("../models/serviceDetails");
const Ticket = require("../models/ticket");
const Passenger = require("../models/passenger");
const Cargo = require("../models/cargo");
const PayDetails = require("../models/payDetails");

async function main() {
  const models = [
    Roles,
    Users,
    Referrals,
    Partner,
    PartnerBranch,
    Driver,
    DriverState,
    Car,
    Country,
    City,
    Route,
    Service,
    ServiceDetails,
    Ticket,
    Passenger,
    Cargo,
    PayDetails,
  ]

  for ( const i in models ){
    if (models.hasOwnProperty(i)){
      console.log('--->', i)
      await models[i].sync({alter: true});
    }
  }
  process.exit();
}

main().then(r => console.log(r-- > 'Done')).catch(e => console.log(e));
