const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const hasAwsConfiguration = [bucket, region, accessKeyId, secretAccessKey].some(Boolean);

if (hasAwsConfiguration && (!bucket || !region)) {
  throw new Error('AWS_S3_BUCKET and AWS_REGION must both be set to enable S3 image storage.');
}
if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
  throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be configured together.');
}

const isS3Enabled = Boolean(bucket);
const s3 = isS3Enabled ? new S3Client({ region }) : null;
const imageExtensions = {'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};

async function storeReportImage(file) {
  if (!isS3Enabled) {
    return {imageUrl:`/uploads/${file.filename}`,imageKey:''};
  }
  if (!file.buffer) throw new Error('S3 image uploads require the in-memory file buffer.');
  const imageKey = `reports/${crypto.randomBytes(24).toString('hex')}${imageExtensions[file.mimetype]}`;
  await s3.send(new PutObjectCommand({
    Bucket:bucket,
    Key:imageKey,
    Body:file.buffer,
    ContentType:file.mimetype
  }));
  return {imageUrl:'',imageKey};
}

async function deleteReportImage(imageKey) {
  if (!isS3Enabled) throw new Error('S3 image storage is not configured.');
  await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:imageKey}));
}

async function reportForClient(report) {
  const value = typeof report.toObject === 'function' ? report.toObject() : {...report};
  if (value.imageKey) {
    if (!isS3Enabled) throw new Error('AWS S3 settings are required to serve this report image.');
    value.imageUrl = await getSignedUrl(s3, new GetObjectCommand({Bucket:bucket,Key:value.imageKey}), {expiresIn:3600});
  }
  delete value.imageKey;
  return value;
}

module.exports = { isS3Enabled, storeReportImage, deleteReportImage, reportForClient };
