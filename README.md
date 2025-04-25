# ModularCompany

Um sistema modular para gerenciamento de empresas, com diferentes níveis de acesso e módulos personalizáveis.

## 🔄 Atualizações Recentes

### 📊 Melhorias nos Relatórios e Filtragem de Status
- Aprimoramos a visualização dos contadores de status (Aprovados, Pendentes, Rejeitados) para que mostrem os valores corretos independentemente do filtro selecionado
- Melhoramos a experiência de filtragem, permitindo alternar facilmente entre diferentes visualizações
- Os contadores agora funcionam tanto como indicadores quanto como botões de filtro

### 🔔 Aprimoramentos no Sistema de Notificações
- Implementamos atualização automática do contador de notificações
- Corrigimos os redirecionamentos para considerar o papel do usuário (admin, manager, employee)
- Melhoramos a experiência do usuário com feedback visual imediato após ações

### 📅 Correção no Sistema de Detecção de Conflitos de Horários
- Corrigimos um bug crítico que permitia a criação de registros de horas sobrepostos em certos cenários
- Implementamos verificação mais robusta de todos os casos possíveis de sobreposição temporal
- Melhoramos as mensagens de erro e o sistema de logs para facilitar a identificação de problemas

## 👁️ Visão Geral

O ModularCompany é uma plataforma que permite o gerenciamento completo de empresas através de módulos personalizáveis. O sistema possui quatro níveis de acesso:

1. **Desenvolvedor**: Cadastra empresas e gerencia acesso/pagamentos.
2. **Administrador**: Gerencia a empresa, módulos, e cadastra gerentes/funcionários.
3. **Gerente**: Gerencia funcionários e acessa relatórios.
4. **Funcionário**: Acessa funcionalidades específicas para funcionários.

## 🧩 Módulos

### ⏱️ Módulo de Controle de Horas
O principal módulo implementado atualmente permite:
- Registro e aprovação de horas trabalhadas
- Geração de relatórios detalhados
- Cálculo automático de custos baseados em taxas horárias
- Exportação de dados em PDF e Excel
- Notificações para eventos importantes

### 💼 Fluxo de Trabalho no Controle de Horas

#### Para Funcionários:
- Registrar horas trabalhadas com data, horário de início e término
- Visualizar histórico e status de aprovação
- Receber notificações sobre aprovações/rejeições

#### Para Gestores:
- Aprovar ou rejeitar registros (com justificativa quando necessário)
- Visualizar relatórios por funcionário, período ou projeto
- Analisar custos e produtividade

#### Para Administradores:
- Acesso a todos os dados e relatórios consolidados
- Configurações avançadas do módulo
- Gerenciamento de taxas horárias

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 14, React 18, TypeScript 5, Tailwind CSS 3
- **Backend**: API Routes do Next.js
- **Banco de Dados**: Prisma ORM 5 com PostgreSQL (Neon)
- **Autenticação**: NextAuth.js 4
- **Relatórios**: jsPDF, ExcelJS
- **UI/UX**: Componentes customizados com Tailwind

## 📂 Estrutura do Projeto

```
src/
├── app/                    # Rotas e páginas (Next.js App Router)
│   ├── api/                # API Routes
│   │   ├── auth/           # Autenticação
│   │   ├── companies/      # Gestão de empresas
│   │   ├── users/          # Gestão de usuários
│   │   ├── time-entries/   # Controle de horas
│   │   └── notifications/  # Sistema de notificações
│   └── dashboard/          # Dashboards para diferentes perfis
├── components/             # Componentes reutilizáveis
│   ├── ui/                 # Componentes de UI básicos
│   ├── modules/            # Componentes específicos de módulos
│   └── layout/             # Componentes de layout
├── hooks/                  # React Hooks customizados
└── prisma/                 # Configuração do Prisma
```

## 🚀 Instalação e Execução

1. Clone o repositório:
   ```bash
   git clone https://github.com/Drumblow/modularcompany.git
   cd modularcompany
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o banco de dados:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Acesse a aplicação em [http://localhost:3000](http://localhost:3000)

## 👥 Usuários de Teste

Durante o desenvolvimento, você pode usar os seguintes usuários de teste:

| E-mail | Senha | Perfil |
|--------|-------|--------|
| dev@example.com | password | Desenvolvedor |
| admin@example.com | password | Administrador |
| manager@example.com | password | Gerente |
| employee@example.com | password | Funcionário |

## 🔜 Próximos Passos

- Implementação de mais módulos (Tarefas, Despesas, Férias)
- Sistema de notificações em tempo real com WebSockets
- Tema escuro e melhorias de acessibilidade
- Melhorias no módulo de pagamentos

## 📝 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes. 