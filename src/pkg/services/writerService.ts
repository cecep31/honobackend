import { UserRepository } from "../repository/userRepository";

export class WritetService {
    userrepository: UserRepository;
    constructor(){
        this.userrepository = new UserRepository()
    } 
    async getWriterByUsername(username: string) {
        const user = await this.userrepository.getUserByUsername(username);
        return user
    }
}