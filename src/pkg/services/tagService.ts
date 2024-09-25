import { tagRepository } from "../repository/tagRepository";

export class TagService {
  constructor(private tagropository: tagRepository) {}
  async getTags() {
    return await this.tagropository.getTags();
  }
}
