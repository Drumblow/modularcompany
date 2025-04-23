# Instruções para Ambiente de Demonstração

## Configuração Inicial

Para utilizar o sistema ModularCompany com todos os seus recursos, siga estas etapas:

1. **Inicializar o Banco de Dados**:
   - Se você estiver iniciando o sistema pela primeira vez ou encontrar problemas de login, acesse a página de configuração:
   - URL: http://localhost:3000/setup
   - Clique no botão "Inicializar Sistema" para criar os usuários de demonstração

2. **Usuários de Demonstração**:
   Após a configuração, você terá acesso aos seguintes usuários:

   | Perfil        | Email               | Senha        |
   |---------------|---------------------|--------------|
   | Desenvolvedor | dev@example.com     | dev123456    |
   | Administrador | admin@example.com   | admin123456  |
   | Gerente       | manager@example.com | manager123456|
   | Funcionário   | employee@example.com| employee123456|

3. **Login Rápido**:
   - Na página de login, você pode usar os botões de "Login Rápido" para acessar diretamente cada perfil
   - Alternadamente, você pode digitar manualmente os emails e senhas listados acima

## Funcionalidades por Perfil

### Desenvolvedor
- Criar e gerenciar empresas
- Criar administradores para cada empresa
- Configurar módulos disponíveis para as empresas

### Administrador
- Gerenciar usuários da empresa (criar, editar, excluir)
- Configurar módulos da empresa
- Visualizar relatórios e métricas

### Gerente
- Visualizar e gerenciar funcionários
- Aprovar registros de horas
- Gerar relatórios de produtividade

### Funcionário
- Registrar horas trabalhadas
- Visualizar histórico de registros
- Editar perfil pessoal

## Solução de Problemas

Se você encontrar erros de autenticação:

1. **Erro 401 (Unauthorized)**:
   - Acesse a página de configuração (http://localhost:3000/setup)
   - Inicialize os usuários de demonstração
   - Tente fazer login novamente

2. **Banco de Dados**:
   - Certifique-se de que o banco de dados está configurado corretamente
   - Verifique se o arquivo `.env` contém a configuração correta para o DATABASE_URL

3. **Dependências**:
   - Certifique-se de que todas as dependências foram instaladas:
   ```
   npm install
   ```

Para problemas persistentes, consulte a documentação completa em `ModularCompanyDocumentation.md`. 