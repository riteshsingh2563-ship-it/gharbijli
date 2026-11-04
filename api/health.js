const { handleApiRequest } = require('../backend/api');

module.exports = async (req, res) => {
  req.url = '/api/health';
  await handleApiRequest(req, res);
};
