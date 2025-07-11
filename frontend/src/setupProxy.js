const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
}; 