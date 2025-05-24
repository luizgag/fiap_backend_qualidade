export class RequiredFields {
    constructor (private readonly data: any) {
        this.data = data
    }

    handle (type: 'login' | 'register'): boolean {
        const requiredFields = type === 'login' ? ['email', 'senha'] : ['nome', 'email', 'senha', 'confirmacao_senha', 'tipo_usuario']
        for (const field of requiredFields) {
            if (!this.data[field]) return false
        }
        // Validação adicional para tipo_usuario
        if (type === 'register' && !['aluno', 'professor'].includes(this.data.tipo_usuario)) {
            return false
        }
        return true
    }
}