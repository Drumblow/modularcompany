# Componentes React Native para ModularCompany

Esta pasta contém os componentes React Native (Expo) para a versão nativa iOS do ModularCompany.

## Estrutura

```
native/
├── components/        # Componentes reutilizáveis
├── screens/           # Telas da aplicação
├── navigation/        # Configuração de navegação
└── utils/             # Utilitários para a versão nativa
```

## Implementação

A implementação mobile nativa seguirá a mesma estrutura da versão web, mantendo a mesma organização de componentes e lógica de negócio.

### Princípios de desenvolvimento

1. **Reutilização de lógica**: A lógica de negócio será compartilhada entre as versões web e nativa
2. **Componentização**: Componentes serão desenvolvidos seguindo o mesmo padrão da versão web
3. **API unificada**: As mesmas APIs serão utilizadas tanto na versão web quanto na nativa

### Mapeamento de componentes web para nativos

| Web Component | Native Component |
|---------------|------------------|
| Card          | Card.tsx         |
| Button        | Button.tsx       |
| Input         | Input.tsx        |
| Table         | Table.tsx        |
| DatePicker    | DatePicker.tsx   |

## Configuração do Expo

Para iniciar o desenvolvimento da aplicação nativa:

1. Instalar o Expo CLI: `npm install -g expo-cli`
2. Iniciar o projeto: `expo init ModularCompanyApp`
3. Copiar os componentes nativos para a pasta do projeto
4. Configurar as rotas e a navegação
5. Implementar a integração com as APIs existentes

## Integração com APIs

A versão nativa utilizará as mesmas APIs da versão web, apenas adaptando as chamadas para o ambiente React Native. Os endpoints e a lógica de negócio permanecem os mesmos. 