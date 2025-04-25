/**
 * Utilitário de logging que exibe mensagens apenas em ambiente de desenvolvimento
 */

/**
 * Função para logs de desenvolvimento
 * Exibe logs apenas quando NODE_ENV !== 'production'
 * 
 * @param message Mensagem do log
 * @param data Dados adicionais opcionais para o log
 */
export const devLog = (message: string, data?: any) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

/**
 * Função para logs de warning em desenvolvimento
 * Exibe warnings apenas quando NODE_ENV !== 'production'
 * 
 * @param message Mensagem do warning
 * @param data Dados adicionais opcionais para o warning
 */
export const devWarn = (message: string, data?: any) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    if (data !== undefined) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }
};

/**
 * Função para logs de erro em desenvolvimento
 * Exibe erros apenas quando NODE_ENV !== 'production'
 * 
 * @param message Mensagem do erro
 * @param data Dados adicionais opcionais para o erro
 */
export const devError = (message: string, data?: any) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    if (data !== undefined) {
      console.error(message, data);
    } else {
      console.error(message);
    }
  }
};

/**
 * Função para logs críticos que devem aparecer mesmo em produção
 * Use apenas para informações essenciais e não-sensíveis
 * 
 * @param message Mensagem do log
 * @param data Dados adicionais opcionais para o log
 */
export const logCritical = (message: string, data?: any) => {
  if (data !== undefined) {
    console.log(`[CRITICAL] ${message}`, data);
  } else {
    console.log(`[CRITICAL] ${message}`);
  }
}; 