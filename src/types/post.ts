import type { Tag } from "./tag";
import type { User } from "./user";

export interface PostBase {
  title: string;
  body: string;
  slug: string;
  photo_url: string | null;
  published: boolean;
}

export interface PostCreate extends PostBase {
  created_by: string;
}

export interface PostCreateBody extends PostBase {
  tags: string[];
}

export interface PostResponse extends PostBase {
  id: string;
  created_at: string;
  updated_at: string;
  creator: User;
  tags: Tag[];
}
