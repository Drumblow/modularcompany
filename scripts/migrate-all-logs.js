import { devLog, devWarn, devError } from '@/lib/logger';
/**
 * Script para migrar todos os arquivos que contêm console.log
 * Este script executa o convert-logs.js para cada arquivo encontrado
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Diretório raiz do projeto
const rootDir = path.resolve(__dirname, '..');

// Padrões para ignorar
const ignorePatterns = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'scripts/convert-logs.js',
  'scripts/migrate-all-logs.js' // Ignorar este script
];

// Extensões a serem verificadas
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// Função para verificar se um caminho deve ser ignorado
function shouldIgnore(filePath) {
  return ignorePatterns.some(pattern => filePath.includes(pattern));
}

// Função recursiva para percorrer diretórios
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (shouldIgnore(filePath)) {
      return;
    }
    
    if (fs.statSync(filePath).isDirectory()) {
      fileList = walkDir(filePath, fileList);
    } else {
      const ext = path.extname(filePath);
      if (fileExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Função para verificar se um arquivo contém console.log
function fileContainsConsoleLog(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.match(/console\.(log|warn|error)\(/);
  } catch (error) {
    devError(`Erro ao ler arquivo ${filePath}:`, error);
    return false;
  }
}

function convertAllFiles() {
  try {
    devLog('Buscando arquivos com console.log, console.warn ou console.error...');
    
    // Obter todos os arquivos com as extensões especificadas
    const allFiles = walkDir(rootDir);
    
    // Filtrar apenas aqueles com console.log
    const filesWithConsoleLog = allFiles.filter(filePath => fileContainsConsoleLog(filePath));
    
    devLog(`\nEncontrados ${filesWithConsoleLog.length} arquivos para converter\n`);
    
    // Converter cada arquivo
    let convertedCount = 0;
    let errorCount = 0;
    
    for (const filePath of filesWithConsoleLog) {
      const relativePath = filePath.replace(rootDir + path.sep, '');
      try {
        devLog(`Convertendo: ${relativePath}...`);
        
        // Executar o script de conversão para este arquivo
        execSync(`node scripts/convert-logs.js convert "${relativePath}"`, {
          cwd: rootDir,
          stdio: 'inherit'
        });
        
        convertedCount++;
      } catch (error) {
        devError(`Erro ao converter ${relativePath}:`, error.message);
        errorCount++;
      }
    }
    
    devLog('\n=== Resumo da migração ===');
    devLog(`Total de arquivos processados: ${filesWithConsoleLog.length}`);
    devLog(`Arquivos convertidos com sucesso: ${convertedCount}`);
    devLog(`Arquivos com erros: ${errorCount}`);
    
  } catch (error) {
    devError('Erro ao converter arquivos:', error);
  }
}

// Executar
convertAllFiles(); 