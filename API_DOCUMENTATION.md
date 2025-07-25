# API Documentation

## Swagger Documentation

A documentação completa da API está disponível através do Swagger UI após iniciar o servidor.

### Acessando a Documentação

1. **Inicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Acesse a documentação:**
   - **Interface Swagger UI:** http://localhost:3001/api-docs
   - **JSON da especificação:** http://localhost:3001/api-docs.json
   - **Para Android emulator:** http://10.0.2.2:3001/api-docs

### Principais Recursos Documentados

#### Autenticação
- `POST /api/register` - Registro de novos usuários
- `POST /api/login` - Autenticação de usuários
- `POST /api/logout` - Logout de usuários

#### Posts
- `GET /api/posts` - Lista todos os posts
- `GET /api/posts/search/{search}` - Busca posts por termo
- `GET /api/posts/{id}` - Busca post específico
- `POST /api/posts` - Cria novo post
- `PUT /api/posts/{id}` - Atualiza post
- `DELETE /api/posts/{id}` - Remove post

#### Comentários
- `GET /api/posts/comentarios/{postId}` - Lista comentários de um post
- `POST /api/posts/comentarios` - Cria novo comentário
- `PUT /api/posts/comentarios/{id}` - Atualiza comentário
- `DELETE /api/posts/comentarios/{id}` - Remove comentário

#### Curtidas
- `GET /api/posts/like/{postId}` - Lista curtidas de um post
- `POST /api/posts/like` - Adiciona curtida
- `PUT /api/posts/like/{postId}` - Alterna curtida
- `DELETE /api/posts/like/{postId}` - Remove curtida

#### Usuários
- `GET /api/users/{id}` - Busca usuário por ID

### Modelos de Dados Alinhados

A documentação reflete os modelos alinhados entre API e banco de dados:

#### Post
```typescript
{
  id?: number
  title: string
  content: string
  author_id: number  // Alinhado com o banco de dados
}
```

#### Comment
```typescript
{
  id?: number
  post_id: number
  user_id: number      // Alinhado com o banco de dados
  comentario: string   // Alinhado com o banco de dados
  resposta_id?: number
  created_at?: string
}
```

#### User
```typescript
{
  id: number
  nome: string
  email: string
  tipo_usuario: 'aluno' | 'professor'
}
```

### Autenticação

A API utiliza dois tipos de tokens:

1. **Access Token (JWT):** 
   - Enviado no header `accessToken`
   - Válido por 15 minutos
   - Necessário para todas as rotas exceto `/login` e `/register`

2. **Refresh Token:**
   - Enviado como cookie HTTP-only
   - Válido por 7 dias
   - Usado para renovação de sessão

### Mudanças Importantes (Breaking Changes)

Como parte do alinhamento API-Database, os seguintes campos foram alterados:

- **Posts:** `author` → `author_id`
- **Comments:** `author_id` → `user_id`, `content` → `comentario`

Essas mudanças estão documentadas na especificação Swagger para facilitar a migração de clientes da API.

### Testando a API

Use a interface Swagger UI para:
- Visualizar todos os endpoints disponíveis
- Testar requisições diretamente no navegador
- Ver exemplos de request/response
- Entender os esquemas de dados
- Verificar códigos de status e mensagens de erro

### Desenvolvimento

Para adicionar documentação a novos endpoints:

1. Adicione comentários JSDoc com `@swagger` no arquivo de rotas
2. Defina schemas no arquivo `src/infra/swagger/swagger.ts`
3. A documentação será atualizada automaticamente