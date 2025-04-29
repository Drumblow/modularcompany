import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Configuração do transportador de email
export const transporter = nodemailer.createTransport({
  // Em ambiente de desenvolvimento, usamos um serviço de teste
  // Em produção, você deve configurar um serviço real como:
  // host: 'smtp.example.com',
  // port: 587,
  // secure: false,
  // auth: {
  //   user: process.env.EMAIL_USER,
  //   pass: process.env.EMAIL_PASSWORD
  // }
  
  // Para desenvolvimento e testes, usamos o "ethereal.email"
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: process.env.TEST_EMAIL_USER || 'test@ethereal.email',
    pass: process.env.TEST_EMAIL_PASS || 'testpassword'
  }
});

// Função para enviar email
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Em desenvolvimento, apenas logamos a mensagem em vez de enviar
    if (process.env.NODE_ENV !== 'production') {
      console.log('======= EMAIL SERIA ENVIADO =======');
      console.log(`Para: ${options.to}`);
      console.log(`Assunto: ${options.subject}`);
      console.log(`Texto: ${options.text}`);
      console.log('==================================');
      return;
    }
    
    // Configurar email a ser enviado
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@modularcompany.com',
      ...options
    };
    
    // Enviar email
    await transporter.sendMail(mailOptions);
    
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw new Error('Falha ao enviar email');
  }
} 