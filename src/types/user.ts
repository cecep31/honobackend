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

interface UserBase {
    first_name: string
    last_name: string
    email: string
    password: string
    image: string
}

export interface UserCreateBody extends UserBase {

}

export interface UserCreate extends UserBase {
    isSuperAdmin: boolean
}