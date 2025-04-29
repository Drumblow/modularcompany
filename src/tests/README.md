# Testes da API Mobile do ModularCompany

Este diretório contém testes automatizados para a API Mobile do ModularCompany.

## Arquivos de Teste

- `mobile-api.test.js` - Testes completos para todas as rotas da API mobile
- `run-api-tests.js` - Script para iniciar o servidor e executar os testes automaticamente
- `run-api-tests-simpler.js` - Versão simplificada do script de testes
- `create-test-user.js` - Script para criar ou atualizar o usuário de teste
- `mobile-api-postman.json` - Coleção do Postman para testes manuais

## Como Executar os Testes

Existem três formas de executar os testes da API:

### 1. Com servidor já em execução (recomendado)

Se você já tem o servidor rodando (com `npm run dev` em qualquer porta 3000 ou 3001), execute:

```bash
npm run test:api:simple
```

Este é o método mais simples e confiável. O script vai:
1. Criar/atualizar o usuário de teste no banco de dados
2. Detectar automaticamente em qual porta o servidor está rodando (3000 ou 3001)
3. Executar os testes contra o servidor encontrado

### 2. Teste direto (avançado)

Se você sabe exatamente em qual porta seu servidor está rodando:

```bash
npm run test:api
```

**Nota**: Por padrão, este comando tenta se conectar à porta 3000. Para especificar uma porta diferente, use:

```bash
TEST_API_BASE_URL=http://localhost:3001/api npm run test:api
```

### 3. Iniciando o servidor automaticamente

Se você não tem um servidor rodando, execute:

```bash
npm run test:api:with-server
```

Este comando vai:
1. Verificar se um servidor já está rodando em alguma porta disponível (3000 ou 3001)
2. Se não estiver, iniciar um servidor de desenvolvimento na primeira porta disponível
3. Criar/atualizar o usuário de teste no banco de dados
4. Executar os testes contra o servidor encontrado ou iniciado
5. Encerrar o servidor (apenas se ele foi iniciado pelo script)

## Criando o Usuário de Teste Manualmente

Se você precisar apenas criar ou atualizar o usuário de teste, execute:

```bash
npm run test:create-user
```

## Configurações de Teste

Os testes usam as seguintes configurações:

- **URL Base**: Detectada automaticamente - `http://localhost:3000/api` ou `http://localhost:3001/api`
- **Credenciais de Teste**: `funcionario@teste.com` / `senha123`
- **Número de Tentativas**: 3 tentativas para cada requisição
- **Tempo de Espera**: 2 segundos entre tentativas

## Solução de Problemas

### Erro de Conexão Recusada (ECONNREFUSED)

Se você receber um erro `ECONNREFUSED`, isso significa que o servidor não está rodando ou não está acessível. Certifique-se de:

1. Que o servidor esteja rodando em uma das portas suportadas (3000 ou 3001)
2. Que não haja firewall bloqueando a conexão
3. Que você não esteja usando VPN que possa interferir com conexões locais

### Falha de Autenticação

Se a autenticação falhar, verifique:

1. Se as credenciais de teste estão corretas
2. Se o banco de dados tem um usuário com essas credenciais
3. Execute `npm run test:create-user` para garantir que o usuário de teste existe

### Timeout nas Requisições

Se as requisições estiverem demorando muito e atingindo timeout:

1. Aumente o valor de timeout no arquivo `mobile-api.test.js` (padrão: 10000ms)
2. Verifique se o servidor não está sobrecarregado

## Endpoints Testados

O script de teste verifica os seguintes endpoints:

1. Autenticação (`POST /mobile-auth`)
2. Perfil do usuário (`GET /mobile-profile`)
3. Listagem de registros de horas (`GET /mobile-time-entries`)
4. Criação de registro de horas (`POST /mobile-time-entries`)
5. Visualização de registro de horas (`GET /mobile-time-entries/:id/view`)
6. Edição de registro de horas (`PUT /mobile-time-entries/:id`)
7. Exclusão de registro de horas (`DELETE /mobile-time-entries/:id`)
8. Listagem de pagamentos (`GET /mobile-payments`)
9. Visualização de pagamento (`GET /mobile-payments/:id`)
10. Saldo do usuário (`GET /mobile-users/balance`)
11. Dashboard (`GET /mobile-dashboard`)
12. Projetos (`GET /mobile-projects`)
13. Notificações (`GET /mobile-notifications`)
14. Marcação de notificação como lida (`PUT /mobile-notifications`)
15. Envio de feedback (`POST /mobile-feedback`)
16. Listagem de feedbacks (`GET /mobile-feedback`)
17. Exportação de relatório (`POST /mobile-reports/export`) 