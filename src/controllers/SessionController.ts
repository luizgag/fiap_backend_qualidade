import { DB } from "../infra/db/db";

export class SessionController {
    private db: DB;

    constructor() {
        this.db = new DB();
    }

    async create(data: { userId: number, refreshTokenHash: string, expiresAt: string, ip: string, userAgent: string }): Promise<void> {
        await this.db.createSession(data)
    }

    async delete(refreshTokenHash: string): Promise<string> {
        await this.db.deleteSession(refreshTokenHash);
        return refreshTokenHash;
    }

    async read(refreshTokenHash: string): Promise<{ userId: number, expiresAt: string } | null> {
        const session = await this.db.querySession(refreshTokenHash)
        return session;
    }

    async update(refreshTokenHash: string, data: { expiresAt: string }): Promise<void> {
        await this.db.updateSession(refreshTokenHash, data)
    }
}