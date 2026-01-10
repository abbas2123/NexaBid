

const Tender = require('../../models/tender');

exports.getAllTenders = async (page, filter) => {
  const limit = 10;
  const query = {};

  if (filter.status?.trim()) {
    query.status = filter.status.trim();
  }

  if (filter.search?.trim()) {
    const keyword = filter.search.trim();
    query.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { dept: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
    ];
  }

  const total = await Tender.countDocuments(query);

  const tenders = await Tender.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('createdBy', 'name email')
    .lean();

  return {
    tenders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasPrevPage: page > 1,
      hasNextPage: page * limit < total,
    },
  };
};

exports.getTenderById = async (id) => {
  return Tender.findById(id)
    .populate('createdBy', 'name email phone')
    .populate('files.fileId')
    .lean();
};

exports.updateTenderStatus = async (id, status, comment) => {
  const tender = await Tender.findById(id);
  if (!tender) return null;

  tender.status = status;
  if (comment?.trim()) tender.adminComment = comment.trim();
  await tender.save();

  return tender;
};
