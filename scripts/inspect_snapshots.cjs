const fs = require('fs');
const path = require('path');

const snapshotDir = path.join(__dirname, '..', 'backups', 'snapshot_pre_cleanup');
const files = fs.readdirSync(snapshotDir).filter(f => f.endsWith('.json'));

console.log('Inspecting snapshot files in:', snapshotDir);

const analysis = {};

for (const file of files) {
  const tableName = file.replace('.json', '');
  const content = JSON.parse(fs.readFileSync(path.join(snapshotDir, file), 'utf8'));
  const rows = Array.isArray(content) ? content : (content.data || []);
  
  const columns = {};
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (!columns[k]) {
        columns[k] = {
          count: 0,
          types: new Set(),
          sample: null
        };
      }
      columns[k].count++;
      if (v === null || v === undefined) {
        columns[k].types.add('null');
      } else if (Array.isArray(v)) {
        columns[k].types.add('array');
        if (!columns[k].sample) columns[k].sample = v;
      } else {
        columns[k].types.add(typeof v);
        if (!columns[k].sample) columns[k].sample = v;
      }
    }
  }

  analysis[tableName] = {
    totalRows: rows.length,
    columns: Object.fromEntries(
      Object.entries(columns).map(([k, meta]) => [
        k,
        {
          types: Array.from(meta.types),
          count: meta.count,
          sample: meta.sample
        }
      ])
    )
  };
}

console.log(JSON.stringify(analysis, null, 2));
