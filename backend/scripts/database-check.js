require('dotenv').config();
require('../models');
const { usersDB, productsDB, ordersDB, paymentsDB, bidsDB } = require('../config/database');
(async()=>{ const entries={usersDB,productsDB,ordersDB,paymentsDB,bidsDB}; let failed=false; for(const [name,db] of Object.entries(entries)){ try{await db.authenticate(); console.log(`OK ${name}`);}catch(e){failed=true;console.error(`FAIL ${name}: ${e.message}`);} } await Promise.all([...new Set(Object.values(entries))].map(db=>db.close().catch(()=>{}))); process.exit(failed?1:0); })();
