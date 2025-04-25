/**
 * Script para ajudar a converter console.log para funções de log condicionais
 * 
 * Como usar:
 * 1. Primeiro, execute: node scripts/convert-logs.js list
 *    - Isso listará todos os arquivos com console.log
 * 
 * 2. Para converter um arquivo específico:
 *    - node scripts/convert-logs.js convert <caminho-do-arquivo>
 * 
 * Nota: Este script é uma ajuda para conversão, mas pode ser necessário revisar manualmente os arquivos
 */

const fs = require('fs');
const path = require('path');

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
    console.error(`Erro ao ler arquivo ${filePath}:`, error);
    return false;
  }
}

// Função para listar todos os arquivos que contêm console.log
function listFilesWithConsoleLog() {
  try {
    console.log('Buscando arquivos com console.log, console.warn ou console.error...');
    
    // Obter todos os arquivos com as extensões especificadas
    const allFiles = walkDir(rootDir);
    
    // Filtrar apenas aqueles com console.log
    const filesWithConsoleLog = allFiles.filter(filePath => fileContainsConsoleLog(filePath));
    
    // Exibir os arquivos encontrados
    console.log('\nArquivos que contêm console.log, console.warn ou console.error:');
    filesWithConsoleLog.forEach(file => {
      console.log(file.replace(rootDir + path.sep, ''));
    });
    
    console.log(`\nTotal: ${filesWithConsoleLog.length} arquivos`);
    console.log('\nPara converter um arquivo específico, execute:');
    console.log('node scripts/convert-logs.js convert <caminho-do-arquivo>');
    
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
  }
}

// Função para converter console.log em um arquivo específico
function convertFile(filePath) {
  try {
    const fullPath = path.resolve(rootDir, filePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Arquivo não encontrado: ${fullPath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar se é um arquivo de rota do Next.js API (server-side)
    const isServerSide = fullPath.includes('/api/') || fullPath.includes('\\api\\') && 
                         (fullPath.includes('/route.ts') || fullPath.includes('\\route.ts') || 
                          fullPath.includes('/route.js') || fullPath.includes('\\route.js'));
    
    if (isServerSide) {
      // Adicionar funções serverLog, serverWarn, serverError se não existirem
      if (!content.includes('serverLog') && !content.includes('serverWarn') && !content.includes('serverError')) {
        const logFunctions = `
// Funções de log do lado do servidor
const serverLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

const serverWarn = (message: string, data?: any) => {
  if (data !== undefined) {
    console.warn(message, data);
  } else {
    console.warn(message);
  }
};

const serverError = (message: string, data?: any) => {
  if (data !== undefined) {
    console.error(message, data);
  } else {
    console.error(message);
  }
};
`;
        
        // Encontrar um bom lugar para inserir as funções (após os imports)
        const importEndIndex = content.lastIndexOf('import');
        if (importEndIndex !== -1) {
          const importEndLine = content.indexOf('\n', importEndIndex);
          if (importEndLine !== -1) {
            content = content.substring(0, importEndLine + 1) + logFunctions + content.substring(importEndLine + 1);
          }
        }
      }
      
      // Substituir console.log por serverLog
      content = content.replace(/console\.log\(/g, 'serverLog(');
      
      // Substituir console.warn por serverWarn
      content = content.replace(/console\.warn\(/g, 'serverWarn(');
      
      // Substituir console.error por serverError
      content = content.replace(/console\.error\(/g, 'serverError(');
    } 
    else {
      // Cliente - verificar se já importa as funções de log
      const hasLogImport = content.includes('import { devLog') || content.includes('import {devLog');
      
      if (!hasLogImport) {
        // Adicionar import para funções de log
        const importStatement = `import { devLog, devWarn, devError } from '@/lib/logger';\n`;
        
        // Encontrar um bom lugar para inserir o import (após outros imports)
        const importEndIndex = content.lastIndexOf('import');
        if (importEndIndex !== -1) {
          const importEndLine = content.indexOf('\n', importEndIndex);
          if (importEndLine !== -1) {
            content = content.substring(0, importEndLine + 1) + importStatement + content.substring(importEndLine + 1);
          }
        } else {
          // Adicionar no início do arquivo
          content = importStatement + content;
        }
      }
      
      // Substituir console.log por devLog
      content = content.replace(/console\.log\(/g, 'devLog(');
      
      // Substituir console.warn por devWarn
      content = content.replace(/console\.warn\(/g, 'devWarn(');
      
      // Substituir console.error por devError
      content = content.replace(/console\.error\(/g, 'devError(');
    }
    
    // Salvar o arquivo modificado
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Arquivo convertido com sucesso: ${filePath}`);
    
  } catch (error) {
    console.error(`Erro ao converter o arquivo ${filePath}:`, error);
  }
}

// Função principal
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Uso: node scripts/convert-logs.js [list|convert] [caminho-do-arquivo]');
    return;
  }
  
  switch (command) {
    case 'list':
      listFilesWithConsoleLog();
      break;
    case 'convert':
      const filePath = args[1];
      if (!filePath) {
        console.error('Especifique o caminho do arquivo para converter');
        return;
      }
      convertFile(filePath);
      break;
    default:
      console.log('Comando desconhecido. Use "list" para listar arquivos ou "convert <caminho>" para converter um arquivo.');
  }
}

main(); 