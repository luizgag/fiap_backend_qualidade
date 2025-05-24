import { EmailValidator } from "./EmailValidator"
import { RequiredFields } from "./RequiredFields"

export class LoginValidator {
    constructor (private readonly data: { email: string, senha: string }) {
        this.data = data
    }

    handle () {
        const requiredFields = new RequiredFields(this.data).handle('login')
        if (!requiredFields) {
            return { validate: false, step: 'requiredFields' }
        }

        const  { email, senha } = this.data

        const emailValidator = new EmailValidator(email)
        if (!emailValidator) {
            return { validate: false, step: 'emailValidator' }
        }

        return { validate: true, step: 'success' }
    }
}