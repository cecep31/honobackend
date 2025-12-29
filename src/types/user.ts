export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  image: string;
  is_super_admin: boolean;
}

export interface PostUser {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  image: string;
}

interface UserBase {
  username: string;
  email: string;
  password: string;
}
export interface UserSignup extends UserBase {}

export interface UserCreateBody extends UserBase {
  first_name: string;
  last_name: string;
  username: string;
  image: string;
  is_super_admin: boolean;
}

export interface UserCreate extends UserBase {
  is_super_admin: boolean;
  first_name: string;
  last_name: string;
  image: string;
}

export interface userLogin {
  id: string | null;
  username: string | null;
  email: string | null;
  password: string | null;
  is_super_admin: boolean | null;
}

export interface GithubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string | null;
  hireable: boolean;
  bio: string;
  twitter_username: string | null;
  notification_email: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  private_gists: number;
  total_private_repos: number;
  owned_private_repos: number;
  disk_usage: number;
  collaborators: number;
  two_factor_authentication: boolean;
  plan: {
    name: string;
    space: number;
    collaborators: number;
    private_repos: number;
  };
}
