const router=require('express').Router();
const multer=require('multer');
const path=require('path');
const crypto=require('crypto');
const {protect,allowRoles}=require('../middleware/auth');
const c=require('../controllers/reportController');
const {getFirstAid}=require('../services/firstAid');
const {isS3Enabled}=require('../services/reportImageStorage');
const storage=isS3Enabled?multer.memoryStorage():multer.diskStorage({
 destination:(req,file,cb)=>cb(null,path.join(__dirname,'../../',process.env.UPLOAD_DIR||'uploads')),
 filename:(req,file,cb)=>cb(null,crypto.randomBytes(12).toString('hex')+path.extname(file.originalname).toLowerCase())
});
const upload=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.mimetype)) return cb(new Error('Only JPG, PNG and WEBP images are allowed'));
 cb(null,true);
}});
router.use(protect);
router.get('/',c.list);
router.get('/stream',allowRoles('admin','rescuer'),c.stream);
router.post('/first-aid', async (req,res,next)=>{try{const guidance=await getFirstAid(req.body.description,req.body.emergency);res.json({guidance});}catch(e){next(e);}});
router.post('/',upload.single('image'),c.create);
router.get('/:id',c.getOne);
router.patch('/:id/status',allowRoles('admin','rescuer'),c.updateStatus);
module.exports=router;
