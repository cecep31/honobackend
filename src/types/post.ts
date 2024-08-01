interface PostBase {
  title: string;
  body: string;
  slug: string;
  photo_url: string | null;
  published: boolean;
}

interface PostCreate extends PostBase {
  created_by: string;
}

interface PostCreateBody extends PostBase {
  tags: string[];
}
