import { users } from '../../database/schemas/postgres/schema';

/** Column selection when user is loaded as a nested relation (not the primary resource). */
export const USER_RELATION_COLUMNS = {
  id: true,
  username: true,
  email: true,
  image: true,
} as const;

/** Nested user fields for db.select() joins. */
export const userRelationSelect = {
  id: users.id,
  username: users.username,
  email: users.email,
  image: users.image,
} as const;
