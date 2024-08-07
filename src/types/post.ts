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
