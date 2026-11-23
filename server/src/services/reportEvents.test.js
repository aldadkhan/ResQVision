const test = require('node:test');
const assert = require('node:assert/strict');
const { subscribe, publishReport } = require('./reportEvents');

test('publishes report updates to connected rescue-team streams', () => {
  const writes = [];
  const response = {
    destroyed:false,
    writableEnded:false,
    write(message) { writes.push(message); }
  };
  const unsubscribe = subscribe(response);

  publishReport({_id:'case-1',status:'submitted'});

  assert.equal(writes.length,1);
  assert.deepEqual(JSON.parse(writes[0].slice(6).trim()), {
    type:'report',
    action:'updated',
    report:{_id:'case-1',status:'submitted'}
  });
  unsubscribe();
  publishReport({_id:'case-2',status:'rescued'});
  assert.equal(writes.length,1);
});

test('removes disconnected streams instead of writing to them', () => {
  let writeCount = 0;
  const response = {
    destroyed:true,
    writableEnded:false,
    write() { writeCount += 1; }
  };
  subscribe(response);

  publishReport({_id:'case-3'});

  assert.equal(writeCount,0);
});
