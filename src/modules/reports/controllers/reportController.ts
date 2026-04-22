import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import { createSuperAdminMiddleware } from '../../../middlewares/superAdmin';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';
import {
  userReportQuerySchema,
  postReportQuerySchema,
  dateRangeQuerySchema,
} from '../validation/query';
import type { UserService } from '../../users/services/userService';

type ReportService = AppServices['reportService'];

export const createReportController = (
  userService: UserService,
  reportService: ReportService
) => {
  const superAdminMiddleware = createSuperAdminMiddleware(userService);

  return new Hono<{ Variables: Variables }>()
    .get(
      '/overview',
      auth,
      superAdminMiddleware,
      validateRequest('query', dateRangeQuerySchema),
      async (c) => {
        const query = c.req.valid('query');

        const [overviewStats, engagementMetrics] = await Promise.all([
          reportService.getOverviewStats(),
          reportService.getEngagementMetrics({
            startDate: query.startDate,
            endDate: query.endDate,
          }),
        ]);

        return sendSuccess(
          c,
          {
            overview: overviewStats,
            engagement: engagementMetrics,
          },
          'Overview report fetched successfully'
        );
      }
    )

    .get(
      '/users',
      auth,
      superAdminMiddleware,
      validateRequest('query', userReportQuerySchema),
      async (c) => {
        const query = c.req.valid('query');

        const report = await reportService.getUserReport(
          {
            startDate: query.startDate,
            endDate: query.endDate,
          },
          query.limit
        );

        return sendSuccess(c, report, 'User report fetched successfully');
      }
    )

    .get(
      '/posts',
      auth,
      superAdminMiddleware,
      validateRequest('query', postReportQuerySchema),
      async (c) => {
        const query = c.req.valid('query');

        const report = await reportService.getPostReport(
          {
            startDate: query.startDate,
            endDate: query.endDate,
          },
          query.limit,
          query.tagId
        );

        return sendSuccess(c, report, 'Post report fetched successfully');
      }
    )

    .get(
      '/engagement',
      auth,
      superAdminMiddleware,
      validateRequest('query', dateRangeQuerySchema),
      async (c) => {
        const query = c.req.valid('query');

        const metrics = await reportService.getEngagementMetrics({
          startDate: query.startDate,
          endDate: query.endDate,
        });

        return sendSuccess(c, metrics, 'Engagement metrics fetched successfully');
      }
    );
};
