import { User } from "./"

export interface UserControllerActions {
    read (email: string): Promise<User | null>
    create (data: User): Promise<number>
    update (id: number,  data: Partial<User>): Promise<User>
    delete (id: number): Promise<User>

}