const mongoose = require('mongoose');
module.exports = async () => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected ✔');
  } catch (err) {
    console.error('MongoDB connection failed ❌', err);
    process.exit(1);
  }
};
