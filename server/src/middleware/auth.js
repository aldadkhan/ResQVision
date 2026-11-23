const jwt = require('jsonwebtoken');
const User = require('../models/User');
exports.protect = async (req,res,next) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i,'');
    if (!token) return res.status(401).json({message:'Authentication required'});
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.id).select('-password');
    if (!req.user) return res.status(401).json({message:'Account not found'});
    next();
  } catch { return res.status(401).json({message:'Invalid or expired token'}); }
};
exports.allowRoles = (...roles) => (req,res,next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({message:'You do not have permission for this action'});
  next();
};
