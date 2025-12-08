const Tender = require('../../models/tender');
const path = require('path');
const File = require('../../models/File');
const crypto = require('crypto');
const fs = require('fs');


exports.creatTenderService = async (user,body,files)=>{
    if(!user||user.role!=='vendor'||!user.isVendor){
        throw new Error('Only Verified Vendor Can Create A Tender');
    };


if (!body.title) throw new Error("Tender title is required");
if (!body.dept) throw new Error("Department is required");
if (!body.category) throw new Error("Category is required");
if (!body.bidEndAt) throw new Error("Bid end date is required");

 const globalChecksums = await File.find({ relatedType: "tender" })
  .then(files => files.map(f => f.checksum));

let existingTenderChecksums = [];

let existingTender = null;

if (body.tenderId) { 
  existingTender = await Tender.findById(body.tenderId).populate("files.fileId");

  if (existingTender?.files?.length > 0) {
    existingTenderChecksums = existingTender.files.map(f => f.fileId.checksum || null);
  }
}

const existingFileSums = [...globalChecksums, ...existingTenderChecksums];


  let fileRefsTosave = [];

  if(files&&files.length>0){
    for(let file of files){
        const filePath = path.join(__dirname,'../../uploads/tender-docs',file.filename);

        const fileBuffer = fs.readFileSync(filePath);
        const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');


        if(existingFileSums.includes(checksum)){
            console.log('duplicate document detected',file.filename);

            fs.unlinkSync(filePath);
            throw new Error('Duplicate Tender Document! Upload unique files.');
        }

        existingFileSums.push(checksum);

const fileDoc = await File.create({
    ownerId: user._id,
    relatedType: "tender",
     relatedId:null,
    fileName: file.filename,
    fileUrl:`/uploads/tender-docs/${file.filename}`,
    mimeType: file.mimetype,
    checksum,
    size: file.size,
});
fileRefsTosave.push({
    fileId: fileDoc._id,
    originalName: file.originalname,
    size: file.size
  });
    }
  }

     const tender = await Tender.create({
    title: body.title,
    dept: body.dept,
    category: body.category,
    description: body.description || null,
    createdBy: user._id,   
    eligibility: {
      categories: body.eligibilityCategories ? body.eligibilityCategories.split(",") : [],
      minGrade: body.eligibilityGrade || null
    },
    type: body.type || "open",
    emdAmount: body.emdAmount || null,
    docFee: body.docFee || null,
    publishAt: body.publishAt || new Date(),
    bidStartAt: body.bidStartAt || null,
    bidEndAt: body.bidEndAt,
    techOpenAt: body.techOpenAt || null,
    finOpenAt: body.finOpenAt || null,
    status: "draft",
    files: fileRefsTosave, 
  });
  await File.updateMany(
    { _id: { $in: fileRefsTosave.map(f => f.fileId) } },
    { $set: { relatedId: tender._id } }
  );


return tender;

}