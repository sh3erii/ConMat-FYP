const finalBackendReadinessService = require('../services/finalBackendReadinessService');

function health(req, res) {
  res.status(200).json(finalBackendReadinessService.getHealth());
}

function modules(req, res) {
  res.status(200).json(finalBackendReadinessService.getModules());
}

function databasePlan(req, res) {
  res.status(200).json(finalBackendReadinessService.getDatabasePlan());
}

module.exports = {
  health,
  modules,
  databasePlan,
};
