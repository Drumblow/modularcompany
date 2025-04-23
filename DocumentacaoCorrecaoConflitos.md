# Documentação da Correção do Sistema de Detecção de Conflitos

## 📝 Resumo do Problema

O sistema de detecção de conflitos em horários no módulo de Controle de Horas apresentava uma falha importante. Quando um funcionário registrava suas horas trabalhadas, a verificação de conflitos funcionava corretamente para registros já aprovados, mas **não detectava corretamente sobreposições com registros recém-criados** (que possuem o status `approved: null`).

Isso permitia que um funcionário criasse múltiplos registros sobrepostos de maneira sequencial, desde que cada um ainda não tivesse sido aprovado ou rejeitado.

## 🔍 Causa Raiz Identificada

Ao analisar o código, identificamos que o problema estava na consulta ao banco de dados que buscava os registros existentes para comparação:

1. Na rota POST (`/api/time-entries`), a verificação usava `rejected: { not: true }`, mas isso não incluía explicitamente registros com `approved: null`.

2. Na rota PUT (`/api/time-entries/[id]`), havia uma filtragem explícita por:
   ```js
   OR: [
     { approved: true },
     { approved: null },
   ]
   ```
   E também usava `rejected: { not: true }`.

3. O modelo de dados no Prisma define `approved` e `rejected` como campos opcionais (`Boolean?`), que podem ser `true`, `false` ou `null`.

## ✅ Solução Implementada

### Primeira Tentativa de Correção
1. **Modificação na rota POST**:
   - Alteramos a consulta para usar `rejected: false`, que captura tanto `rejected: null` quanto `rejected: false`.
   - Removemos qualquer filtragem pelo campo `approved`, garantindo que sejam incluídos todos os registros ainda não rejeitados, independentemente de estarem aprovados ou pendentes.
   - Adicionamos logs que mostram explicitamente o status (`approved` e `rejected`) de cada registro que está sendo verificado.

2. **Modificação na rota PUT**:
   - Substituímos a lógica de filtro `OR` por uma abordagem mais simples usando `rejected: false`.
   - Mantivemos a mesma lógica de filtro adotada na rota POST para consistência.
   - Adicionamos logs similares para diagnóstico.

### Solução Final (Simplificada)
Como a primeira abordagem não resolveu completamente o problema, fizemos uma mudança mais radical:

1. **Simplificação total da consulta**:
   - Removemos **todos** os filtros relacionados a status (`approved` e `rejected`) da consulta ao banco de dados.
   - Agora buscamos **todos** os registros do usuário na data especificada, independentemente de status.
   - A filtragem de registros rejeitados é feita em memória, durante o loop de verificação.

2. **Melhorias adicionais**:
   - Adicionamos verificação explícita para ignorar registros rejeitados durante a verificação de sobreposição.
   - Melhoramos significativamente os logs para facilitar o diagnóstico de problemas.
   - Adicionamos mensagens de log mais claras quando detectamos conflitos.
   - Incluímos detalhes adicionais nas informações de conflito retornadas ao usuário.

3. **Diagnóstico aprimorado**:
   - Agora o sistema registra explicitamente quando está bloqueando a criação ou atualização de um registro.
   - Os logs mostram claramente quais registros são ignorados (rejeitados) e quais são considerados para verificação.
   - Os detalhes dos conflitos incluem informações sobre o status do registro conflitante.

## 🧪 Como Testar a Correção

Para verificar se a correção foi bem-sucedida, realize os seguintes testes:

1. **Teste de sobreposição com registro recém-criado**:
   - Faça login como funcionário
   - Crie um registro de horas (ex: das 9:00 às 12:00)
   - Tente criar imediatamente outro registro que sobreponha (ex: das 11:00 às 14:00)
   - O sistema deve bloquear a criação e mostrar uma mensagem de conflito

2. **Teste de sobreposição com registro pendente**:
   - Crie um registro (ex: das 13:00 às 15:00) 
   - Faça logout e entre como gerente/admin
   - Navegue até a lista de registros mas não aprove nem rejeite
   - Faça logout e entre novamente como funcionário
   - Tente criar um registro sobreposto (ex: das 14:00 às 16:00)
   - O sistema deve bloquear a criação

3. **Teste de edição com sobreposição**:
   - Crie dois registros não-sobrepostos (ex: 8:00-10:00 e 11:00-12:00)
   - Tente editar o segundo registro para sobrepor o primeiro (ex: mudar para 9:00-12:00)
   - O sistema deve impedir a edição

4. **Teste com registro rejeitado**:
   - Crie um registro (ex: das 9:00 às 12:00)
   - Faça logout e entre como gerente/admin
   - Rejeite este registro
   - Faça logout e entre novamente como funcionário
   - Tente criar um registro no mesmo horário (ex: das 9:00 às 12:00)
   - O sistema deve permitir a criação, pois o registro anterior foi rejeitado

## 📊 Logs para Diagnóstico

Adicionamos logs detalhados que podem ser consultados ao tentar criar ou editar registros. Estes logs mostram:

- Quantidade de registros encontrados para verificação (todos na mesma data)
- Quais registros foram ignorados por já estarem rejeitados
- Detalhes de cada registro (horários, status aprovado/rejeitado)
- Comparação exata entre os horários verificados (em horas e minutos)
- Casos de sobreposição detectados
- Mensagens claras quando um registro está sendo bloqueado

Exemplo:
```
[DETECÇÃO DE CONFLITO] Encontrados 3 registros existentes para verificação
[DETECÇÃO DE CONFLITO] Ignorando registro 123e4567 pois foi rejeitado
[DETECÇÃO DE CONFLITO] Verificando registro: id=abc123, data=2023-05-15, startTime=09:00, endTime=12:00
[DETECÇÃO DE CONFLITO] Em minutos: Novo [660-780], Existente [540-720]
[DETECÇÃO DE CONFLITO] Status do registro existente: approved=null, rejected=null
[DETECÇÃO DE CONFLITO] CONFLITO DETECTADO com registro abc123!
[DETECÇÃO DE CONFLITO] Status do registro em conflito: approved=null, rejected=null
[DETECÇÃO DE CONFLITO] Motivo: Novo horário começa durante um registro existente
[DETECÇÃO DE CONFLITO] ======== BLOQUEANDO CRIAÇÃO DE NOVO REGISTRO ========
[DETECÇÃO DE CONFLITO] Motivo: 1 conflitos de horário detectados
[DETECÇÃO DE CONFLITO] Horário solicitado: 2023-05-15 11:00-13:00
```

## 📌 Considerações Adicionais

- A correção mantém todas as funcionalidades existentes, apenas garantindo que os conflitos sejam detectados corretamente.
- A abordagem mais simples (sem filtros por status na consulta) é mais robusta e menos propensa a erros de interpretação do Prisma.
- Esta correção não afeta qualquer outra parte do sistema além da detecção de conflitos de horários.
- Os logs adicionados podem ser reduzidos no futuro, mas são úteis para verificar a eficácia da solução.

## 👥 Responsáveis pela Correção

- Data da Correção: [DATA ATUAL]
- Desenvolvedor: [SEU NOME] 