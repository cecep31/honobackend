import { tagRepository } from '../repository/tagRepository';

export class TagService {
    private tagropository: tagRepository;
    constructor() {
        this.tagropository = new tagRepository();
    }
    async getTags() {
        return await this.tagropository.getTags();
    }

}