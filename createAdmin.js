const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/user");
require("dotenv").config();
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected"))
  .catch((err) => console.log(err));

async function createAdmin() {
  const hash = await bcrypt.hash("Admin@123", 10);

  const admin = new User({
    name: "Admin",
    email: "nexabid0@gmail.com",
    phone: false,
    passwordHash: hash,
    role: "admin",
    status: "active",
    twoFA: false,
    isVendor: false,
  });

  await admin.save();
  console.log("Admin Created Successfully!");
  process.exit();
}

createAdmin();
