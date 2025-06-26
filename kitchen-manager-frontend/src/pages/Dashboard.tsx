import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import axios from 'axios';
import { useApiBaseUrl } from '../config/config';

const Dashboard: React.FC = () => {
  const [username, setUsername] = useState('User');
  const API_BASE_URL = useApiBaseUrl();
  useEffect(() => {
    axios.get<{ username: string }>(`${API_BASE_URL}/user/me`, {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(res => setUsername(res.data.username))
    .catch(() => setUsername('User'));
  }, []);

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom>
        Dayalu, Jay Swaminarayan.
      </Typography>
      <Typography variant="body1">
        Welcome {username} to the Kitchen Manager Dashboard. Here you can manage your food items, track inventory, and more.
      </Typography>
    </Box>
  );
};

export default Dashboard;