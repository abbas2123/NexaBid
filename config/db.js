const mongoose = require('mongoose');
module.exports = async () => {
  if (process.env.NODE_ENV === 'test' && !process.env.MONGO_URI) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (err) {
    console.error('MongoDB connection failed ❌', err);
    process.exit(1);
  }
};
