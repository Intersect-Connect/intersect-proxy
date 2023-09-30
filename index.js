import { createServer } from 'https';
import pkg from 'http-proxy';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import boxen from 'boxen';
import dotenv from 'dotenv';
import readline from 'readline';
import inquirer from 'inquirer';

const { createProxyServer } = pkg;

// Fonction pour charger les traductions en fonction de la langue choisie
function loadTranslations(language) {
    try {
        const translationsData = readFileSync(`./translations/${language}.json`, 'utf8');
        const translations = JSON.parse(translationsData);
        return translations;
    } catch (error) {
        console.error(`Erreur lors du chargement des traductions pour la langue ${language}:`, error);
        return {};
    }
}


// Fonction pour afficher un texte traduit en fonction de la langue
async function translate(text, language) {
    const translations = await loadTranslations(language);
    return translations[text] || text;
}

// Vérifiez si le fichier .env existe
if (!existsSync('.env')) {
    // Le fichier .env n'existe pas, demandez à l'utilisateur de le créer
    console.log("Le fichier .env n'existe pas. Veuillez fournir les valeurs requises.");

    async function askQuestions() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'language',
                message: 'Choisissez votre langue préférée :',
                choices: [
                    { name: 'English', value: 'en' },
                    { name: 'Français', value: 'fr' },
                    // Ajoutez d'autres langues ici
                ],
            },
            {
                type: 'input',
                name: 'certPath',
                message: 'Chemin vers le certificat (CERTIFICATE_PATH): ',
            },
            {
                type: 'input',
                name: 'keyPath',
                message: 'Chemin vers la clé (KEY_PATH): ',
            },
            {
                type: 'input',
                name: 'proxyTarget',
                message: 'URL du serveur cible (PROXY_TARGET): ',
            },
            {
                type: 'input',
                name: 'port',
                message: 'Port (PORT): ',
            },
        ]);

        const { language, certPath, keyPath, proxyTarget, port } = answers;
        process.env.LANGUAGE = language; // Définissez la langue dans les variables d'environnement

        // Créez le contenu du fichier .env
        const envContent = `
            CERTIFICATE_PATH=${certPath}
            KEY_PATH=${keyPath}
            PROXY_TARGET=${proxyTarget}
            PORT=${port}
            LANGUAGE=${language}
        `.trim();

        // Écrivez le contenu dans le fichier .env
        writeFileSync('.env', envContent);

        console.log("Les valeurs ont été enregistrées dans le fichier .env.");
        rl.close();

        startServer(); // Lancez le serveur une fois que les valeurs sont définies
    }

    askQuestions();
} else {
    // Le fichier .env existe, chargez les variables d'environnement à partir de .env
    dotenv.config();
    startServer(); // Lancez le serveur avec les valeurs du fichier .env
}

// Fonction pour démarrer le serveur avec les valeurs du .env
async function startServer() {
    console.log(boxen(await translate("Intersect Proxy", process.env.LANGUAGE), { padding: 1, borderColor: 'green', dimBorder: true }));

    // Utilisez process.env pour accéder aux variables d'environnement définies dans .env
    const certFilePath = process.env.CERTIFICATE_PATH;
    const keyFilePath = process.env.KEY_PATH;
    const proxyTarget = process.env.PROXY_TARGET;
    const port = process.env.PORT;
    const language = process.env.LANGUAGE;

    // Vérifiez si les fichiers de certificat et de clé existent
    if (!existsSync(certFilePath) || !existsSync(keyFilePath)) {
        console.log(boxen(await translate("Erreur : Les fichiers de certificat ou de clé sont introuvables", language), { padding: 0.5, borderColor: 'red', dimBorder: true }));
        process.exit(1);
    }

    const credentials = {
        key: readFileSync(keyFilePath),
        cert: readFileSync(certFilePath),
    };

    const proxy = createProxyServer({
        target: proxyTarget,
        secure: false,
    });

    const server = createServer(credentials, async (req, res) => {
        console.log(boxen(await translate("Requête entrante vers le serveur proxy :", language) + req.url, { padding: 0.5, borderColor: 'white', dimBorder: true }));

        proxy.web(req, res, async (err) => {
            if (err) {
                console.log(boxen(await translate("Erreur dans la gestion du proxy :", language) + err, { padding: 0.5, borderColor: 'red', dimBorder: true }));
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Erreur du proxy');
            }
        });
    });
    server.listen(port, async () => {
        console.log(await translate(`Serveur proxy reverse HTTPS écoutant sur le port ${port}`, language));
    });
}