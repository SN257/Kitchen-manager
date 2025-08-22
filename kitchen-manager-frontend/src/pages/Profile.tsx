import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Divider,
  Chip,
  IconButton,
  Button,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  InputAdornment,
  Tooltip,
  Stack,
  Menu,
  MenuItem
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import HistoryIcon from '@mui/icons-material/History';
import BadgeIcon from '@mui/icons-material/Badge';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useApiBaseUrl } from '../config/config';

interface UserProfile {
  id: number;
  username: string;
  center: string;
  role: string;
}

interface ActivityLog {
  id: number;
  action: string;
  createdAt?: string; // backend field
  timestamp?: string; // legacy / alternative field
  details?: string;
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Edit form states
  const [editUsername, setEditUsername] = useState('');
  
  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Activity log state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  
  const [deleteLogDialogOpen, setDeleteLogDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(null);
  const actionsMenuOpen = Boolean(actionsAnchorEl);
  
  const API_BASE_URL = useApiBaseUrl();

  useEffect(() => {
    fetchUserProfile();
  fetchRecentActivity();
  }, [API_BASE_URL]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setEditUsername(userData.username);
      } else {
        setError('Failed to fetch user profile');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editUsername
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        
        // Update localStorage to reflect changes in header
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Trigger a custom event to notify other components
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
        
        setEditDialogOpen(false);
        showSnackbar('Profile updated successfully!', 'success');
  // Refresh recent activity so user sees update action if logged
  fetchRecentActivity();
      } else {
        showSnackbar('Failed to update profile', 'error');
      }
    } catch (error) {
      showSnackbar('Network error occurred', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showSnackbar('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/user/change-password`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        setPasswordDialogOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        showSnackbar('Password changed successfully!', 'success');
  // Refresh recent activity to reflect password change action
  fetchRecentActivity();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.message || 'Failed to change password', 'error');
      }
    } catch (error) {
      showSnackbar('Network error occurred', 'error');
    }
  };

  const fetchActivityLogs = async () => {
  setActivityLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/user/activity-logs`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
  const logs: ActivityLog[] = await response.json();
  logs.sort((a,b)=> new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());
  setActivityLogs(logs);
      } else {
        setActivityLogs([]);
      }
    } catch (error) {
      setActivityLogs([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleActivityLog = () => {
    setActivityDialogOpen(true);
    fetchActivityLogs();
  };

  const fetchRecentActivity = async () => {
    setRecentLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setRecentActivity([]);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/user/activity-logs`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const logs: ActivityLog[] = await response.json();
  logs.sort((a,b)=> new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());
  setRecentActivity(logs);
      } else {
        setRecentActivity([]);
      }
    } catch {
      setRecentActivity([]);
    } finally {
      setRecentLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return '#d32f2f';
      case 'admin':
        return '#f57c00';
      case 'sant':
        return '#388e3c';
      default:
        return '#245D6B';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.replace('-', ' ').toUpperCase();
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/user/activity-logs/${logId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setActivityLogs(prev => prev.filter(log => log.id !== logId));
        showSnackbar('Activity log deleted successfully!', 'success');
  setRecentActivity(prev => prev.filter(log => log.id !== logId));
      } else {
        showSnackbar('Failed to delete activity log', 'error');
      }
    } catch (error) {
      showSnackbar('Network error occurred', 'error');
    }
    setDeleteLogDialogOpen(false);
    setSelectedLogId(null);
  };

  const handleClearAllLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/user/activity-logs`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setActivityLogs([]);
        setRecentActivity([]);
        showSnackbar('All activity logs cleared successfully!', 'success');
      } else {
        showSnackbar('Failed to clear activity logs', 'error');
      }
    } catch (error) {
      showSnackbar('Network error occurred', 'error');
    }
    setClearAllDialogOpen(false);
  };

  const formatRelativeTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const s = Math.floor(diff/1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s/60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h/24);
    if (days < 7) return `${days}d ago`;
    const w = Math.floor(days/7);
    if (w < 4) return `${w}w ago`;
    const mo = Math.floor(days/30);
    if (mo < 12) return `${mo}mo ago`;
    const y = Math.floor(days/365);
    return `${y}y ago`;
  };

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PersonIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
          <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
            My Profile
          </Typography>
        </Box>
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PersonIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
          <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
            My Profile
          </Typography>
        </Box>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Failed to load user profile'}
        </Alert>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '80vh', bgcolor:'#f5f8f9' }}>
        {/* Page Header */}
        <Box sx={{ mb:4, display:'flex', alignItems:'center', gap:1 }}>
          <PersonIcon sx={{ color:'#245D6B', fontSize:36 }} />
          <Typography variant='h5' sx={{ fontWeight:700, color:'#245D6B', letterSpacing:0.5 }}>My Profile</Typography>
        </Box>

        {/* Top Grid: Left (Overview + Profile Info stacked) | Right (Recent Activity full height) */}
  <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', md:'2fr 1fr' }, gap:3, alignItems:'stretch' }}>
          {/* Left Cell: stacked cards */}
          <Box sx={{ display:'flex', flexDirection:'column', gap:3, height:'100%' }}>
            {/* Overview */}
            <Paper sx={{ p:3, borderRadius:3, boxShadow:'0 4px 18px rgba(0,0,0,0.06)', position:'relative', overflow:'hidden' }}>
              <Box sx={{ position:'absolute', inset:0, background:'radial-gradient(circle at 85% 15%, rgba(36,93,107,0.08), transparent 60%)' }} />
              <Box sx={{ position:'relative', display:'flex', flexDirection:{ xs:'column', md:'row'}, gap:3 }}>
                <Avatar sx={{ width:90, height:90, bgcolor:'#245D6B', fontSize:40, fontWeight:700 }}>{user.username.charAt(0).toUpperCase()}</Avatar>
                <Box sx={{ flex:1 }}>
                  <Typography variant='h4' sx={{ fontWeight:700, color:'#1e3740', mb:1, fontSize:{ xs:'1.8rem', sm:'2.1rem' } }}>{user.username}</Typography>
                  <Chip icon={<AdminPanelSettingsIcon sx={{ fontSize:18 }} />} label={getRoleDisplayName(user.role)} sx={{ bgcolor:getRoleColor(user.role), color:'#fff', fontWeight:600, px:1.5, '& .MuiChip-icon':{ color:'#fff' } }} />
                  <Box sx={{ mt:2, display:'flex', flexWrap:'wrap', gap:1.2 }}>
                    <Tooltip title='User ID'><Chip label={`#${user.id}`} size='small' sx={{ bgcolor:'rgba(36,93,107,0.1)', color:'#245D6B', fontWeight:600 }} /></Tooltip>
                    <Tooltip title='Center'><Chip label={user.center || 'No Center'} size='small' sx={{ bgcolor:'rgba(36,93,107,0.1)', color:'#245D6B', fontWeight:600 }} /></Tooltip>
                    <Tooltip title='Role'><Chip label={getRoleDisplayName(user.role)} size='small' sx={{ bgcolor:'rgba(36,93,107,0.1)', color:'#245D6B', fontWeight:600 }} /></Tooltip>
                  </Box>
                </Box>
                <Stack direction='row' spacing={0.5} sx={{ alignSelf:{ xs:'flex-end', md:'flex-start' }, mt:{ xs:2, md:0 } }}>
                  <Tooltip title='Actions'>
                    <IconButton
                      aria-label='open actions menu'
                      aria-controls={actionsMenuOpen ? 'profile-actions-menu' : undefined}
                      aria-haspopup='true'
                      aria-expanded={actionsMenuOpen ? 'true' : undefined}
                      onClick={(e)=> setActionsAnchorEl(e.currentTarget)}
                      size='small'
                      sx={{
                        border:'1px solid #245D6B',
                        color:'#245D6B',
                        '&:hover':{ bgcolor:'#245D6B', color:'#fff' },
                        transition:'all .2s'
                      }}
                    >
                      <MoreVertIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    id='profile-actions-menu'
                    anchorEl={actionsAnchorEl}
                    open={actionsMenuOpen}
                    onClose={()=> setActionsAnchorEl(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  >
                    <MenuItem onClick={()=> { setActionsAnchorEl(null); handleEditProfile(); }}>
                      <EditIcon fontSize='small' sx={{ mr: 1, color: '#245D6B' }} />
                      Edit Profile / Username
                    </MenuItem>
                    <MenuItem onClick={()=> { setActionsAnchorEl(null); setPasswordDialogOpen(true); }}>
                      <LockIcon fontSize='small' sx={{ mr: 1, color: '#245D6B' }} />
                      Change Password
                    </MenuItem>
                  </Menu>
                </Stack>
              </Box>
            </Paper>
            {/* Profile Info */}
            <Paper sx={{ p:3, borderRadius:3, boxShadow:'0 4px 18px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column' }}>
              <Typography variant='h6' sx={{ fontWeight:700, color:'#245D6B', mb:2 }}>Profile Information</Typography>
              <Divider sx={{ mb:3 }} />
              <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', sm:'repeat(2, 1fr)', lg:'repeat(4, 1fr)' }, gap:2 }}>
                {[
                  { icon:<BadgeIcon />, label:'User ID', value:`#${user.id}` },
                  { icon:<LocationCityIcon />, label:'Center', value:user.center || 'Not Assigned' },
                  { icon:<AdminPanelSettingsIcon />, label:'Role', value:getRoleDisplayName(user.role) },
                  { icon:<PersonIcon />, label:'Username', value:user.username }
                ].map((item,i)=>(
                  <Box key={i} sx={{ p:2, border:'1px solid #e3ecef', borderRadius:2, bgcolor:'#fff', display:'flex', flexDirection:'column', gap:1 }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Avatar sx={{ bgcolor:'rgba(36,93,107,0.1)', color:'#245D6B', width:34, height:34 }}>{item.icon}</Avatar>
                      <Typography variant='body2' sx={{ fontWeight:600, color:'#576f75', letterSpacing:0.3 }}>{item.label}</Typography>
                    </Box>
                    <Typography variant='subtitle1' sx={{ fontWeight:700, color:'#1e3740', lineHeight:1.3 }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
          {/* Right Cell: Recent Activity fills height */}
          <Box sx={{ height:'100%', display:'flex', flexDirection:'column' }}>
            <Paper sx={{ p:3, borderRadius:3, boxShadow:'0 4px 18px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column', flex:1, minHeight:320 }}>
              <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1.5 }}>
                <Typography variant='h6' sx={{ fontWeight:700, color:'#245D6B' }}>Recent Activity</Typography>
                <Button size='small' variant='text' onClick={()=>{ fetchRecentActivity(); handleActivityLog(); }} sx={{ color:'#245D6B', fontWeight:600 }}>View All</Button>
              </Box>
              <Box sx={{ flex:1 }}>
                {recentLoading ? (
                  <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                    {[...Array(4)].map((_,i)=>(<Skeleton key={i} variant='rectangular' height={38} sx={{ borderRadius:1 }} />))}
                  </Box>
                ) : recentActivity.length === 0 ? (
                  <Typography variant='body2' sx={{ color:'#789097', fontStyle:'italic', mt:1 }}>No recent activity</Typography>
                ) : (
                  <List dense sx={{ p:0, maxHeight:320, overflowY:'auto' }}>
                    {recentActivity.map(log => (
                      <ListItem key={log.id} sx={{ px:0, alignItems:'flex-start' }} divider>
                        <ListItemIcon sx={{ minWidth:38, mt:.3 }}><AccessTimeIcon sx={{ color:'#245D6B', fontSize:20 }} /></ListItemIcon>
                        <ListItemText
                          primary={<Typography sx={{ fontWeight:600, color:'#1e3740', fontSize:13.5, lineHeight:1.3 }}>{log.action}</Typography>}
                          secondary={<Box sx={{ display:'flex', flexWrap:'wrap', gap:.75, alignItems:'center' }}>
                            <Typography component='span' sx={{ fontSize:11.5, color:'#607d84' }}>{new Date(log.createdAt || log.timestamp || '').toLocaleString()}</Typography>
                            <Typography component='span' sx={{ fontSize:11, color:'#245D6B', fontWeight:600 }}>{formatRelativeTime(log.createdAt || log.timestamp || '')}</Typography>
                            {log.details && <Typography component='span' sx={{ fontSize:11.5, color:'#5a6f75' }}>• {log.details}</Typography>}
                          </Box>}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
        {/* Second Row: Aligned columns (Quick Actions left, Role Permissions right) */}
        <Box sx={{ mt:3, display:'grid', gridTemplateColumns:{ xs:'1fr', md:'2fr 1fr' }, gap:3 }}>
          <Paper sx={{ p:3, borderRadius:3, boxShadow:'0 4px 18px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column' }}>
            <Typography variant='h6' sx={{ fontWeight:700, color:'#245D6B', mb:2 }}>Quick Actions</Typography>
            <Divider sx={{ mb:3 }} />
            <Stack direction={{ xs:'column', sm:'row', md:'column' }} spacing={2}>
              <Button fullWidth variant='contained' startIcon={<LockIcon />} onClick={()=> setPasswordDialogOpen(true)} sx={{ bgcolor:'#245D6B', fontWeight:600, '&:hover':{ bgcolor:'#1a4a57' } }}>Change Password</Button>
              <Button fullWidth variant='outlined' startIcon={<HistoryIcon />} onClick={handleActivityLog} sx={{ borderColor:'#245D6B', color:'#245D6B', fontWeight:600, '&:hover':{ bgcolor:'#245D6B', color:'#fff' } }}>Activity Log</Button>
            </Stack>
          </Paper>
          <Paper sx={{ p:3, borderRadius:3, boxShadow:'0 4px 18px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column' }}>
            <Typography variant='h6' sx={{ fontWeight:700, color:'#245D6B', mb:1 }}>Role Permissions</Typography>
            <Typography variant='body2' sx={{ color:'#4c6670', lineHeight:1.55, flexGrow:1 }}>
              Your role <strong>{getRoleDisplayName(user.role)}</strong> determines access to administrative and operational features inside Kitchen Manager.
            </Typography>
            <Box sx={{ mt:2, display:'flex', flexWrap:'wrap', gap:1 }}>
              <Chip size='small' label={getRoleDisplayName(user.role)} sx={{ bgcolor:getRoleColor(user.role), color:'#fff', fontWeight:600 }} />
              <Chip size='small' label='Secure Access' sx={{ bgcolor:'rgba(36,93,107,0.1)', color:'#245D6B', fontWeight:600 }} />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#245D6B', fontWeight: 700 }}>Edit Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} startIcon={<CancelIcon />}>Cancel</Button>
          <Button onClick={handleSaveProfile} startIcon={<SaveIcon />} variant="contained" sx={{ bgcolor: '#245D6B', '&:hover': { bgcolor: '#1a4a57' } }}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#245D6B', fontWeight: 700 }}>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end" aria-label="toggle current password visibility">
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" aria-label="toggle new password visibility">
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" aria-label="toggle confirm password visibility">
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)} startIcon={<CancelIcon />}>Cancel</Button>
          <Button onClick={handleChangePassword} startIcon={<SaveIcon />} variant="contained" sx={{ bgcolor: '#245D6B', '&:hover': { bgcolor: '#1a4a57' } }}>Change Password</Button>
        </DialogActions>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={activityDialogOpen} onClose={() => setActivityDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#245D6B', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Activity Log
          <Button
            startIcon={<ClearAllIcon />}
            onClick={() => setClearAllDialogOpen(true)}
            sx={{ color: '#d32f2f' }}
            disabled={activityLogs.length === 0}
          >
            Clear All
          </Button>
        </DialogTitle>
        <DialogContent>
          {activityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Skeleton variant="rectangular" width="100%" height={200} />
            </Box>
          ) : activityLogs.length === 0 ? (
            <Typography sx={{ textAlign: 'center', p: 3, color: '#666' }}>
              No activity logs found
            </Typography>
          ) : (
            <List>
              {activityLogs.map((log) => (
                <ListItem key={log.id} divider sx={{ display: 'flex', justifyContent: 'space-between', alignItems:'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                    <ListItemIcon sx={{ minWidth:40, mt:.2 }}>
                      <AccessTimeIcon color="primary" fontSize='small' />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight:600, fontSize:14, color:'#1e3740' }}>{log.action}</Typography>}
                      secondary={<Box sx={{ display:'flex', flexWrap:'wrap', gap:.75, alignItems:'center' }}>
                        <Typography component='span' sx={{ fontSize:12, color:'#607d84' }}>{new Date(log.createdAt || log.timestamp || '').toLocaleString()}</Typography>
                        <Typography component='span' sx={{ fontSize:11, color:'#245D6B', fontWeight:600 }}>{formatRelativeTime(log.createdAt || log.timestamp || '')}</Typography>
                        {log.details && <Typography component='span' sx={{ fontSize:12, color:'#5a6f75' }}>• {log.details}</Typography>}
                      </Box>}
                    />
                  </Box>
                  <IconButton
                    onClick={() => {
                      setSelectedLogId(log.id);
                      setDeleteLogDialogOpen(true);
                    }}
                    sx={{ color: '#d32f2f', mt:.5 }}
                  >
                    <DeleteIcon fontSize='small' />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialogOpen(false)} startIcon={<CancelIcon />}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Log Confirmation Dialog */}
      <Dialog open={deleteLogDialogOpen} onClose={() => setDeleteLogDialogOpen(false)}>
        <DialogTitle sx={{ color: '#245D6B', fontWeight: 700 }}>
          Delete Activity Log
        </DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this activity log entry?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteLogDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => selectedLogId && handleDeleteLog(selectedLogId)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear All Logs Confirmation Dialog */}
      <Dialog open={clearAllDialogOpen} onClose={() => setClearAllDialogOpen(false)}>
        <DialogTitle sx={{ color: '#245D6B', fontWeight: 700 }}>
          Clear All Activity Logs
        </DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to clear all activity logs? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAllDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleClearAllLogs} 
            color="error" 
            variant="contained"
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );

};

export default Profile;
