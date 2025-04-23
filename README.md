# ModularCompany

Um sistema modular para gerenciamento de empresas, com diferentes níveis de acesso e módulos personalizáveis.

## Atualizações Recentes

### 📅 Correção no Sistema de Detecção de Conflitos de Horários

**Problema resolvido:**
- Identificamos e corrigimos um bug no sistema de detecção de conflitos de horários, onde os registros recém-criados (com status `approved: null`) não estavam sendo incluídos corretamente na verificação de sobreposição.
- Isso permitia que funcionários criassem registros sobrepostos quando um deles acabava de ser criado.

**Melhorias implementadas:**
- Modificamos a lógica de filtro para usar `rejected: false` em vez de `rejected: { not: true }`, garantindo que todos os registros não rejeitados sejam considerados.
- Removemos a filtragem por `approved` para incluir registros pendentes (com `approved: null`) na verificação.
- Adicionamos logs mais detalhados para facilitar o diagnóstico de problemas futuros.

**Arquivos afetados:**
- `/src/app/api/time-entries/route.ts` (método POST)
- `/src/app/api/time-entries/[id]/route.ts` (método PUT)

## Visão Geral

O ModularCompany é uma plataforma que permite o gerenciamento completo de empresas através de módulos personalizáveis. O sistema possui quatro níveis de acesso:

1. **Desenvolvedor**: Responsável por cadastrar empresas e gerenciar o acesso e pagamentos.
2. **Administrador**: Gerencia a empresa, escolhe módulos, cadastra gerentes e funcionários.
3. **Gerente**: Gerencia funcionários e tem acesso a relatórios.
4. **Funcionário**: Acessa os serviços específicos para funcionários.

## Módulos

O sistema é construído de forma modular, permitindo a adição de novos módulos conforme necessário. O primeiro módulo implementado é:

### Módulo de Controle de Horas

- Permite que funcionários registrem suas horas trabalhadas
- Calcula automaticamente o total de horas
- Gera relatórios para gerentes e administradores
- Permite definir o valor da hora de cada funcionário para cálculos financeiros

### Registro de Horas

O módulo de registro de horas permite que funcionários registrem suas horas trabalhadas, e gestores aprovem ou rejeitem esses registros. Também inclui relatórios detalhados de horas trabalhadas.

#### Funcionalidades

- **Funcionários**:
  - Registrar horas trabalhadas com data, hora de início e término
  - Visualizar histórico de registros
  - Adicionar observações aos registros

- **Gestores**:
  - Aprovar ou rejeitar registros de horas
  - Visualizar relatórios de horas por funcionário
  - Calcular custos com base nas taxas horárias

- **Administradores**:
  - Visualizar todos os registros e relatórios
  - Acessar dados consolidados da empresa

#### Páginas

- `/dashboard/employee/time-entries` - Registro de horas para funcionários
- `/dashboard/manager/time-entries` - Aprovação de horas e relatórios para gestores
- `/dashboard/admin/time-entries` - Relatórios completos para administradores

## Tecnologias Utilizadas

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: API Routes do Next.js
- **Banco de Dados**: Prisma ORM com SQLite (pode ser facilmente migrado para PostgreSQL, MySQL, etc.)
- **Autenticação**: NextAuth.js

## Estrutura do Projeto

```
src/
├── app/                    # Rotas e páginas da aplicação
│   ├── dashboard/          # Dashboards para diferentes níveis de acesso
│   │   ├── developer/      # Dashboard do desenvolvedor
│   │   ├── admin/          # Dashboard do administrador
│   │   ├── manager/        # Dashboard do gerente
│   │   └── employee/       # Dashboard do funcionário
├── components/             # Componentes reutilizáveis
│   ├── ui/                 # Componentes de UI básicos
│   ├── modules/            # Componentes específicos de módulos
│   └── layouts/            # Layouts reutilizáveis
├── lib/                    # Bibliotecas e utilitários
│   └── prisma/             # Cliente Prisma para o banco de dados
└── types/                  # Definições de tipos TypeScript
```

## Instalação e Execução

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/modular-company.git
   cd modular-company
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o banco de dados:
   ```bash
   npx prisma migrate dev --name init
   ```

4. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Acesse a aplicação em [http://localhost:3000](http://localhost:3000)

## Próximos Passos

- Implementação de autenticação completa
- Desenvolvimento de novos módulos
- Melhorias na interface do usuário
- Implementação de testes automatizados

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes. 