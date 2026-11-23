const fs = require('fs/promises');
async function screenImage(file) {
  if (!file) return null;
  try {
    const bytes = file.buffer || await fs.readFile(file.path);
    const form = new FormData();
    form.append('image', new Blob([bytes], { type: file.mimetype }), file.originalname || 'animal.jpg');
    const response = await fetch(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/analyze`, { method:'POST', body:form, signal:AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error('Vision service returned an error');
    return await response.json();
  } catch {
    return { model:'unavailable', status:'human_review_required', summary:'AI vision service is offline or not configured. Human review is required.', possible_signs:[], severity:'unknown', needs_urgent_human_review:true, warning:'No image injury detection was performed. This is not a veterinary diagnosis.' };
  }
}
module.exports = { screenImage };
