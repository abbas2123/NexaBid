module.exports = (req, res, next) => {
  res.locals.title = 'NexaBid';
  res.locals.user = req.user || null;
  next();
};
