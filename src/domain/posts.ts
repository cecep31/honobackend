import type { Tag } from "./tag";
import type { User } from "./user";

export interface postResponse {
  id: string;
  title: string;
  body: string;
  slug: string;
  photo_url: string | null;
  created_at: string;
  published: boolean;
  creator: User;
  tags: Tag[];
}
