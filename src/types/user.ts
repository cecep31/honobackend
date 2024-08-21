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
    username: string
    email: string
    password: string
}
export interface UserSignup extends UserBase {
}

export interface UserCreateBody extends UserBase {
    first_name: string
    last_name: string
    username: string
    image: string
    issuperadmin: boolean
}

export interface UserCreate extends UserBase {
    issuperAdmin: boolean
    first_name: string
    last_name: string
    image: string
}

export interface userLogin {
    id: string | null
    username: string | null
    email: string | null
    password: string | null
    issuperadmin: boolean | null
}