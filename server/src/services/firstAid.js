// Uses Gemini when a server-side API key is configured; otherwise falls back to
// conservative, deterministic safety rules. Never presents output as diagnosis.
const rules = [
  { keys: ['bleed','blood','wound','cut','injury'], title: 'Visible wound or bleeding', steps: ['Keep people and the animal calm; approach slowly and only if it is safe.', 'Do not touch the wound or attempt to remove embedded objects.', 'If the animal is calm and safe to handle, place clean gauze or cloth gently over active bleeding without pressing hard on a fracture or embedded object.', 'Arrange urgent assessment by a veterinarian or animal rescue professional.'] },
  { keys: ['hit','car','vehicle','fracture','broken','limp','fall','accident'], title: 'Possible trauma or fracture', steps: ['Do not make the animal walk or try to straighten a limb.', 'Keep the animal still, quiet and warm; avoid unnecessary handling.', 'Do not give human painkillers, food or water.', 'Contact a veterinarian or rescue team urgently; transport only with trained guidance.'] },
  { keys: ['burn','fire','scald'], title: 'Possible burn', steps: ['Move away from the heat source only if it is safe.', 'Do not apply butter, oil, toothpaste, ice or ointments.', 'Do not peel away stuck material or burst blisters.', 'Seek prompt veterinary care; call a rescue professional for safe handling.'] },
  { keys: ['weak','unconscious','seizure','breath','breathing','collapse','poison','toxic'], title: 'Critical symptoms / possible poisoning', steps: ['Treat this as an emergency and call a veterinarian or animal rescue service now.', 'Keep the animal in a quiet, ventilated place and minimise handling.', 'Do not induce vomiting or give medicines, food or water unless a veterinarian instructs you.', 'If safe, note the suspected substance and time of exposure for the veterinarian.'] }
];
function fallback(description = '', emergency = false) {
  const text = String(description).toLowerCase();
  const match = rules.find(rule => rule.keys.some(k => text.includes(k)));
  const critical = emergency || /unconscious|seizure|breath|breathing|collapse|poison|heavy bleeding|severe/.test(text);
  return { title: critical ? 'Emergency: professional help needed immediately' : (match?.title || 'Safe first-response checklist'), urgency: critical ? 'emergency' : (match ? 'urgent' : 'assessment'), steps: match?.steps || ['Keep a safe distance and do not chase, corner or restrain a frightened animal.', 'Move people, pets and traffic away if this can be done safely.', 'Provide shade or a quiet area without forcing food or water.', 'Share the photo and exact location with a local animal rescue group or veterinarian.'], source: 'safety-rule fallback' };
}
async function getFirstAid(description = '', emergency = false) {
  const base = fallback(description, emergency);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ...base, disclaimer: 'AI provider is not configured; these are conservative rule-based safety prompts, not a diagnosis. Contact a veterinarian or rescue professional.' };
  try {
    const prompt = `You are a conservative animal-rescue first-response information assistant. Do NOT diagnose, prescribe, recommend medication, or advise risky handling. Based only on this description: "${String(description).slice(0,1200)}". Emergency flag: ${Boolean(emergency)}. Return ONLY JSON with keys title (short), urgency (one of emergency, urgent, assessment), steps (3 to 5 short safe actions), disclaimer. Prioritise human safety, minimal handling, no human medicines, and urgent veterinarian/rescue contact for severe symptoms. If uncertain, say so.`;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(key), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.2}}), signal:AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('AI provider request failed');
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || '';
    const parsed = JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```$/,'').trim());
    const urgency = ['emergency','urgent','assessment'].includes(parsed.urgency) ? parsed.urgency : base.urgency;
    const steps = Array.isArray(parsed.steps) ? parsed.steps.map(x=>String(x).slice(0,300)).slice(0,5) : base.steps;
    return { title:String(parsed.title||base.title).slice(0,120), urgency, steps, source:'Gemini AI with safety constraints', disclaimer:'AI-generated information may be incomplete or incorrect. This is not veterinary diagnosis or treatment. Contact a qualified veterinarian or rescue professional.' };
  } catch (e) {
    return { ...base, disclaimer:'AI service could not be reached; conservative rule-based safety prompts are shown instead. This is not a diagnosis. Contact a veterinarian or rescue professional.' };
  }
}
module.exports = { getFirstAid };
