const statusCode = require('../utils/statusCode');
module.exports = (schema) => (req, res, next) => {
  // Merge files into body for validation
  const dataToValidate = { ...req.body };
  if (req.files) {
    Object.assign(dataToValidate, req.files);
  } else if (req.file) {
    dataToValidate.file = req.file;
  }

  const result = schema.safeParse(dataToValidate);
  if (!result.success) {
    const issues = result.error.issues ?? [];
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: issues[0]?.message || 'Validation failed',
    });
  }
  req.validatedData = result.data;
  next();
};
