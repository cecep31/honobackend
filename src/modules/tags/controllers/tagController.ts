import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';
import { tagIdParamSchema } from '../validation';

type TagService = AppServices['tagService'];

export const createTagController = (tagService: TagService) => {
  const tagController = new Hono<{ Variables: Variables }>();

  tagController.get('/', async (c) => {
    const tags = await tagService.getTags();
    return sendSuccess(c, tags, 'Tags fetched successfully');
  });

  tagController.get('/sitemap', async (c) => {
    const tags = await tagService.getTagsForSitemap();
    const sitemapTags = tags.map((tag) => ({
      name: tag.name,
      created_at: tag.created_at,
    }));
    return sendSuccess(c, sitemapTags, 'Sitemap tags fetched successfully');
  });

  tagController.get('/following', auth, async (c) => {
    const authUser = c.get('user');
    const tags = await tagService.getFollowedTags(authUser.user_id);
    return sendSuccess(c, tags, 'Followed tags fetched successfully');
  });

  tagController.get(
    '/:tagId/is-following',
    auth,
    validateRequest('param', tagIdParamSchema),
    async (c) => {
      const { tagId } = c.req.valid('param');
      const authUser = c.get('user');
      const following = await tagService.isFollowingTag(authUser.user_id, tagId);
      return sendSuccess(c, { following }, 'Tag follow status fetched successfully');
    }
  );

  tagController.post(
    '/:tagId/follow',
    auth,
    validateRequest('param', tagIdParamSchema),
    async (c) => {
      const { tagId } = c.req.valid('param');
      const authUser = c.get('user');
      const follow = await tagService.followTag(authUser.user_id, tagId);
      return sendSuccess(c, follow, 'Tag followed successfully', 201);
    }
  );

  tagController.delete(
    '/:tagId/follow',
    auth,
    validateRequest('param', tagIdParamSchema),
    async (c) => {
      const { tagId } = c.req.valid('param');
      const authUser = c.get('user');
      const row = await tagService.unfollowTag(authUser.user_id, tagId);
      return sendSuccess(c, row, 'Tag unfollowed successfully');
    }
  );

  return tagController;
};
