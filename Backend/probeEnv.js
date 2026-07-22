const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('cwd=', process.cwd());
console.log('env path=', path.join(__dirname, '.env'));
console.log('CLIENT_URL=', process.env.CLIENT_URL);
console.log('JWT_SECRET=', process.env.JWT_SECRET ? 'set' : 'missing');
console.log('MONGO_URI=', process.env.MONGO_URI ? 'set' : 'missing');
try {
  const config = require('./config');
  console.log('config.server.corsOrigin=', config.server.corsOrigin);
} catch (err) {
  console.error('config load error', err.message);
}
