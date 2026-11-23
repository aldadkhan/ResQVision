const Report = require('../models/Report');
const path = require('path');
const { getFirstAid } = require('../services/firstAid');
const { screenImage } = require('../services/visionScreening');
const { subscribe, publishReport } = require('../services/reportEvents');
exports.create = async (req,res,next) => {
  try {
    const {animalType,description,location,lat,lng,priority,emergency,injuryType} = req.body;
    if (!animalType || !description) return res.status(400).json({message:'Animal type and description are required'});
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    // Demo screening placeholder. Replace with validated model inference before production.
    const findings = imageUrl ? ['Image received for review'] : ['No image supplied'];
    const isEmergency = emergency === 'true' || emergency === true || priority === 'emergency';
    const report = await Report.create({
      reporter:req.user.id,animalType,description,location:location||'Location not provided',
      coordinates:lat && lng ? {lat:Number(lat),lng:Number(lng)} : undefined,
      imageUrl,suspectedFindings:findings,priority:isEmergency?'emergency':(priority||'normal'),
      emergency:isEmergency,rescueRequested:isEmergency,injuryType:injuryType||'Unknown'
    });
    publishReport({...report.toObject(),reporter:{_id:req.user.id,name:req.user.name,email:req.user.email}},'created');
    res.status(201).json({report,firstAid:report.firstAid,aiScreening:report.aiScreening,emergencyAcknowledged:isEmergency});
    Promise.all([req.file ? screenImage(req.file) : null, getFirstAid(description, isEmergency)])
      .then(async ([aiScreening, firstAid]) => {
        const enrichedReport = await Report.findByIdAndUpdate(report.id, {aiScreening, firstAid}, {new:true})
          .populate('reporter','name email');
        if (enrichedReport) publishReport(enrichedReport.toObject());
      })
      .catch(error => console.error(`Report enrichment failed for ${report.id}:`, error));
  } catch(e){next(e);}
};
exports.stream = (req,res) => {
  res.set({
    'Content-Type':'text/event-stream',
    'Cache-Control':'no-cache, no-transform',
    'Connection':'keep-alive',
    'X-Accel-Buffering':'no'
  });
  res.flushHeaders();
  const unsubscribe = subscribe(res);
  res.write('data: {"type":"ready"}\n\n');
  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'),25000);
  res.on('close',() => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};
exports.list = async (req,res,next) => {
  try {
    const filter = req.user.role === 'admin' || req.user.role === 'rescuer' ? {} : {reporter:req.user.id};
    if (req.query.since) {
      const since = new Date(req.query.since);
      if (Number.isNaN(since.getTime())) return res.status(400).json({message:'Invalid report update cursor'});
      filter.updatedAt = {$gte:since};
    }
    const reports = await Report.find(filter).populate('reporter','name email').sort({createdAt:-1}).lean();
    res.json({reports});
  } catch(e){next(e);}
};
exports.getOne = async (req,res,next) => {
  try {
    const report = await Report.findById(req.params.id).populate('reporter','name email');
    if (!report) return res.status(404).json({message:'Report not found'});
    if (!['admin','rescuer'].includes(req.user.role) && String(report.reporter._id) !== req.user.id) return res.status(403).json({message:'Access denied'});
    res.json({report});
  } catch(e){next(e);}
};
exports.updateStatus = async (req,res,next) => {
  try {
    const allowed = ['submitted','reviewing','assigned','pending_rescue','rescued','closed'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({message:'Invalid status'});
    const {assignedTo,reportMessage} = req.body;
    if (assignedTo !== undefined && (typeof assignedTo !== 'string' || assignedTo.length > 120)) {
      return res.status(400).json({message:'Invalid rescue-team assignment'});
    }
    if (reportMessage !== undefined && (typeof reportMessage !== 'string' || !reportMessage.trim() || reportMessage.length > 600)) {
      return res.status(400).json({message:'Progress reports must be between 1 and 600 characters'});
    }
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({message:'Report not found'});
    const previousStatus = report.status;
    const previousAssignment = report.assignedTo;
    report.status = req.body.status;
    if (assignedTo !== undefined) report.assignedTo = assignedTo.trim();
    const updates = [];
    if (previousStatus !== report.status) {
      const label = report.status.replace('_',' ');
      updates.push(`Status updated to ${label}.`);
    }
    if (previousAssignment !== report.assignedTo) {
      updates.push(report.assignedTo ? `Assigned to ${report.assignedTo}.` : 'Rescue-team assignment removed.');
    }
    if (reportMessage !== undefined) updates.push(reportMessage.trim());
    updates.forEach(message => report.rescueUpdates.push({message,by:req.user.name}));
    await report.save();
    await report.populate('reporter','name email');
    publishReport(report.toObject());
    res.json({report});
  } catch(e){next(e);}
};
