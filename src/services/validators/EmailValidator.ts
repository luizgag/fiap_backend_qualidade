import validator from 'email-validator';

export class EmailValidator {
    constructor (private readonly email: string) {
        this.email = email
    }

    handle (): boolean {
        return validator.validate(this.email);
    }
}