import { DB } from "../infra/db/db";
import { User } from "../types";
import { UserControllerActions } from "../types";

export class UserController implements UserControllerActions {
    private db: DB;

    constructor() {
        this.db = new DB();
    }

    async read(email: string): Promise<User | null> {
        const user = await this.db.queryUser(email);
        return user;
    }

    async create(data: { email: string, nome: string, senha: string, tipo_usuario: 'aluno' | 'professor' }): Promise<number> {
        const userId = await this.db.createUser(data);
        return Number(userId);
    }

    async delete(id: number): Promise<User> {
        const user = await this.db.queryUser(id);
        await this.db.deletePost(id);
        return user
    }

    async update(id: number, data: Partial<User>): Promise<User> {
        const user = await this.db.queryUser(id);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }
        await this.db.updateUser(id, data);
        const updatedUser = await this.db.queryUser(id);
        return updatedUser
    }
}
