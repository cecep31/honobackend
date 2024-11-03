import { TagRepository } from "../repository/tagRepository";

export class TagService {
  constructor(private tagrepository: TagRepository) {}
  async getTags() {
    return await this.tagrepository.getTags();
  }
}
