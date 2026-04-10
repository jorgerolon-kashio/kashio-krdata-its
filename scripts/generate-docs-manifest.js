const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../docs');
const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(docsDir)) {
    console.error('Docs directory not found at', docsDir);
    process.exit(1);
}

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const files = fs.readdirSync(docsDir)
    .filter(file => file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json'))
    .map(file => {
        // Human readable name: capitalize first letter, remove extension
        let name = file.replace(/\.(yaml|yml|json)$/, '');
        name = name.charAt(0).toUpperCase() + name.slice(1);

        // Pick an icon based on name
        let icon = 'file-text';
        const lower = name.toLowerCase();
        if (lower.includes('audit')) icon = 'shield';
        if (lower.includes('data')) icon = 'database';
        if (lower.includes('sec')) icon = 'lock';
        if (lower.includes('auth')) icon = 'key';

        return {
            name: name,
            path: `/docs/${file}`,
            icon: icon
        };
    });

fs.writeFileSync(path.join(publicDir, 'docs-manifest.json'), JSON.stringify(files, null, 2));
console.log('✅ Generated docs-manifest.json with', files.length, 'files');
