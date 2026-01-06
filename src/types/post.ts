export interface PostBase {
  title: string;
  body: string;
  slug: string;
  photo_url: string | null;
  published: boolean;
}

export interface PostCreateBody extends PostBase {
  tags: string[];
}

