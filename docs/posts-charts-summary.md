# Posts Chart Endpoints - Quick Reference

## Available Chart Endpoints

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|--------------|
| `/posts/charts/posts-over-time` | GET | Posts created over time | `days` (30), `groupBy` (day/week/month) |
| `/posts/charts/posts-by-tag` | GET | Distribution of posts by tags | `limit` (10) |
| `/posts/charts/top-by-views` | GET | Most viewed posts | `limit` (10) |
| `/posts/charts/top-by-likes` | GET | Most liked posts | `limit` (10) |
| `/posts/charts/user-activity` | GET | User posting activity stats | `limit` (10) |
| `/posts/charts/engagement-metrics` | GET | Overall engagement metrics | None |
| `/posts/charts/engagement-comparison` | GET | Views vs likes comparison | `limit` (20) |

## Chart Types Recommendations

### 1. Posts Over Time
- **Best Chart Type:** Line Chart or Area Chart
- **X-Axis:** Date (day/week/month)
- **Y-Axis:** Number of posts
- **Use Case:** Track content creation trends

### 2. Posts by Tag Distribution
- **Best Chart Type:** Pie Chart, Donut Chart, or Bar Chart
- **Data:** Tag names and post counts
- **Use Case:** Understand content categorization

### 3. Top Posts by Views
- **Best Chart Type:** Horizontal Bar Chart or Table
- **Data:** Post titles and view counts
- **Use Case:** Identify most popular content

### 4. Top Posts by Likes
- **Best Chart Type:** Horizontal Bar Chart or Table
- **Data:** Post titles and like counts
- **Use Case:** Identify most appreciated content

### 5. User Activity
- **Best Chart Type:** Bar Chart or Table with multiple columns
- **Data:** Username, post count, total views, total likes
- **Use Case:** Identify top contributors

### 6. Engagement Metrics Overview
- **Best Chart Type:** KPI Cards or Dashboard Widgets
- **Data:** Total posts, views, likes, averages
- **Use Case:** High-level overview dashboard

### 7. Engagement Comparison
- **Best Chart Type:** Scatter Plot, Bubble Chart, or Table
- **X-Axis:** View count
- **Y-Axis:** Like count
- **Bubble Size:** Engagement rate
- **Use Case:** Analyze content performance

## Example Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  Engagement Metrics (KPI Cards)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 150      │ │ 45,230   │ │ 3,420    │           │
│  │ Posts    │ │ Views    │ │ Likes    │           │
│  └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────┘

┌──────────────────────────┐ ┌──────────────────────┐
│ Posts Over Time          │ │ Posts by Tag         │
│ (Line Chart)             │ │ (Pie Chart)          │
│                          │ │                      │
│    /\    /\              │ │    ┌─────┐          │
│   /  \  /  \             │ │    │     │          │
│  /    \/    \            │ │    └─────┘          │
└──────────────────────────┘ └──────────────────────┘

┌──────────────────────────┐ ┌──────────────────────┐
│ Top Posts by Views       │ │ Top Posts by Likes   │
│ (Horizontal Bar Chart)   │ │ (Horizontal Bar Chart)│
│                          │ │                      │
│ Post 1 ████████████      │ │ Post A ██████████    │
│ Post 2 ████████          │ │ Post B ████████      │
│ Post 3 ██████            │ │ Post C ██████        │
└──────────────────────────┘ └──────────────────────┘

┌─────────────────────────────────────────────────────┐
│ User Activity (Table)                               │
│ ┌──────────┬───────┬────────┬────────┐            │
│ │ Username │ Posts │ Views  │ Likes  │            │
│ ├──────────┼───────┼────────┼────────┤            │
│ │ johndoe  │ 25    │ 5,420  │ 342    │            │
│ │ janedoe  │ 18    │ 3,890  │ 256    │            │
│ └──────────┴───────┴────────┴────────┘            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Engagement Comparison (Scatter Plot)                │
│                                                     │
│ Likes │        ●                                    │
│       │    ●       ●                                │
│       │  ●   ●   ●                                  │
│       │ ●  ●  ●                                     │
│       └─────────────────── Views                    │
└─────────────────────────────────────────────────────┘
```

## Frontend Libraries Recommendations

### React
- **Recharts** - Simple and composable charts
- **Chart.js with react-chartjs-2** - Flexible and powerful
- **Victory** - Modular charting components
- **Nivo** - Rich set of dataviz components

### Vue
- **Vue-ChartJS** - Chart.js wrapper for Vue
- **ApexCharts** - Modern charting library

### Vanilla JS
- **Chart.js** - Simple yet flexible
- **D3.js** - Maximum customization
- **ApexCharts** - Feature-rich

## Sample Integration Code

### React with Recharts
```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function PostsOverTimeChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/posts/charts/posts-over-time?days=30&groupBy=day')
      .then(res => res.json())
      .then(result => setData(result.data));
  }, []);

  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="count" stroke="#8884d8" />
    </LineChart>
  );
}
```

### React with Chart.js
```jsx
import { Bar } from 'react-chartjs-2';

function TopPostsByViewsChart() {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetch('/posts/charts/top-by-views?limit=10')
      .then(res => res.json())
      .then(result => {
        setChartData({
          labels: result.data.map(post => post.title),
          datasets: [{
            label: 'Views',
            data: result.data.map(post => post.view_count),
            backgroundColor: 'rgba(54, 162, 235, 0.5)'
          }]
        });
      });
  }, []);

  return chartData ? <Bar data={chartData} /> : <div>Loading...</div>;
}
```

## Performance Considerations

1. **Caching:** Consider caching chart data on the frontend for a few minutes
2. **Lazy Loading:** Load charts only when they're visible (intersection observer)
3. **Pagination:** Use the `limit` parameter to control data size
4. **Debouncing:** If allowing user to change parameters, debounce API calls
5. **Server-Side:** Consider adding Redis caching for frequently accessed chart data

## Security Notes

- All chart endpoints are public (no authentication required)
- Only published, non-deleted posts are included in statistics
- User passwords are never exposed in any endpoint
- Consider rate limiting these endpoints to prevent abuse
