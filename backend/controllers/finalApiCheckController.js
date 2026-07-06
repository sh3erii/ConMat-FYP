const finalApiConnectionService = require('../services/finalApiConnectionService');
const { successResponse } = require('../utils/apiResponse');

const ping = (req, res) => {
  res.status(200).json(finalApiConnectionService.getPing());
};

const modules = (req, res) => {
  res.status(200).json(finalApiConnectionService.getModuleReadiness());
};

const validationChecklist = (req, res) => {
  res.status(200).json(finalApiConnectionService.getValidationChecklist());
};

const echoValidation = (req, res) => {
  return successResponse(res, 'Validation middleware test passed', { body: req.body });
};

module.exports = { ping, modules, validationChecklist, echoValidation };
