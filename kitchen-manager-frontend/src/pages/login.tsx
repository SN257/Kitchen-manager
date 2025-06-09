import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Paper,
  Alert,
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useNavigate } from 'react-router-dom';
import { useApiBaseUrl } from '../config/config'; 
const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = useApiBaseUrl();
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError('Please enter your username.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
        credentials: 'include',
      });
      if (!res.ok) {
        setError('Invalid username or password.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('user', JSON.stringify(data.user)); 
      navigate('/dashboard');
    } catch (err) {
      setError('Server error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: -1,
        '&:before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          bgcolor: '#f0f0f0',
          zIndex: 0,
        },
      }}
    >
      <Paper
        elevation={8}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          width: { xs: '90vw', md: 900 },
          minHeight: { xs: 600, md: 500 },
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1, 
        }}
      >
        {/* Left: Login Form */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 1, md: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            bgcolor: '#fff',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Avatar sx={{ m: 1.5, bgcolor: '#245D6B', width: 64, height: 64 }}>
              <RestaurantMenuIcon sx={{ fontSize: 40, color: 'white' }} />
            </Avatar>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: '#245D6B', mb: 0.5 }}>
              Kitchen Manager
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#245D6B', opacity: 0.7, mb: 1, textAlign: 'center' }}>
              Welcome back! Please sign in to manage your kitchen.
            </Typography>
          </Box>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              margin="normal"
              fullWidth
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/^\s+/, ''))}
              required
              autoFocus
              InputProps={{
                sx: {
                  borderRadius: 2,
                  bgcolor: '#fff',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#245D6B',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#245D6B',
                  },
                },
              }}
              InputLabelProps={{
                sx: {
                  color: '#245D6B',
                  '&.Mui-focused': {
                    color: '#245D6B',
                  },
                },
              }}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                sx: {
                  borderRadius: 2,
                  bgcolor: '#fff',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#245D6B',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#245D6B',
                  },
                },
              }}
              InputLabelProps={{
                sx: {
                  color: '#245D6B',
                  '&.Mui-focused': {
                    color: '#245D6B',
                  },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                background: '#245D6B',
                color: 'white',
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: '0 2px 8px 0 rgba(36,93,107,0.15)',
                '&:hover': {
                  background: '#1b4957',
                },
              }}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>
        </Box>
        {/* Right: Image */}
        <Box
          sx={{
            flex: 0.9,
            display: { xs: 'none', md: 'block' },
            position: 'relative',
            backgroundImage: 'url(https://images.unsplash.com/photo-1634040669840-36c8b3b6e378?w=900&auto=format&fit=crop&q=60)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            '&:after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              bgcolor: 'rgba(36,93,107,0.35)',
              zIndex: 1,
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default Login;