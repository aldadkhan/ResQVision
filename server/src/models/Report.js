const mongoose = require('mongoose');
const reportSchema = new mongoose.Schema({
  reporter:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  animalType:{type:String,required:true},
  description:{type:String,required:true,maxlength:1200},
  imageUrl:{type:String,default:''},
  imageKey:{type:String,default:''},
  location:{type:String,default:'Location not provided'},
  coordinates:{lat:Number,lng:Number},
  suspectedFindings:[String],
  screeningNote:{type:String,default:'Preliminary image screening only; not a veterinary diagnosis.'},
  priority:{type:String,enum:['low','normal','urgent','emergency'],default:'normal'},
  emergency:{type:Boolean,default:false},
  rescueRequested:{type:Boolean,default:false},
  injuryType:{type:String,default:'Unknown'},
  firstAid:{type:mongoose.Schema.Types.Mixed,default:null},
  aiScreening:{type:mongoose.Schema.Types.Mixed,default:null},
  status:{type:String,enum:['submitted','reviewing','assigned','pending_rescue','rescued','closed'],default:'submitted'},
  assignedTo:{type:String,default:''},
  rescueUpdates:[{
    message:{type:String,required:true,maxlength:600},
    by:{type:String,default:'Rescue team',maxlength:80},
    createdAt:{type:Date,default:Date.now}
  }]
},{timestamps:true});
reportSchema.index({createdAt:-1});
reportSchema.index({updatedAt:-1});
reportSchema.index({reporter:1,createdAt:-1});
module.exports = mongoose.model('Report', reportSchema);
