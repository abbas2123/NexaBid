const User = require("../../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Property = require("../../models/property");
const Tender = require("../../models/tender");
const vendorApplication = require("../../models/vendorApplication");

exports.adminLogin = async (email, password) => {
  const admin = await User.findOne({ email, role: "admin" });
  if (!admin) throw new Error("Admin not found");

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) throw new Error("Invalid credentials");

  const token = jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  return {
    token,
    admin,
  };
};

exports.getDashboardStats = async () => {
  try {
    const pendingVendor = await vendorApplication.countDocuments({
      status: "pending",
    });

    const pendingProperties = await Property.countDocuments({
      verificationStatus: "pending",
    });

    const activeTender = await Tender.countDocuments({
      status: "published",
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    const weeklyUsers = [];
    for (let i = 0; i < 4; i++) {
      const start = new Date();
      start.setDate(start.getDate() - 7 * (i + 1));

      const end = new Date();
      end.setDate(end.getDate() - 7 * i);

      const count = await User.countDocuments({
        createdAt: { $gte: start, $lt: end },
      });

      weeklyUsers.unshift(count);
    }

    // Weekly Tender Stats
    const weeklyTenders = [];
    for (let i = 0; i < 4; i++) {
      const start = new Date();
      start.setDate(start.getDate() - 7 * (i + 1));

      const end = new Date();
      end.setDate(end.getDate() - 7 * i);

      const count = await Tender.countDocuments({
        createdAt: { $gte: start, $lt: end },
      });

      weeklyTenders.unshift(count);
    }
    return {
      pendingVendor,
      pendingProperties,
      activeTender,
      recentUsers,
      weeklyUsers,
      weeklyTenders,
    };
  } catch (err) {
    console.error("Dashboard service Error:", err);
    throw new Error("failed to load dashboard stats");
  }
};

exports.getRecentActivities = async () => {
  const lastUser = await User.findOne().sort({ createdAt: -1 });
  const lastProperty = await Property.findOne().sort({ createdAt: -1 });
  const lastTender = await Tender.findOne().sort({ createdAt: -1 });

  return [
    {
      title: "New User Registered",
      message: "User: " + (lastUser?.name || "No users"),
    },
    {
      title: "Property Listed",
      message: "Property: " + (lastProperty?.title || "No properties"),
    },
    {
      title: "Tender Created",
      message: "Tender: " + (lastTender?.title || "No tenders"),
    },
  ];
};

exports.getPendingTasks = async () => {
  const tasks = [];

  // Vendor Applications
  const vendors = await vendorApplication
    .find({ status: { $in: ["pending", "submitted"] } })
    .sort({ createdAt: -1 })
    .limit(1);

  vendors.forEach((v) => {
    tasks.push({
      task: "Vendor Application",
      name: v.businessName,
      status: "Pending",
      dueDate: v.createdAt.toISOString().split("T")[0],
      action: "/admin/vendor/" + v._id,
    });
  });

  // Properties Awaiting verification
  const properties = await Property.find({ verificationStatus: "pending" })
    .sort({ createdAt: -1 })
    .limit(5);

  properties.forEach((p) => {
    tasks.push({
      task: "Property Verification",
      name: p.title,
      status: "Pending",
      dueDate: p.createdAt.toISOString().split("T")[0],
      action: "/admin/property/" + p._id,
    });
  });

  // Tenders
  const tenders = await Tender.find({ status: "draft" })
    .sort({ createdAt: -1 })
    .limit(5);

  tenders.forEach((t) => {
    tasks.push({
      task: "Tender Finalization",
      name: t.title,
      status: "In Progress",
      dueDate: t.createdAt.toISOString().split("T")[0],
      action: "/admin/tender/" + t._id,
    });
  });

  return tasks;
};

exports.getAllUsers = async () => {
  return await User.find().sort({ createdAt: -1 });
};

exports.blockUser = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    { status: "blocked" },
    { new: true },
  );
};

exports.unblockUser = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    { status: "active" },
    { new: true },
  );
};
