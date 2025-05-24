import { EmailValidator } from "./EmailValidator"
import { RequiredFields } from "./RequiredFields"

export class RegisterValidator {

    constructor (private readonly data: { email: string, senha: string, confirmacao_senha: string }) {
        this.data = data
    }

    handle (): { validate: boolean, step: string } {
        const requiredFields = new RequiredFields(this.data).handle('register')
        if (!requiredFields) {
            return { validate: false, step: 'requiredFields' }
        }

        const  { email, senha, confirmacao_senha } = this.data

        const emailValidator = new EmailValidator(email).handle()
        if (!emailValidator) {
            return { validate: false, step: 'emailValidator' }
        }

        if (senha !== confirmacao_senha) {
            return { validate: false, step: 'confirmacaoSenha' }
        }
        
        return { validate: true, step: 'success' }
    }
}