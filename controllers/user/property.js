const propertyService = require("../../services/property/propertyService.js");

exports.getPropertyPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const { properties, pagination } =
      await propertyService.getProperties(page);

    res.render("user/property", {
      layout: "layouts/user/userLayout",
      user: req.user,
      properties,
      pagination,
    });

  } catch (error) {
    console.error("Property page error:", error);
    res.status(500).send("Server Error");
  }
};

exports.getPropertyDetails = async (req, res) => {
  try {
    const id = req.params.id;

    const property = await propertyService.getPropertyDetails(id);

     if (!property) {
      return res.status(404).render("error", { message: "Property not found" });
    }

    res.render("user/propertyDetailsPage", {
      layout: "layouts/user/userLayout",
      user: req.user,
      property
    });

  } catch (err) {
    console.error('server err',err)
    res.status(500).send("Server Error");
  }
};