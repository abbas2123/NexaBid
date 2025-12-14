const tenderCreationService = require('../../services/tender/tenderCreation');
const statusCode = require('../../utils/statusCode')

exports.getCreateTenderPage = async(req,res)=>{
    try {
        res.render('vendor/tenderCreate',{
            layout:'layouts/user/userLayout',
            title: "Create Tender",
            user:req.user,
             tender: null, // IMPORTANT!
      files: [], 
        })
    } catch (error) {
console.log("Create Tender Page Error:", error);
    return res.status(500).render("error", {
      layout: "layouts/user/userLayout",
      message: "Error loading tender page",
    });
    }
}
exports.createTenderController = async (req, res) => {
  try {
    const tender = await tenderCreationService.creatTenderService(
      req.user,
      req.body,
      req.files || []
    );

    return res.status(201).json({
      success: true,
      message: "Tender created successfully",
      tenderId: tender._id,
    });

  } catch (err) {
    console.error("Tender creation error:", err);
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }
};
