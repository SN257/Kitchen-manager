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
  timestamp: string;
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
  
  const [deleteLogDialogOpen, setDeleteLogDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  
  const API_BASE_URL = useApiBaseUrl();

  useEffect(() => {
    fetchUserProfile();
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
        const logs = await response.json();
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
        showSnackbar('All activity logs cleared successfully!', 'success');
      } else {
        showSnackbar('Failed to clear activity logs', 'error');
      }
    } catch (error) {
      showSnackbar('Network error occurred', 'error');
    }
    setClearAllDialogOpen(false);
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
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PersonIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
          My Profile
        </Typography>
      </Box>

      {/* Main Profile Card - Full Width */}
      <Paper
        elevation={4}
        sx={{
          p: { xs: 2, sm: 4 },
          mt: 5,
          width: '100%',
          borderRadius: 2,
          boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
          mb: 3,
        }}
      >
        {/* Profile Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 4,
          flexDirection: { xs: 'column', sm: 'row' },
          textAlign: { xs: 'center', sm: 'left' }
        }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: '#245D6B',
              color: 'white',
              fontSize: 32,
              fontWeight: 700,
              mr: { xs: 0, sm: 4 },
              mb: { xs: 2, sm: 0 },
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ 
              color: '#245D6B', 
              fontWeight: 700, 
              mb: 1,
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}>
              {user.username}
            </Typography>
            <Chip
              icon={<AdminPanelSettingsIcon sx={{ fontSize: 18 }} />}
              label={getRoleDisplayName(user.role)}
              sx={{
                bgcolor: getRoleColor(user.role),
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem',
                height: 32,
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          </Box>
          <IconButton 
            onClick={handleEditProfile}
            sx={{ 
              color: '#245D6B',
              bgcolor: 'rgba(36,93,107,0.1)',
              '&:hover': { bgcolor: 'rgba(36,93,107,0.2)' },
              width: 48,
              height: 48,
            }}
          >
            <EditIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Profile Details */}
        <Typography variant="h6" sx={{ 
          color: '#245D6B', 
          fontWeight: 700, 
          mb: 3,
          fontSize: '1.2rem'
        }}>
          Profile Information
        </Typography>

        {/* Profile Info Cards - Using Flexbox */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          width: '100%',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: { xs: 'nowrap', sm: 'wrap', md: 'nowrap' }
        }}>
          <Box sx={{ 
            flex: 1,
            p: 3, 
            bgcolor: 'rgba(36,93,107,0.05)', 
            borderRadius: 2,
            border: '1px solid rgba(36,93,107,0.1)',
            textAlign: 'center',
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0
          }}>
            <BadgeIcon sx={{ color: '#245D6B', fontSize: 28, mb: 1, mx: 'auto' }} />
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              User ID
            </Typography>
            <Typography variant="h6" sx={{ color: '#245D6B', fontWeight: 700 }}>
              #{user.id}
            </Typography>
          </Box>
          
          <Box sx={{ 
            flex: 1,
            p: 3, 
            bgcolor: 'rgba(36,93,107,0.05)', 
            borderRadius: 2,
            border: '1px solid rgba(36,93,107,0.1)',
            textAlign: 'center',
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0
          }}>
            <LocationCityIcon sx={{ color: '#245D6B', fontSize: 28, mb: 1, mx: 'auto' }} />
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Center
            </Typography>
            <Typography variant="h6" sx={{ color: '#245D6B', fontWeight: 700 }}>
              {user.center || 'Not Assigned'}
            </Typography>
          </Box>
          
          <Box sx={{ 
            flex: 1,
            p: 3, 
            bgcolor: 'rgba(36,93,107,0.05)', 
            borderRadius: 2,
            border: '1px solid rgba(36,93,107,0.1)',
            textAlign: 'center',
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0
          }}>
            <AdminPanelSettingsIcon sx={{ color: '#245D6B', fontSize: 28, mb: 1, mx: 'auto' }} />
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Role
            </Typography>
            <Typography variant="h6" sx={{ color: '#245D6B', fontWeight: 700 }}>
              {getRoleDisplayName(user.role)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            flex: 1,
            p: 3, 
            bgcolor: 'rgba(36,93,107,0.05)', 
            borderRadius: 2,
            border: '1px solid rgba(36,93,107,0.1)',
            textAlign: 'center',
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0
          }}>
            <PersonIcon sx={{ color: '#245D6B', fontSize: 28, mb: 1, mx: 'auto' }} />
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Username
            </Typography>
            <Typography variant="h6" sx={{ color: '#245D6B', fontWeight: 700 }}>
              {user.username}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Quick Actions Card - Full Width */}
      <Paper
        elevation={4}
        sx={{
          p: { xs: 2, sm: 4 },
          width: '100%',
          borderRadius: 2,
          boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
        }}
      >
        <Typography variant="h6" sx={{ 
          color: '#245D6B', 
          fontWeight: 700, 
          mb: 3,
          fontSize: '1.2rem'
        }}>
          Quick Actions
        </Typography>
        
        {/* Action Buttons - Using Flexbox */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          width: '100%',
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Button
            variant="outlined"
            startIcon={<LockIcon />}
            onClick={() => setPasswordDialogOpen(true)}
            sx={{
              flex: 1,
              borderColor: '#245D6B',
              color: '#245D6B',
              fontWeight: 600,
              height: '50px',
              fontSize: '1rem',
              transition: 'all 0.3s',
              '&:hover': {
                bgcolor: '#245D6B',
                color: 'white',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(36,93,107,0.3)',
              },
            }}
          >
            Change Password
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEditProfile}
            sx={{
              flex: 1,
              borderColor: '#245D6B',
              color: '#245D6B',
              fontWeight: 600,
              height: '50px',
              fontSize: '1rem',
              transition: 'all 0.3s',
              '&:hover': {
                bgcolor: '#245D6B',
                color: 'white',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(36,93,107,0.3)',
              },
            }}
          >
            Update Profile
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={handleActivityLog}
            sx={{
              flex: 1,
              borderColor: '#245D6B',
              color: '#245D6B',
              fontWeight: 600,
              height: '50px',
              fontSize: '1rem',
              transition: 'all 0.3s',
              '&:hover': {
                bgcolor: '#245D6B',
                color: 'white',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(36,93,107,0.3)',
              },
            }}
          >
            Activity Log
          </Button>
        </Box>
      </Paper>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#245D6B', fontWeight: 700 }}>
          Edit Profile
        </DialogTitle>
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
          <Button onClick={() => setEditDialogOpen(false)} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSaveProfile} startIcon={<SaveIcon />} variant="contained" 
            sx={{ bgcolor: '#245D6B', '&:hover': { bgcolor: '#1a4a57' } }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#245D6B', fontWeight: 700 }}>
          Change Password
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Current Password"
            type={showCurrentPassword ? "text" : "password"}
            fullWidth
            variant="outlined"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                    aria-label="toggle current password visibility"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="New Password"
            type={showNewPassword ? "text" : "password"}
            fullWidth
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    aria-label="toggle new password visibility"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Confirm New Password"
            type={showConfirmPassword ? "text" : "password"}
            fullWidth
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    aria-label="toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button onClick={handleChangePassword} startIcon={<SaveIcon />} variant="contained"
            sx={{ bgcolor: '#245D6B', '&:hover': { bgcolor: '#1a4a57' } }}>
            Change Password
          </Button>
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
                <ListItem key={log.id} divider sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <ListItemIcon>
                      <AccessTimeIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={log.action}
                      secondary={`${new Date(log.timestamp).toLocaleString()} - ${log.details}`}
                    />
                  </Box>
                  <IconButton
                    onClick={() => {
                      setSelectedLogId(log.id);
                      setDeleteLogDialogOpen(true);
                    }}
                    sx={{ color: '#d32f2f' }}
                  >
                    <DeleteIcon />
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
    </Box>
  );
};

export default Profile;
