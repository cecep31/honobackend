export interface User {
    id: string
    first_name: string
    last_name: string
    email: string
    password: string
    image: string
    isSuperAdmin: boolean
}

export interface PostUser {
    first_name: string
    last_name: string
    email: string
    password: string
    image: string
}