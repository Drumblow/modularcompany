# Testes da API Mobile do ModularCompany

Este diretório contém os scripts de teste para a API Mobile do ModularCompany.

## Arquivos Disponíveis

1. **mobile-api.test.js** - Script Node.js para testar automaticamente todos os endpoints da API
2. **mobile-api-postman.json** - Coleção do Postman para testar manualmente os endpoints

## Como Executar os Testes Automatizados

Antes de executar os testes, certifique-se de que:

1. O servidor de desenvolvimento está rodando com `npm run dev`
2. Você tem um usuário de teste válido (modifique as credenciais no arquivo de teste se necessário)
3. Todas as dependências estão instaladas com `npm install`

Para executar os testes automatizados:

```bash
node src/tests/mobile-api.test.js
```

## Como Usar a Coleção Postman

1. Abra o Postman
2. Importe a coleção `src/tests/mobile-api-postman.json`
3. Configure a variável de ambiente `baseUrl` para o endereço do seu servidor (padrão: `http://localhost:3000/api`)
4. Execute a requisição "Login" para obter o token de autenticação
5. O token será automaticamente armazenado na variável `token` e usado nas requisições subsequentes
6. Execute as demais requisições na ordem desejada

## Notas sobre os Testes

- Os testes estão configurados para executar no ambiente de desenvolvimento local
- Para testar em outros ambientes, altere a variável `BASE_URL` no arquivo `mobile-api.test.js` ou a variável `baseUrl` na coleção Postman
- Alguns testes podem falhar se não houver dados existentes no banco de dados (por exemplo, pagamentos ou notificações)
- Os testes são independentes e falhas em um teste não impedem a execução dos demais

## Resolução de Problemas

Se os testes falharem com erros de Prisma ou falha de conexão com o banco de dados:

1. Regenere o cliente Prisma:
   ```bash
   npx prisma generate
   ```

2. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Verifique se as credenciais de teste são válidas no seu ambiente

## Endpoints Testados

1. **Autenticação**
   - Login (`POST /mobile-auth`)
   - Alterar senha (`POST /mobile-auth/change-password`)
   - Recuperar senha (`POST /mobile-auth/forgot-password`)

2. **Perfil**
   - Buscar perfil (`GET /mobile-profile`)
   - Atualizar perfil (`PUT /mobile-profile`)

3. **Registros de Horas**
   - Listar registros (`GET /mobile-time-entries`)
   - Criar registro (`POST /mobile-time-entries`)
   - Visualizar registro (`GET /mobile-time-entries/:id/view`)
   - Editar registro (`PUT /mobile-time-entries/:id`)
   - Excluir registro (`DELETE /mobile-time-entries/:id`)

4. **Pagamentos**
   - Listar pagamentos (`GET /mobile-payments`)
   - Visualizar pagamento (`GET /mobile-payments/:id`)
   - Verificar saldo (`GET /mobile-users/balance`)

5. **Dashboard**
   - Obter dados do dashboard (`GET /mobile-dashboard`)

6. **Projetos**
   - Listar projetos (`GET /mobile-projects`)

7. **Notificações**
   - Listar notificações (`GET /mobile-notifications`)
   - Marcar como lida (`PUT /mobile-notifications`)
   - Excluir notificação (`DELETE /mobile-notifications`)

8. **Feedback**
   - Enviar feedback (`POST /mobile-feedback`)
   - Listar feedbacks (`GET /mobile-feedback`)

9. **Relatórios**
   - Exportar relatório (`POST /mobile-reports/export`) 