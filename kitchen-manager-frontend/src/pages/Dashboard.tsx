import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Alert,
  Skeleton
} from '@mui/material';
import {
  Restaurant,
  Inventory,
  TrendingUp,
  CheckCircle,
  Schedule,
  Add,
  Notifications,
  Analytics,
  Kitchen,
  Event,
  Assignment
} from '@mui/icons-material';
import axios from 'axios';
import { useApiBaseUrl } from '../config/config';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalFoodItems: number;
  totalIngredients: number;
  totalRecipes: number;
  recentActivities: Activity[];
  upcomingEvents: Event[];
}

interface Activity {
  id: number;
  action: string;
  user: string;
  timestamp: string;
  type: 'success' | 'warning' | 'info';
}

interface Event {
  year: any;
  id: number;
  name: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

const Dashboard: React.FC = () => {
  const [username, setUsername] = useState('User');
  const [, setUserRole] = useState('user');
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = useApiBaseUrl();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [API_BASE_URL]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user info
      const userResponse = await axios.get(`${API_BASE_URL}/user/me`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = userResponse.data as { username: string; role?: string };
      setUsername(userData.username);
      setUserRole(userData.role || 'user');

      // Fetch dashboard stats with proper authentication
      const [foodItems, ingredients, recipes, events, activityLogs] = await Promise.all([
        axios.get<any[]>(`${API_BASE_URL}/food-item`, { 
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` } 
        }),
        axios.get<any[]>(`${API_BASE_URL}/ingredient`, { 
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` } 
        }),
        axios.get<any[]>(`${API_BASE_URL}/recipe`, { 
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` } 
        }).catch(() => ({ data: [] })),
        axios.get<any[]>(`${API_BASE_URL}/api/events`, { 
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` } 
        }).catch(() => ({ data: [] })),
        axios.get<any[]>(`${API_BASE_URL}/user/activity-logs`, { 
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` } 
        }).catch(() => ({ data: [] }))
      ]);

      // Process real activity logs
      const recentActivities = activityLogs.data.slice(0, 5).map((log: any, index: number) => ({
        id: log.id || index + 1,
        action: log.action || 'System activity',
        user: log.username || userData.username,
        timestamp: log.createdAt || new Date().toISOString(),
        type: getActivityType(log.action)
      }));

      // Process upcoming events (filter for future dates and sort by date)
      const now = new Date();
      const upcomingEvents = events.data
        .filter((event: any) => {
          // For events with eventYear, create a date for comparison
          if (event.eventYear) {
            const eventYear = parseInt(event.eventYear);
            const currentYear = now.getFullYear();
            
            // Show events from current year and next year
            if (eventYear >= currentYear) {
              return true;
            }
          }
          
          // For events with specific dates
          if (event.eventDate || event.date) {
            const eventDate = new Date(event.eventDate || event.date);
            return eventDate > now;
          }
          
          return false;
        })
        .sort((a: any, b: any) => {
          // Sort by year first, then by event name
          const yearA = parseInt(a.eventYear) || 0;
          const yearB = parseInt(b.eventYear) || 0;
          
          if (yearA !== yearB) {
            return yearA - yearB;
          }
          
          // If same year, sort by event name (Diwali, Poonam, etc.)
          return (a.eventName || '').localeCompare(b.eventName || '');
        })
        .slice(0, 5) // Show more upcoming events
        .map((event: any) => ({
          id: event.id,
          name: event.eventName || event.name,
          date: event.eventYear ? `${event.eventName} ${event.eventYear}` : (event.eventDate || event.date),
          status: 'upcoming' as const,
          year: event.eventYear
        }));

      const stats: DashboardStats = {
        totalFoodItems: foodItems.data.length,
        totalIngredients: ingredients.data.length,
        totalRecipes: recipes.data.length,
        recentActivities: recentActivities.length > 0 ? recentActivities : [
          { id: 1, action: 'Welcome to Kitchen Manager', user: userData.username, timestamp: new Date().toISOString(), type: 'info' }
        ],
        upcomingEvents
      };

      setDashboardData(stats);
    } catch (error) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityType = (action: string): 'success' | 'warning' | 'info' => {
    if (action?.toLowerCase().includes('add') || action?.toLowerCase().includes('create')) {
      return 'success';
    }
    if (action?.toLowerCase().includes('delete') || action?.toLowerCase().includes('remove')) {
      return 'warning';
    }
    return 'info';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const StatCard = ({ title, value, icon, color, trend, onClick }: any) => (
    <Card 
      sx={{ 
        height: '120px',
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        borderRadius: 2,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        '&:hover': onClick ? { 
          transform: 'translateY(-2px)', 
          boxShadow: '0 4px 12px 0 rgb(0 0 0 / 0.15)',
          borderColor: color
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ 
        p: 2.5, 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="body2"
            sx={{ 
              fontWeight: 500,
              color: '#64748b',
              fontSize: '0.875rem',
              mb: 0.5
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              fontSize: '2rem',
              lineHeight: 1.2,
              mb: 0.5
            }}
          >
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp 
                sx={{ 
                  fontSize: 14, 
                  color: trend > 0 ? '#059669' : '#dc2626', 
                  mr: 0.5,
                  transform: trend < 0 ? 'rotate(180deg)' : 'none'
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: trend > 0 ? '#059669' : '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar 
          sx={{ 
            bgcolor: `${color}20`, 
            color: color, 
            width: 48, 
            height: 48
          }}
        >
          {icon}
        </Avatar>
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ title, description, icon, color, onClick }: any) => (
    <Card 
      sx={{ 
        height: '100%',
        width: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        borderRadius: 2,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        '&:hover': { 
          transform: 'translateY(-2px)', 
          boxShadow: '0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          borderColor: color
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ 
        textAlign: 'center', 
        p: 2, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Avatar 
          sx={{ 
            bgcolor: `${color}15`, 
            color: color, 
            width: 40, 
            height: 40, 
            mb: 1.5 
          }}
        >
          {icon}
        </Avatar>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600, 
            mb: 0.5,
            color: '#1e293b',
            fontSize: '0.95rem',
            lineHeight: 1.2
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#64748b',
            fontSize: '0.75rem',
            lineHeight: 1.3,
            textAlign: 'center'
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { 
            xs: 'repeat(1, 1fr)', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(3, 1fr)' 
          },
          gap: 3
        }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: 'none',
      p: 0,
      m: 0,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          p: 3,
          background: 'linear-gradient(135deg, #245D6B 0%, #1a4a54 100%)',
          borderRadius: 3,
          color: 'white',
          boxShadow: '0 8px 32px rgba(36, 93, 107, 0.3)'
        }}>
          <Avatar 
            sx={{ 
              width: 64, 
              height: 64, 
              bgcolor: 'rgba(255,255,255,0.2)',
              mr: 3,
              border: '3px solid rgba(255,255,255,0.3)'
            }}
          >
            <Restaurant sx={{ fontSize: 32, color: 'white' }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              mb: 0.5,
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Dayalu, Jay Swaminarayan.
            </Typography>
            <Typography variant="body1" sx={{ 
              fontSize: '1.1rem',
              opacity: 0.9,
              fontWeight: 500
            }}>
              Welcome back, {username}! Here's what's happening in your kitchen today.
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            bgcolor: 'rgba(255,255,255,0.1)',
            p: 2,
            borderRadius: 2,
            minWidth: 120
          }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
              {getGreeting()}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {new Date().toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Stats Cards - 3 Equal Cards in Row */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: '1fr 1fr', 
            md: '1fr 1fr 1fr' 
          },
          gap: 2,
          width: '100%'
        }}>
          <StatCard
            title="Food Items"
            value={dashboardData?.totalFoodItems || 0}
            icon={<Restaurant />}
            color="#0f172a"
            trend={8}
            onClick={() => navigate('/dashboard/add-food-item')}
          />
          <StatCard
            title="Ingredients"
            value={dashboardData?.totalIngredients || 0}
            icon={<Inventory />}
            color="#059669"
            trend={12}
            onClick={() => navigate('/dashboard/add-ingredient')}
          />
          <StatCard
            title="Recipes"
            value={dashboardData?.totalRecipes || 0}
            icon={<Kitchen />}
            color="#ea580c"
            trend={5}
            onClick={() => navigate('/dashboard/recipe-entry')}
          />
        </Box>
      </Box>

      {/* Main Content - 2/3 and 1/3 Layout */}
      <Box sx={{ px: 3 }}>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 3,
          width: '100%'
        }}>
          {/* Left Column - Quick Actions & Activities */}
          <Box sx={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Quick Actions */}
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              borderRadius: 3,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              width: '100%',
              height: '280px',
              overflow: 'hidden'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                mb: 2.5, 
                color: '#1e293b',
                fontSize: '1.25rem'
              }}>
                Quick Actions
              </Typography>
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: 'repeat(3, 1fr)' 
                },
                gap: 1.5,
                width: '100%',
                height: 'calc(100% - 50px)',
                alignItems: 'stretch'
              }}>
                <QuickActionCard
                  title="Add Food Item"
                  description="Register new food items"
                  icon={<Add />}
                  color="#0f172a"
                  onClick={() => navigate('/dashboard/add-food-item')}
                />
                <QuickActionCard
                  title="Create Recipe"
                  description="Add new recipes"
                  icon={<Assignment />}
                  color="#059669"
                  onClick={() => navigate('/dashboard/recipe-entry')}
                />
                <QuickActionCard
                  title="Manage Events"
                  description="Plan kitchen events"
                  icon={<Event />}
                  color="#ea580c"
                  onClick={() => navigate('/dashboard/event-master')}
                />
              </Box>
            </Paper>

            {/* Recent Activities */}
            <Paper sx={{ 
              p: 3,
              borderRadius: 3,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              width: '100%',
              flex: 1,
              minHeight: '400px'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#1e293b',
                  fontSize: '1.25rem'
                }}>
                  Recent Activities
                </Typography>
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: '#f1f5f9',
                    '&:hover': { bgcolor: '#e2e8f0' }
                  }}
                >
                  <Notifications sx={{ color: '#64748b' }} />
                </IconButton>
              </Box>
              <List sx={{ p: 0, width: '100%' }}>
                {dashboardData?.recentActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem sx={{ px: 0, py: 2, width: '100%' }}>
                      <ListItemIcon>
                        {activity.type === 'success' && <CheckCircle sx={{ color: '#059669' }} />}
                        {activity.type === 'warning' && <Analytics sx={{ color: '#ea580c' }} />}
                        {activity.type === 'info' && <Analytics sx={{ color: '#0284c7' }} />}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography sx={{ fontWeight: 500, color: '#1e293b' }}>
                            {activity.action}
                          </Typography>
                        }
                        secondary={
                          <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                            {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < dashboardData.recentActivities.length - 1 && 
                      <Divider sx={{ bgcolor: '#e2e8f0' }} />
                    }
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>

          {/* Right Column - Sidebar */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Kitchen Status */}
            <Paper sx={{ 
              p: 3, 
              mb: 3,
              borderRadius: 3,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              width: '100%',
              height: '280px'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                mb: 3, 
                color: '#1e293b',
                fontSize: '1.25rem'
              }}>
                Kitchen Status
              </Typography>
              <Box sx={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}>
                <Box sx={{ mb: 3, width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Total Food Items
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {dashboardData?.totalFoodItems || 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((dashboardData?.totalFoodItems || 0) * 2, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#f1f5f9',
                      width: '100%',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#059669',
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>
                
                <Box sx={{ mb: 3, width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Active Recipes
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {dashboardData?.totalRecipes || 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((dashboardData?.totalRecipes || 0) * 5, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#f1f5f9',
                      width: '100%',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#ea580c',
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3, width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Total Ingredients
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {dashboardData?.totalIngredients || 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((dashboardData?.totalIngredients || 0) * 3, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#f1f5f9',
                      width: '100%',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#0284c7',
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* Upcoming Events */}
            <Paper sx={{ 
              p: 3,
              borderRadius: 3,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              width: '100%',
              flex: 1,
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                mb: 3, 
                color: '#1e293b',
                fontSize: '1.25rem'
              }}>
                Upcoming Events
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {dashboardData?.upcomingEvents.length === 0 ? (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flex: 1
                  }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                      No upcoming events
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0, width: '100%', flex: 1 }}>
                    {dashboardData?.upcomingEvents.map((event, index) => (
                      <React.Fragment key={event.id}>
                        <ListItem sx={{ px: 0, py: 2, width: '100%' }}>
                          <ListItemIcon>
                            <Schedule sx={{ color: '#0f172a' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 500, color: '#1e293b' }}>
                                {event.name}
                              </Typography>
                            }
                            secondary={
                              <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                                {event.year ? `Year ${event.year}` : new Date(event.date).toLocaleDateString()}
                              </Typography>
                            }
                          />
                          <Chip
                            label={event.status}
                            size="small"
                            sx={{
                              bgcolor: '#dbeafe',
                              color: '#1e40af',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          />
                        </ListItem>
                        {index < dashboardData.upcomingEvents.length - 1 && 
                          <Divider sx={{ bgcolor: '#e2e8f0' }} />
                        }
                      </React.Fragment>
                    ))}
                  </List>
                )}
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ 
                    mt: 'auto',
                    borderColor: '#0f172a', 
                    color: '#0f172a',
                    fontWeight: 500,
                    py: 1.5,
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#1e293b',
                      bgcolor: '#f8fafc'
                    }
                  }}
                  onClick={() => navigate('/dashboard/event-master')}
                >
                  View All Events
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
