export type User = {
    id: number
    nome: string
    email: string
    senha: string
    tipo_usuario: 'aluno' | 'professor'
}