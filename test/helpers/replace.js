import fs from 'fs';

export function replaceTextInFile(file, search, replacement) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf8', function(err, data) {
            if (err) {
                return reject(err);
            }

            var result = data.replace(search, replacement);

            fs.writeFile(file, result, 'utf8', function(err) {
                if (err) return reject(err);
                resolve();
            });
        });
    });
}
