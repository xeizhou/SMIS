const fs = require('fs');
const path = require('path');

const directories = ['resources/js/components', 'resources/js/pages'];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

let files = [];
directories.forEach(dir => {
    files = files.concat(walk(dir));
});

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let newContent = content;
    
    newContent = newContent.replace(/'Serviceable'/g, "'SERVICEABLE'");
    newContent = newContent.replace(/\"Serviceable\"/g, '"SERVICEABLE"');
    newContent = newContent.replace(/>Serviceable</g, '>SERVICEABLE<');
    
    newContent = newContent.replace(/'Unserviceable'/g, "'UNSERVICEABLE'");
    newContent = newContent.replace(/\"Unserviceable\"/g, '"UNSERVICEABLE"');
    newContent = newContent.replace(/>Unserviceable</g, '>UNSERVICEABLE<');
    
    newContent = newContent.replace(/(\s+)Serviceable(\s+)/g, '$1SERVICEABLE$2');
    newContent = newContent.replace(/(\s+)Unserviceable(\s+)/g, '$1UNSERVICEABLE$2');
    
    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Updated ' + file);
    }
});
