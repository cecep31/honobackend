import { describe, it, expect, mock } from 'bun:test';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { errorHandler } from '../middlewares/errorHandler';

mock.module('../middlewares/auth', () => ({
  auth: async (c: any, next: any) => {
    c.set('user', {
      user_id: 'test-user-id',
      email: 'test@example.com',
      is_super_admin: false,
    });
    await next();
  },
}));

// Mock the user service
mock.module('../services/index', () => ({
  userService: {
    updateUserImage: mock(async (userId, image) => {
      return {
        id: userId,
        image: `https://fake-s3.com/avatars/${userId}/${image.name}`,
      };
    }),
  },
}));

const { userController } = await import('../modules/users/controllers/userController');
const { userService } = await import('../services');

describe('User Image Update Endpoint', () => {
  const app = new Hono();
  app.onError(errorHandler());
  app.route('/users', userController); // Use the userController directly
  const client = testClient(app);

  it('should update user image successfully', async () => {
    // 1. Create a mock image file
    const mockImage = new File(['mock-image-content'], 'profile.png', { type: 'image/png' });

    // 2. Create FormData and append the mock image
    const formData = new FormData();
    formData.append('image', mockImage);

    // 3. Send a PATCH request to the endpoint with an Authorization header
    const res = await client.users['me'].image.$patch(
      {
        form: {
          image: mockImage,
        },
      },
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    // 4. Assert the response
    expect(res.status).toBe(200);
    const jsonResponse = await res.json();
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.message).toBe('Profile image updated successfully');
    expect(jsonResponse.data.id).toBe('test-user-id');
    expect(jsonResponse.data.image).toContain('profile.png');

    // 5. Verify that the service method was called
    expect(userService.updateUserImage).toHaveBeenCalled();
  });

  it('should return a validation error for invalid file type', async () => {
    const mockFile = new File(['invalid-file'], 'document.pdf', { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('image', mockFile);

    const res = await client.users['me'].image.$patch(
      {
        form: {
          image: mockFile,
        },
      },
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    expect(res.status).toBe(400); // Expect 400 for validation errors
    const jsonResponse = await res.json();
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.message).toBe('Validation failed');
    expect(jsonResponse.error.details[0].message).toContain('.jpg, .jpeg, .png and .webp files are accepted.');
  });
});
