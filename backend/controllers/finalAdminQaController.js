const finalAdminQaService = require('../services/finalAdminQaService');

const checklist = (req, res) => {
  res.status(200).json(finalAdminQaService.getFinalChecklist());
};

const issues = async (req, res, next) => {
  try {
    const result = await finalAdminQaService.listIssues();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createIssue = async (req, res, next) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ success: false, message: 'Issue title is required' });
    }
    const result = await finalAdminQaService.createIssue(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { checklist, issues, createIssue };
