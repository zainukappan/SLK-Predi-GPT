const fs = require('fs');
let code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

// Find the EN dictionary
code = code.replace(
  'reports: "Reports",',
  'reports: "Reports",\n  news: "News Portal",'
);

// Find the ML dictionary
code = code.replace(
  'reports: "റിപ്പോർട്ടുകൾ",',
  'reports: "റിപ്പോർട്ടുകൾ",\n  news: "വാർത്തകൾ",'
);

fs.writeFileSync('src/lib/i18n.ts', code);
