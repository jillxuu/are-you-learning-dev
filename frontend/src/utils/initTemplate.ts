import fs from 'fs';
import path from 'path';

const TEMPLATE_CODE = `module meme_factory::meme_coin {
    // ... template code ...
}`;

/**
 * Initializes the template code file if it doesn't exist or is empty.
 * This ensures that users always have a starting point when they open the editor.
 */
export const initTemplateCode = () => {
    const sourcesDir = path.resolve(__dirname, '../../../move/sources');
    const templatePath = path.join(sourcesDir, 'meme_coin.move');

    // Create sources directory if it doesn't exist
    if (!fs.existsSync(sourcesDir)) {
        fs.mkdirSync(sourcesDir, { recursive: true });
    }

    // Write template code if file doesn't exist or is empty
    if (!fs.existsSync(templatePath) || fs.readFileSync(templatePath, 'utf8').trim() === '') {
        fs.writeFileSync(templatePath, TEMPLATE_CODE);
        console.log('Initialized template code at:', templatePath);
    }
}; 