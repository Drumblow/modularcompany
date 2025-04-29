// Script para iniciar o servidor de desenvolvimento e executar testes da API
const { spawn } = require('child_process');
const { join } = require('path');
const fs = require('fs');
const http = require('http');
const axios = require('axios');

console.log('🚀 Iniciando servidor para testes da API Mobile...');

// Portas possíveis para teste
const PORTS = [3000, 3001];
let selectedPort = null;

// Verificar se já existe um servidor rodando em alguma das portas
const checkServerRunning = async () => {
  for (const port of PORTS) {
    try {
      console.log(`🔍 Verificando se existe servidor na porta ${port}...`);
      
      // Tentar fazer uma requisição simples para verificar se o servidor responde
      await axios.get(`http://localhost:${port}/api/mobile-auth`, { 
        timeout: 3000,
        validateStatus: () => true // Aceitar qualquer status HTTP como sucesso
      });
      
      console.log(`✅ Servidor detectado rodando na porta ${port}`);
      selectedPort = port;
      return true;
    } catch (error) {
      // Se recebemos uma resposta HTTP, o servidor está rodando
      if (error.response) {
        console.log(`✅ Servidor detectado rodando na porta ${port} (status: ${error.response.status})`);
        selectedPort = port;
        return true;
      }
      
      // Se o erro for diferente de conexão recusada, assumimos que a porta está ocupada
      if (error.code && error.code !== 'ECONNREFUSED') {
        console.log(`❓ Porta ${port} em uso, mas não responde como esperado`);
        continue;
      }
      
      console.log(`❌ Nenhum servidor rodando na porta ${port}`);
    }
  }
  
  // Se chegou aqui, nenhum servidor foi encontrado
  console.log('❌ Nenhum servidor encontrado nas portas verificadas');
  selectedPort = PORTS[0]; // Usamos a primeira porta para iniciar um novo servidor
  return false;
};

// Função para iniciar o servidor de desenvolvimento
const startServer = async () => {
  // Verificar se o servidor já está rodando
  const serverRunning = await checkServerRunning();
  
  if (serverRunning) {
    console.log(`✅ Um servidor já está rodando na porta ${selectedPort}. Prosseguindo com os testes...`);
    return null;
  }
  
  console.log(`💻 Iniciando servidor Next.js na porta ${selectedPort}...`);
  
  // Iniciar o servidor Next.js com npm run dev
  const server = spawn('npm', ['run', 'dev', '--', '-p', selectedPort.toString()], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env }
  });
  
  return new Promise((resolve) => {
    let output = '';
    let started = false;
    
    // Capturar saída para saber quando o servidor estiver pronto
    server.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // Verificar se o servidor está pronto
      if (!started && (
        chunk.includes('ready') || 
        chunk.includes('started server') ||
        chunk.includes('localhost')
      )) {
        started = true;
        console.log(`✅ Servidor iniciado com sucesso na porta ${selectedPort}!`);
        
        // Aguardar mais alguns segundos para garantir que tudo está carregado
        setTimeout(() => resolve(server), 3000);
      }
    });
    
    // Capturar erros
    server.stderr.on('data', (data) => {
      console.error('❌ Erro no servidor:', data.toString());
    });
    
    // Se o servidor falhar ao iniciar
    server.on('close', (code) => {
      if (!started) {
        console.error(`❌ Servidor encerrado com código ${code} antes de iniciar completamente.`);
        console.error('Saída:', output);
        resolve(null);
      }
    });
    
    // Definir um timeout para resolver se o servidor não iniciar em tempo razoável
    setTimeout(() => {
      if (!started) {
        console.error('❌ Timeout ao iniciar o servidor.');
        server.kill();
        resolve(null);
      }
    }, 30000); // 30 segundos de timeout
  });
};

// Função para executar os testes
const runTests = (server) => {
  console.log(`\n📊 Executando testes da API Mobile (usando porta ${selectedPort})...`);
  
  // Definir a variável de ambiente com a URL base correta
  process.env.TEST_API_BASE_URL = `http://localhost:${selectedPort}/api`;
  
  const testProcess = spawn('node', [join(__dirname, 'mobile-api.test.js')], {
    stdio: 'inherit',
    shell: true,
    env: process.env // Passar a variável de ambiente atualizada
  });
  
  return new Promise((resolve) => {
    testProcess.on('close', (code) => {
      console.log(`\n${code === 0 ? '✅ Testes concluídos com sucesso!' : '❌ Testes falharam!'}`);
      resolve(code);
    });
  });
};

// Função principal
const main = async () => {
  try {
    // Iniciar o servidor
    const server = await startServer();
    
    // Aguardar um pouco para garantir que o servidor está totalmente operacional
    console.log('⏳ Aguardando o servidor estar completamente pronto...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Garantir que temos um usuário de teste
    console.log('👤 Criando usuário de teste...');
    const createUserProcess = spawn('npm', ['run', 'test:create-user'], {
      stdio: 'inherit',
      shell: true
    });
    
    await new Promise((resolve) => {
      createUserProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Usuário de teste criado/atualizado com sucesso!');
        } else {
          console.error('⚠️ Aviso: Não foi possível criar o usuário de teste, continuando mesmo assim...');
        }
        resolve();
      });
    });
    
    // Executar os testes
    const testResult = await runTests(server);
    
    // Encerrar o servidor se ele foi iniciado por este script
    if (server) {
      console.log('\n🛑 Encerrando o servidor...');
      server.kill();
    }
    
    process.exit(testResult);
  } catch (error) {
    console.error('❌ Erro ao executar testes:', error);
    process.exit(1);
  }
};

// Executar o script
main(); 