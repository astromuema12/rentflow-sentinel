const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = 'D:/rentflow-sentinel';
const out = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script', {cwd, encoding: 'utf8'});
const dir = path.join(cwd, 'prisma', 'migrations', '20260101000000_init_rentflow_sentinel');
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'migration.sql'), out);
console.log('done');
