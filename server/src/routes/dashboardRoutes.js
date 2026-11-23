const router=require('express').Router();
const {protect,allowRoles}=require('../middleware/auth');
const {stats,rescueTeams,approveRescueTeam,declineRescueTeam}=require('../controllers/dashboardController');
router.get('/stats',protect,allowRoles('admin','rescuer'),stats);
router.get('/rescue-teams',protect,allowRoles('admin'),rescueTeams);
router.patch('/rescue-teams/:id/approve',protect,allowRoles('admin'),approveRescueTeam);
router.patch('/rescue-teams/:id/decline',protect,allowRoles('admin'),declineRescueTeam);
module.exports=router;
