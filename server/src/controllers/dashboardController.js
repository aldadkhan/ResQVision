const Report = require('../models/Report');
const User = require('../models/User');
exports.stats = async (_req,res,next) => {
  try {
    const [totalReports,pending,rescued,totalUsers,byStatus] = await Promise.all([
      Report.countDocuments(),Report.countDocuments({status:{$in:['submitted','reviewing','assigned']}}),
      Report.countDocuments({status:'rescued'}),User.countDocuments(),
      Report.aggregate([{$group:{_id:'$status',count:{$sum:1}}}])
    ]);
    res.json({totalReports,pending,rescued,totalUsers,byStatus});
  } catch(e){next(e);}
};
exports.rescueTeams = async (_req,res,next) => {
  try {
    const teams = await User.find({role:'rescuer_pending'}).select('name email createdAt').sort({createdAt:1});
    res.json({teams});
  } catch(e){next(e);}
};
exports.approveRescueTeam = async (req,res,next) => {
  try {
    const user = await User.findOneAndUpdate(
      {_id:req.params.id,role:'rescuer_pending'},
      {role:'rescuer'},
      {new:true,runValidators:true}
    ).select('name email role');
    if (!user) return res.status(404).json({message:'Pending rescue-team application not found'});
    res.json({user});
  } catch(e){next(e);}
};
exports.declineRescueTeam = async (req,res,next) => {
  try {
    const user = await User.findOneAndUpdate(
      {_id:req.params.id,role:'rescuer_pending'},
      {role:'user'},
      {new:true,runValidators:true}
    ).select('name email role');
    if (!user) return res.status(404).json({message:'Pending rescue-team application not found'});
    res.json({user});
  } catch(e){next(e);}
};
