const { ZodError } = require("zod");

module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issues = result.error.issues ?? [];

    return res.status(400).json({
      success: false,
      message: issues[0]?.message || "Validation failed",
    });
  }

  req.validatedData = result.data;
  next();
};