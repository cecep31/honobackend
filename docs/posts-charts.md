# Posts Chart Endpoints

This document describes the chart endpoints available for the posts module. These endpoints provide data for visualizing post statistics and engagement metrics in the frontend.

## Endpoints

### 1. Posts Over Time
**GET** `/posts/charts/posts-over-time`

Get the number of posts created over a specified time period, grouped by day, week, or month.

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to look back
- `groupBy` (optional, default: "day") - Grouping interval: "day", "week", or "month"

**Example Request:**
```
GET /posts/charts/posts-over-time?days=60&groupBy=week
```

**Response:**
```json
{
  "success": true,
  "message": "Posts over time data fetched successfully",
  "data": [
    {
      "date": "2026-01",
      "count": 15
    },
    {
      "date": "2026-02",
      "count": 23
    }
  ]
}
```

**Use Case:** Line chart or bar chart showing post creation trends over time.

---

### 2. Posts by Tag Distribution
**GET** `/posts/charts/posts-by-tag`

Get the distribution of posts across different tags.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of top tags to return

**Example Request:**
```
GET /posts/charts/posts-by-tag?limit=15
```

**Response:**
```json
{
  "success": true,
  "message": "Posts by tag distribution fetched successfully",
  "data": [
    {
      "tag_name": "javascript",
      "tag_id": 1,
      "post_count": 45
    },
    {
      "tag_name": "typescript",
      "tag_id": 2,
      "post_count": 38
    }
  ]
}
```

**Use Case:** Pie chart or bar chart showing which tags are most popular.

---

### 3. Top Posts by Views
**GET** `/posts/charts/top-by-views`

Get the posts with the highest view counts.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of posts to return

**Example Request:**
```
GET /posts/charts/top-by-views?limit=5
```

**Response:**
```json
{
  "success": true,
  "message": "Top posts by views fetched successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Getting Started with TypeScript",
      "slug": "getting-started-typescript",
      "view_count": 1250,
      "like_count": 89,
      "created_at": "2026-01-01T00:00:00Z",
      "creator": {
        "id": "uuid",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe"
      }
    }
  ]
}
```

**Use Case:** Leaderboard or horizontal bar chart of most viewed posts.

---

### 4. Top Posts by Likes
**GET** `/posts/charts/top-by-likes`

Get the posts with the highest like counts.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of posts to return

**Example Request:**
```
GET /posts/charts/top-by-likes?limit=5
```

**Response:**
```json
{
  "success": true,
  "message": "Top posts by likes fetched successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Advanced React Patterns",
      "slug": "advanced-react-patterns",
      "view_count": 980,
      "like_count": 156,
      "created_at": "2026-01-05T00:00:00Z",
      "creator": {
        "id": "uuid",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe"
      }
    }
  ]
}
```

**Use Case:** Leaderboard or horizontal bar chart of most liked posts.

---

### 5. User Activity
**GET** `/posts/charts/user-activity`

Get statistics about user posting activity, including post counts and engagement metrics per user.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of users to return

**Example Request:**
```
GET /posts/charts/user-activity?limit=15
```

**Response:**
```json
{
  "success": true,
  "message": "User activity data fetched successfully",
  "data": [
    {
      "user_id": "uuid",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "post_count": 25,
      "total_views": 5420,
      "total_likes": 342
    }
  ]
}
```

**Use Case:** Table or bar chart showing most active content creators.

---

### 6. Engagement Metrics Overview
**GET** `/posts/charts/engagement-metrics`

Get overall engagement metrics for all posts.

**Query Parameters:** None

**Example Request:**
```
GET /posts/charts/engagement-metrics
```

**Response:**
```json
{
  "success": true,
  "message": "Engagement metrics fetched successfully",
  "data": {
    "total_posts": 150,
    "total_views": 45230,
    "total_likes": 3420,
    "avg_views_per_post": 301.53,
    "avg_likes_per_post": 22.8,
    "published_posts": 142,
    "draft_posts": 8
  }
}
```

**Use Case:** Dashboard cards or KPI widgets showing overall statistics.

---

### 7. Engagement Comparison
**GET** `/posts/charts/engagement-comparison`

Get posts with their view and like counts, including engagement rate (likes/views ratio).

**Query Parameters:**
- `limit` (optional, default: 20) - Number of posts to return

**Example Request:**
```
GET /posts/charts/engagement-comparison?limit=30
```

**Response:**
```json
{
  "success": true,
  "message": "Engagement comparison data fetched successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Understanding Async/Await",
      "slug": "understanding-async-await",
      "view_count": 1200,
      "like_count": 96,
      "engagement_rate": 8.0,
      "created_at": "2026-01-03T00:00:00Z"
    }
  ]
}
```

**Use Case:** Scatter plot or bubble chart comparing views vs likes, or table showing engagement rates.

---

## Frontend Implementation Examples

### Example 1: Line Chart (Posts Over Time)
```javascript
// Fetch data
const response = await fetch('/posts/charts/posts-over-time?days=30&groupBy=day');
const { data } = await response.json();

// Use with Chart.js, Recharts, or any charting library
const chartData = {
  labels: data.map(item => item.date),
  datasets: [{
    label: 'Posts Created',
    data: data.map(item => item.count)
  }]
};
```

### Example 2: Pie Chart (Posts by Tag)
```javascript
const response = await fetch('/posts/charts/posts-by-tag?limit=10');
const { data } = await response.json();

const chartData = {
  labels: data.map(item => item.tag_name),
  datasets: [{
    data: data.map(item => item.post_count)
  }]
};
```

### Example 3: Dashboard KPIs
```javascript
const response = await fetch('/posts/charts/engagement-metrics');
const { data } = await response.json();

// Display in dashboard cards
<Card title="Total Posts" value={data.total_posts} />
<Card title="Total Views" value={data.total_views} />
<Card title="Avg Views/Post" value={data.avg_views_per_post.toFixed(2)} />
```

## Notes

- All endpoints return data in a consistent format with `success`, `message`, and `data` fields
- Dates are returned in ISO 8601 format
- Numeric values (views, likes, counts) are returned as numbers
- All endpoints only consider non-deleted posts
- Most endpoints support a `limit` parameter to control result size
- The engagement rate is calculated as `(likes / views) * 100` and represents the percentage of viewers who liked the post
