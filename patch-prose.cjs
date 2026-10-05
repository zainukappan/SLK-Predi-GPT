const fs = require('fs');
let css = fs.readFileSync('src/app/globals.css', 'utf8');

css += `
.prose-content p { margin-bottom: 1.5em; }
.prose-content h2 { font-size: 1.5em; font-weight: 800; color: var(--navy); margin-top: 2em; margin-bottom: 0.8em; }
.prose-content h3 { font-size: 1.25em; font-weight: 700; color: var(--navy); margin-top: 1.5em; margin-bottom: 0.5em; }
.prose-content ul { list-style: disc; padding-left: 1.5em; margin-bottom: 1.5em; }
.prose-content ol { list-style: decimal; padding-left: 1.5em; margin-bottom: 1.5em; }
.prose-content li { margin-bottom: 0.5em; }
.prose-content blockquote { border-left: 4px solid var(--primary); padding-left: 1em; font-style: italic; color: var(--muted); margin: 1.5em 0; }
.prose-content a { color: var(--primary); font-weight: 600; text-decoration: underline; }
`;
fs.writeFileSync('src/app/globals.css', css);
