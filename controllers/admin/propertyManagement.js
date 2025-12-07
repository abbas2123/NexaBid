
const propertyService = require('../../services/admin/propertyService')
const statusCode = require('../../utils/statusCode');


exports.getAllProperties = async (req, res) => {
  try {
    const properties = await propertyService.getAllProperties();

    res.render("admin/propertyManagement", {
      layout: "layouts/admin/adminLayout",
      properties,
      currentPage: "property-management"
    });

  } catch (err) {
    console.error("Error loading properties:", err);
    res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};


//
// GET DETAILS
//
exports.getPropertyDetails = async (req, res) => {
  try {
    const property = await propertyService.getPropertyDetails(req.params.id);

    if (!property) {
      return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Property not found" });
    }

    res.json({ success: true, property });

  } catch (err) {
    console.error("DETAIL FETCH ERROR:", err);
    res.status(statusCode.INTERNAL_ERROR).json({ success: false, message: "Server Error" });
  }
};



//
// APPROVE PROPERTY
//
exports.approveProperty = async (req, res) => {
  try {
    const serviceResponse = await propertyService.approvePropertyService(
      req.params.id,
      req.admin.id,
      req.body.approveMessage,
     req.app.get("io")
    );

    if (!serviceResponse) {
      return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Invalid property ID" });
    }

    res.json({ success: true, message: "Property approved & published" });

  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(statusCode.INTERNAL_ERROR).json({ success: false, message: "Server Error" });
  }
};



//
// REJECT PROPERTY
//
exports.rejectProperty = async (req, res) => {
  try {
    const serviceResponse = await propertyService.rejectPropertyService(
      req.params.id,
      req.admin.id,
      req.body.rejectionMessage,
      req.app.get("io")
    );

    if (!serviceResponse) {
      return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Invalid property ID" });
    }

    res.json({ success: true, message: "Property rejected" });

  } catch (err) {
    console.error("REJECT ERROR:", err);
    res.status(statusCode.INTERNAL_ERROR).json({ success: false, message: "Server Error" });
  }
};