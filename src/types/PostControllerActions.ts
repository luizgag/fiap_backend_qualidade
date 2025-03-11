import { Post, ReadParams } from "./"

export interface PostControllerActions {
    read ({ id, search }: ReadParams): Promise<Post[]>
    create (data: Post): Promise<number>
    update (id: number,  data: Partial<Post>): Promise<Post>
    delete (id: number): Promise<Post>

}