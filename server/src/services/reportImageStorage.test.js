const test = require('node:test');
const assert = require('node:assert/strict');
const { reportForClient, storeReportImage } = require('./reportImageStorage');

test('local uploads keep their existing API URL', async () => {
  const image = await storeReportImage({filename:'animal.jpg'});
  assert.deepEqual(image, {imageUrl:'/uploads/animal.jpg',imageKey:''});
});

test('local report responses omit storage keys', async () => {
  const report = await reportForClient({_id:'case-1',imageUrl:'/uploads/animal.jpg',imageKey:''});
  assert.equal(report.imageUrl, '/uploads/animal.jpg');
  assert.equal(Object.hasOwn(report, 'imageKey'), false);
});
