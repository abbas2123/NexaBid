require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const passport = require("./config/passport");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const nocache = require("nocache");
const landingRoute = require("./routes/user/landing");
const authRoute = require("./routes/user/authRoute");
const authVender = require("./routes/vendor/venderRoute");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/errorHandler");
const adminRoute = require("./routes/admin/authRoute");
const profileRoute = require("./routes/user/userProfile");
const fileRoute = require("./routes/admin/fileRoute");
const authProperty = require('./routes/user/property');
const authTender = require("./routes/user/tender");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
const auctionUpdates = require("./cron/auctionUpdate");

cron.schedule("*/1 * * * *", auctionUpdates);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User joined room: ${userId}`);
  });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.use(cookieParser());

app.use(nocache());

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✔"))
  .catch((err) => console.error("MongoDB connection error ❌", err));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: "mySecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

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

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    return res.status(429).render("error", {
      layout: "layouts/user/userLayout",
      message: "⚠️ Too many requests. Please wait 1 minute and try again.",
    });
  },
});

app.use(limiter);

app.use("/", landingRoute);
app.use("/auth", authRoute);
app.use("/vendor", authVender);
app.use("/admin", adminRoute);
app.use("/admin/file", fileRoute);
app.use("/user", profileRoute);
app.use("/properties", authProperty);
app.use("/tenders", authTender);
app.use("/search", require("./routes/user/search"));
app.use("/notifications", require("./routes/user/notification"));
app.use('/admin/property-management',require('./routes/admin/propertyRoute'));
app.use('/user/status',require('./routes/user/status'));
app.use('/user/status',require('./routes/user/myProfile'));
app.use('/admin/tender-management',require('./routes/admin/tenderRoute'));





app.use((req, res) => {
  console.log("wevdvd",req.user)
  res.status(404).render("error", {
    layout: 'layouts/user/userLayout',
    message: "The page you are looking for does not exist.",
  
  });
});
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on`);
  console.log(`➡ Local:   http://localhost:${PORT}`);
});
