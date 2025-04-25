const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Diretório de API para procurar arquivos
const API_DIR = path.join(__dirname, '../src');

// Função para verificar e corrigir importações
function fixLogImports() {
  // Encontrar todos os arquivos TypeScript
  const files = glob.sync(`${API_DIR}/**/*.{ts,tsx}`);
  
  console.log(`Encontrados ${files.length} arquivos para verificar`);
  
  let filesFixed = 0;
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Verifica se o arquivo tem funções serverLog, serverWarn, serverError ou devLog, devWarn, devError
    const hasServerFunctions = content.includes('serverLog') || 
                               content.includes('serverWarn') || 
                               content.includes('serverError');
    
    // Verificar se já tem a importação
    const hasImport = content.includes('import { devLog, devWarn, devError } from "@/lib/logger"');
    
    if (hasServerFunctions && !hasImport) {
      console.log(`Corrigindo arquivo: ${file}`);
      
      // Adicionar a importação após a última importação completa
      let newContent = content;
      const importLines = newContent.split('\n').filter(line => line.trim().startsWith('import '));
      
      // Encontrar a última importação completa
      let lastCompleteImportLine = -1;
      let insideMultilineImport = false;
      
      for (let i = 0; i < newContent.split('\n').length; i++) {
        const line = newContent.split('\n')[i].trim();
        
        // Verificar início de importação
        if (line.startsWith('import ')) {
          if (line.includes('{') && !line.includes('}') && !line.endsWith(';')) {
            // Início de importação multi-linha
            insideMultilineImport = true;
          } else if (line.endsWith(';') || !line.includes('{')) {
            // Importação completa de linha única
            lastCompleteImportLine = i;
            insideMultilineImport = false;
          }
        } 
        // Verificar fim de importação multi-linha
        else if (insideMultilineImport && (line.includes('}') || line.endsWith(';'))) {
          lastCompleteImportLine = i;
          insideMultilineImport = false;
        }
      }
      
      if (lastCompleteImportLine !== -1) {
        // Dividir o conteúdo em linhas, inserir a nova importação após a última importação completa
        const lines = newContent.split('\n');
        lines.splice(lastCompleteImportLine + 1, 0, 'import { devLog, devWarn, devError } from "@/lib/logger";');
        newContent = lines.join('\n');
        
        fs.writeFileSync(file, newContent);
        filesFixed++;
      }
    }
  });
  
  console.log(`Correção concluída. ${filesFixed} arquivos foram atualizados.`);
}

// Executar a função principal
fixLogImports(); 