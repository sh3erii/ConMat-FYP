const integrationHealthService = require('../services/integrationHealthService');
const backendSmokeTestService = require('../services/backendSmokeTestService');

const ping = (req, res) => {
  res.status(200).json(integrationHealthService.getPing());
};

const modules = (req, res) => {
  res.status(200).json(integrationHealthService.getModuleReadiness());
};

const smoke = async (req, res, next) => {
  try {
    const result = await backendSmokeTestService.runSmokeTests();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { ping, modules, smoke };
