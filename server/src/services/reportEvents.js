const clients = new Set();

const subscribe = response => {
  clients.add(response);
  return () => clients.delete(response);
};

const publishReport = (report, action='updated') => {
  const message = `data: ${JSON.stringify({type:'report',action,report})}\n\n`;
  for (const response of clients) {
    if (response.destroyed || response.writableEnded) {
      clients.delete(response);
      continue;
    }
    response.write(message);
  }
};

module.exports = { subscribe, publishReport };
