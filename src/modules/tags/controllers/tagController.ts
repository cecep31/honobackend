import { Hono } from 'hono';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';

type TagService = AppServices['tagService'];

export const createTagController = (tagService: TagService) => {
  const tagController = new Hono<{ Variables: Variables }>();

  tagController.get('/', async (c) => {
    const tags = await tagService.getTags();
    return sendSuccess(c, tags, 'Tags fetched successfully');
  });

  return tagController;
};
