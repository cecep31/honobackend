import { UserRepository } from "../repository/userRepository";

export class WritetService {
    private userrepository: UserRepository;
    constructor(){
        this.userrepository = new UserRepository()
    } 
    async getWriterByUsername(username: string) {
        const user = await this.userrepository.getUserByUsernameProfile(username);
        return user
    }
}