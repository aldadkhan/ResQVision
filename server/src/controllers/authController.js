const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isValidEmail, isValidName, isStrongPassword } = require('../utils/accountValidation');
const tokenFor = id => jwt.sign({id}, process.env.JWT_SECRET, {expiresIn:'7d'});
exports.register = async (req,res,next) => {
  try {
    const {name,email,password,phone,accountType='community'} = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!isValidName(normalizedName)) return res.status(400).json({message:'Name must contain letters and spaces only'});
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({message:'Enter a valid email address'});
    if (!isStrongPassword(password)) return res.status(400).json({message:'Password must be at least 8 characters and include a letter, a number and a special character'});
    if (!['community','rescue_team'].includes(accountType)) return res.status(400).json({message:'Invalid account type'});
    if (await User.findOne({email:normalizedEmail})) return res.status(409).json({message:'An account with this email already exists'});
    const user = await User.create({
      name:normalizedName,email:normalizedEmail,password:await bcrypt.hash(password,12),phone,
      role:accountType === 'rescue_team' ? 'rescuer_pending' : 'user'
    });
    res.status(201).json({token:tokenFor(user.id),user:{id:user.id,name:user.name,email:user.email,role:user.role}});
  } catch(e){next(e);}
};
exports.login = async (req,res,next) => {
  try {
    const {email,password} = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await User.findOne({email:normalizedEmail});
    if (!user || !await bcrypt.compare(password||'',user.password)) return res.status(401).json({message:'Incorrect email or password'});
    res.json({token:tokenFor(user.id),user:{id:user.id,name:user.name,email:user.email,role:user.role}});
  } catch(e){next(e);}
};
exports.me = (req,res) => {
  res.json({user:{id:req.user.id,name:req.user.name,email:req.user.email,role:req.user.role}});
};
