import { db } from '../../database/drizzel'


export class TagService {
    static async getTags() {
        const tags = await db.query.tags.findMany();
        return tags;
    }

}