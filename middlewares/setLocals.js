module.exports = (req, res, next) => {
  res.locals.title = 'NexaBid';
  res.locals.user = req.user || null;
  res.locals.admin = req.admin || null;
  next();
};
