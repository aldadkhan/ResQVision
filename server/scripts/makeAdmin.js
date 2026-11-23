require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { isValidEmail } = require('../src/utils/accountValidation');

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw new Error('Provide the registered account email: npm run make-admin -- email@example.com');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Configure server/.env first.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const admin = await User.findOneAndUpdate(
    {email},
    {role:'admin'},
    {new:true,runValidators:true}
  ).select('email');
  if (!admin) throw new Error(`No account found for ${email}. Register that account before promoting it.`);
  console.log(`Administrator access enabled for ${admin.email}. Sign out and sign back in to refresh the dashboard.`);
}

main()
  .catch(error => {
    console.error(`Unable to create administrator: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
