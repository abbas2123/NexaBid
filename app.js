require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const passport = require("./config/passport");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const nocache = require('nocache');
const landingRoute = require("./routes/user/landing");
const authRoute = require('./routes/user/authRoute');
const authVender = require('./routes/vendor/venderRoute');
const cookieParser = require("cookie-parser");
const errorHandler = require('./middlewares/errorHandler');
const adminRoute = require('./routes/admin/authRoute')

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.use(cookieParser());
app.use(errorHandler);
app.use(nocache());


app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✔"))
  .catch(err => console.error("MongoDB connection error ❌", err));


  app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(session({
  secret: "mySecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));


app.use(passport.initialize());
app.use(passport.session());


app.use(async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).lean();
    }
  } catch (err) {
    req.user = null;
  }
  next();
});


app.use((req, res, next) => {
  res.locals.title = "NexaBid";
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.user || null; 
  next();
});


app.use("/", landingRoute);
app.use('/auth',authRoute);
app.use('/vendor',authVender);
app.use('/admin',adminRoute)


app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});