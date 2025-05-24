export type MateriasEscolares = 'Matemática' | 'Química' | 'Física' | 'Biologia' | 'História' | 'Geografia' | 'Português' | 'Inglês' | 'Sociologia' | 'Filosofia' | 'Educação Física' | 'Artes' | 'Literatura' | 'Espanhol';

export interface Post {
    title: string
    content: string
    author: number
    materia?: MateriasEscolares
}