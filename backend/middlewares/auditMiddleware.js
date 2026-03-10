const { AuditLog } = require('../models/index');

const audit = (action, entity) => async (req, res, next) => {
  const originalSend = res.json.bind(res);
  res.json = (body) => {
    if (body && body.success && req.user) {
      AuditLog.create({
        user_id: req.user.id,
        action,
        entity,
        entity_id: req.params.id || (body.data && body.data.id),
        new_values: req.body,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }).catch(() => {});
    }
    return originalSend(body);
  };
  next();
};

module.exports = audit;
