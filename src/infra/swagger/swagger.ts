import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FIAP Backend API',
      version: '1.0.0',
      description: 'API para sistema de posts e comentários com autenticação',
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Servidor de desenvolvimento',
      },
      {
        url: 'http://10.0.2.2:3001/api',
        description: 'Servidor para Android emulator',
      },
    ],
    components: {
      securitySchemes: {
        AccessToken: {
          type: 'apiKey',
          in: 'header',
          name: 'accessToken',
          description: 'Token de acesso JWT para autenticação',
        },
        RefreshToken: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Token de refresh para renovação de sessão',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único do usuário',
            },
            nome: {
              type: 'string',
              description: 'Nome completo do usuário',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
            },
            tipo_usuario: {
              type: 'string',
              enum: ['aluno', 'professor'],
              description: 'Tipo de usuário no sistema',
            },
          },
          required: ['nome', 'email', 'tipo_usuario'],
        },
        Post: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único do post',
            },
            title: {
              type: 'string',
              description: 'Título do post',
            },
            content: {
              type: 'string',
              description: 'Conteúdo do post',
            },
            author_id: {
              type: 'integer',
              description: 'ID do usuário autor do post',
            },
          },
          required: ['title', 'content', 'author_id'],
        },
        Comment: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único do comentário',
            },
            post_id: {
              type: 'integer',
              description: 'ID do post ao qual o comentário pertence',
            },
            user_id: {
              type: 'integer',
              description: 'ID do usuário que fez o comentário',
            },
            comentario: {
              type: 'string',
              description: 'Texto do comentário',
            },
            resposta_id: {
              type: 'integer',
              nullable: true,
              description: 'ID do comentário pai (para respostas)',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data e hora de criação do comentário',
            },
          },
          required: ['post_id', 'user_id', 'comentario'],
        },
        Like: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único da curtida',
            },
            user_id: {
              type: 'integer',
              description: 'ID do usuário que curtiu',
            },
            post_id: {
              type: 'integer',
              description: 'ID do post curtido',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data e hora da curtida',
            },
          },
          required: ['user_id', 'post_id'],
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro',
            },
            step: {
              type: 'string',
              description: 'Etapa onde ocorreu o erro (para validação)',
            },
            missingFields: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Campos obrigatórios ausentes',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            nome: {
              type: 'string',
              description: 'Nome completo do usuário',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
            },
            senha: {
              type: 'string',
              minLength: 6,
              description: 'Senha do usuário',
            },
            tipo_usuario: {
              type: 'string',
              enum: ['aluno', 'professor'],
              description: 'Tipo de usuário',
            },
          },
          required: ['nome', 'email', 'senha', 'tipo_usuario'],
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
            },
            senha: {
              type: 'string',
              description: 'Senha do usuário',
            },
          },
          required: ['email', 'senha'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'Token JWT para autenticação',
            },
          },
        },
      },
    },
    security: [
      {
        AccessToken: [],
      },
    ],
  },
  apis: ['./src/infra/routes/*.ts'], // Caminho para os arquivos com documentação
}

const specs = swaggerJsdoc(options)

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'FIAP Backend API Documentation',
  }))
  
  // Endpoint para obter o JSON da especificação
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(specs)
  })
}