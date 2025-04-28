# Documentação da API Mobile do ModularCompany

## Visão Geral

Esta documentação descreve os endpoints específicos criados para aplicativos móveis se comunicarem com a API do ModularCompany. Esses endpoints foram projetados para funcionar com aplicativos React Native e outras plataformas móveis.

## Base URL

```
https://modularcompany.vercel.app/api
```

## Autenticação

### Login

**Endpoint:** `/mobile-auth`

**Método:** `POST`

**Body:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123456",
    "name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "role": "EMPLOYEE",
    "companyId": "789012"
  }
}
```

**Resposta de Erro (401):**
```json
{
  "error": "Credenciais inválidas"
}
```

### Utilização do Token

Após receber o token, inclua-o no cabeçalho `Authorization` para todas as requisições subsequentes:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

O token expira após 24 horas, exigindo um novo login.

## Endpoints

### Perfil do Usuário

**Endpoint:** `/mobile-profile`

**Método:** `GET`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200):**
```json
{
  "user": {
    "id": "123456",
    "name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "role": "EMPLOYEE",
    "companyId": "789012",
    "hourlyRate": 50,
    "createdAt": "2023-01-15T10:30:00",
    "company": {
      "id": "789012",
      "name": "Empresa Exemplo",
      "plan": "STANDARD"
    }
  }
}
```

### Registros de Horas

#### Listar Registros

**Endpoint:** `/mobile-time-entries`

**Método:** `GET`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters (opcionais):**
- `startDate`: Data inicial no formato ISO (YYYY-MM-DD)
- `endDate`: Data final no formato ISO (YYYY-MM-DD)

Se não especificado, retorna registros do mês atual.

**Resposta de Sucesso (200):**
```json
{
  "timeEntries": [
    {
      "id": "entry123",
      "date": "2023-04-15",
      "startTime": "2023-04-15T09:00:00",
      "endTime": "2023-04-15T17:00:00",
      "totalHours": 8,
      "observation": "Desenvolvimento de features",
      "project": "ModularCompany",
      "approved": true,
      "rejected": null,
      "rejectionReason": null,
      "userId": "123456",
      "createdAt": "2023-04-15T08:50:00",
      "updatedAt": "2023-04-15T17:10:00"
    }
  ],
  "period": {
    "startDate": "2023-04-01",
    "endDate": "2023-04-30"
  }
}
```

#### Criar Registro

**Endpoint:** `/mobile-time-entries`

**Método:** `POST`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "date": "2023-04-16",
  "startTime": "2023-04-16T09:00:00",
  "endTime": "2023-04-16T17:00:00",
  "observation": "Implementação de nova feature",
  "project": "ModularCompany Mobile"
}
```

**Resposta de Sucesso (201):**
```json
{
  "timeEntry": {
    "id": "entry124",
    "date": "2023-04-16",
    "startTime": "2023-04-16T09:00:00",
    "endTime": "2023-04-16T17:00:00",
    "totalHours": 8,
    "observation": "Implementação de nova feature",
    "project": "ModularCompany Mobile",
    "approved": null,
    "rejected": null,
    "rejectionReason": null,
    "userId": "123456",
    "createdAt": "2023-04-16T08:55:00",
    "updatedAt": "2023-04-16T08:55:00"
  }
}
```

**Resposta de Erro - Conflito (409):**
```json
{
  "error": "Existe um conflito de horário com um registro existente",
  "conflictingEntry": {
    "id": "entry123",
    "date": "2023-04-16",
    "startTime": "08:30",
    "endTime": "12:30"
  }
}
```

## Implementação no React Native

### Exemplos de Código

#### Configuração do Cliente API

```javascript
// api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://modularcompany.vercel.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token a todas as requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@ModularCompany:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
```

#### Login

```javascript
// authService.js
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = async (email, password) => {
  try {
    const response = await api.post('/mobile-auth', { email, password });
    const { token, user } = response.data;
    
    // Salvar token e dados do usuário
    await AsyncStorage.setItem('@ModularCompany:token', token);
    await AsyncStorage.setItem('@ModularCompany:user', JSON.stringify(user));
    
    return { success: true, user };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Erro ao fazer login' 
    };
  }
};

export const logout = async () => {
  await AsyncStorage.removeItem('@ModularCompany:token');
  await AsyncStorage.removeItem('@ModularCompany:user');
};

export const getProfile = async () => {
  try {
    const response = await api.get('/mobile-profile');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Erro ao obter perfil' 
    };
  }
};
```

#### Manipulação de Registros de Horas

```javascript
// timeEntryService.js
import api from './api';
import { format } from 'date-fns';

export const getTimeEntries = async (startDate, endDate) => {
  try {
    let url = '/mobile-time-entries';
    const params = [];
    
    if (startDate) {
      params.push(`startDate=${format(startDate, 'yyyy-MM-dd')}`);
    }
    
    if (endDate) {
      params.push(`endDate=${format(endDate, 'yyyy-MM-dd')}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await api.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Erro ao buscar registros' 
    };
  }
};

export const createTimeEntry = async (timeEntry) => {
  try {
    const response = await api.post('/mobile-time-entries', timeEntry);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Erro ao criar registro',
      conflictingEntry: error.response?.data?.conflictingEntry
    };
  }
};
```

## Observações Importantes

1. **Tratamento de Erros**: Sempre verifique os códigos de status e trate os erros adequadamente.
2. **Expiração do Token**: O token expira após 24 horas. Implemente lógica para detectar expiração e redirecionar para login.
3. **Formatação de Datas**: As datas são enviadas e recebidas em formato ISO. Use bibliotecas como `date-fns` para manipulação.
4. **CORS**: Os endpoints possuem CORS configurado para permitir requisições de qualquer origem.
5. **Validação**: Implementamos validação básica no servidor, mas é recomendável validar os dados também no cliente.

## Suporte

Para questões e problemas relacionados à API, entre em contato com a equipe de desenvolvimento do ModularCompany. 