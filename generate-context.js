/* SCRIPT DE GENERACIÓN DE CONTEXTO - VITALSCRIBE AI
   Uso: node generate-context.js
   
   Este script escanea tu proyecto y crea un solo archivo de texto con todo el código.
   SEGURIDAD: Excluye automáticamente archivos .env y carpetas pesadas.
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURACIÓN ---
const OUTPUT_FILE = '_GEMINI_CONTEXT_UPLOAD.txt';

// Carpetas que NO queremos leer (Basura o seguridad)
const BLOCKED_DIRS = [
    'node_modules', 
    '.git', 
    'dist', 
    'build', 
    '.vscode', 
    'public', // Generalmente solo son imágenes, ahorra espacio
    'coverage'
];

// Archivos que NO queremos leer (SEGURIDAD CRÍTICA)
const BLOCKED_FILES = [
    '.env',            // ⛔ NUNCA INCLUIR
    '.env.local',      // ⛔ NUNCA INCLUIR
    '.env.production', // ⛔ NUNCA INCLUIR
    '.DS_Store', 
    'package-lock.json', 
    'yarn.lock',
    OUTPUT_FILE,       // No leer el archivo que estamos creando
    'generate-context.js'
];

// Extensiones permitidas (Solo código útil)
const ALLOWED_EXTS = [
    '.ts', '.tsx', 
    '.js', '.jsx', 
    '.css', 
    '.sql',  // Útil para ver tus tablas de Supabase
    '.md', 
    '.json'  // Útil para package.json y config
];

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        
        // Si no tenemos permiso o hay error, saltamos
        try {
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (!BLOCKED_DIRS.includes(file)) {
                    getAllFiles(fullPath, arrayOfFiles);
                }
            } else {
                const ext = path.extname(file).toLowerCase();
                // Filtro estricto de seguridad y relevancia
                const isBlocked = BLOCKED_FILES.includes(file) || file.startsWith('.env'); 
                const isAllowed = ALLOWED_EXTS.includes(ext) || file === '.gitignore';

                if (!isBlocked && isAllowed) {
                    arrayOfFiles.push(fullPath);
                }
            }
        } catch (e) {
            // Ignorar errores de acceso
        }
    });

    return arrayOfFiles;
}

console.log("🔄 Generando Cápsula de Contexto VitalScribe (v5.2)...");

const allFiles = getAllFiles(__dirname);
let outputContent = `=== VITALSCRIBE AI - CONTEXTO DEL PROYECTO ===\nGenerado: ${new Date().toLocaleString()}\n\n`;

// 1. Mapa de Estructura (Para que la IA entienda dónde está cada cosa)
outputContent += `=== ESTRUCTURA DE ARCHIVOS ===\n`;
allFiles.forEach(f => {
    outputContent += `- ${path.relative(__dirname, f)}\n`;
});
outputContent += `\n=================================\n\n`;

// 2. Contenido de los Archivos
let fileCount = 0;
allFiles.forEach(f => {
    const relativePath = path.relative(__dirname, f);
    try {
        const content = fs.readFileSync(f, 'utf8');
        outputContent += `\n--- START OF FILE: ${relativePath} ---\n`;
        outputContent += content;
        outputContent += `\n--- END OF FILE: ${relativePath} ---\n`;
        fileCount++;
    } catch (err) {
        console.error(`Error leyendo ${relativePath}`);
    }
});

fs.writeFileSync(path.join(__dirname, OUTPUT_FILE), outputContent);

console.log(`\n✅ ¡ÉXITO! Contexto generado en: ${OUTPUT_FILE}`);
console.log(`📄 Archivos procesados: ${fileCount}`);
console.log(`🔒 SEGURIDAD: Tus llaves .env han sido EXCLUIDAS.`);