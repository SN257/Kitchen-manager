import React from 'react';
import axios from 'axios';
import {
    AppBar,
    Toolbar,
    Typography,
    CssBaseline,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Box,
    Divider,
    IconButton,
    Menu,

} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircle from '@mui/icons-material/AccountCircle';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import KitchenIcon from '@mui/icons-material/Kitchen';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Outlet, useNavigate } from 'react-router-dom';
import { useApiBaseUrl } from '../config/config';

const drawerWidth = 250;

const Dashboard: React.FC = () => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [username, setUsername] = React.useState('User');
    const navigate = useNavigate();
    const API_BASE_URL = useApiBaseUrl();
    React.useEffect(() => {
        interface UserResponse {
            username?: string;
        }

        const fetchUsername = () => {
            axios.get<UserResponse>(`${API_BASE_URL}/users/me`, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
                .then(res => {
                    if (res.data && res.data.username) {
                        setUsername(res.data.username);
                        localStorage.setItem('user', JSON.stringify(res.data));
                    } else {
                        setUsername('User');
                    }
                })
                .catch((err) => {
                    setUsername('User');
                    console.error('Failed to fetch user:', err);
                });
        };

        fetchUsername();

        const interval = setInterval(fetchUsername, 5000);

        return () => clearInterval(interval);
    }, []);
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawer = (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Toolbar>
                <Typography variant="h6" noWrap>
                    Kitchen Manager
                </Typography>
            </Toolbar>
            <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
            <List sx={{ flexGrow: 1 }}>
                <ListItem sx={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                    <ListItemIcon sx={{ color: '#fff', minWidth: 30 }}>
                        <DashboardIcon />
                    </ListItemIcon>
                    <ListItemText primary="Dashboard" />
                </ListItem>
                <ListItem sx={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/add-food-item')}>
                    <ListItemIcon sx={{ color: '#fff', minWidth: 30 }}>
                        <RestaurantIcon />
                    </ListItemIcon>
                    <ListItemText primary="Add Food Item" />
                </ListItem>
                <ListItem sx={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/add-ingredient')}>
                    <ListItemIcon sx={{ color: '#fff', minWidth: 30 }}>
                        <KitchenIcon />
                    </ListItemIcon>
                    <ListItemText primary="Add Ingredient" />
                </ListItem>
                {/* Add Recipe Entry menu item */}
                <ListItem sx={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/recipe-entry')}>
                    <ListItemIcon sx={{ color: '#fff', minWidth: 30 }}>
                        <ReceiptIcon />
                    </ListItemIcon>
                    <ListItemText primary="Recipe Entry" />
                </ListItem>
            </List>
            <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: -3 }} />
            <List>
                <ListItem
                    sx={{ cursor: 'pointer', mt: 3 }}
                    onClick={async () => {
                        await fetch(`${API_BASE_URL}/users/logout`, {
                            method: 'POST',
                            credentials: 'include',
                        }).catch(() => { });

                        localStorage.clear();
                        sessionStorage.clear();
                        navigate('/login');
                    }}
                >
                    <ListItemIcon sx={{ color: '#fff', minWidth: 30 }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText primary="Sign Out" />
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    ml: { sm: `${drawerWidth}px` },
                    bgcolor: '#fff',
                    color: '#fff',
                }}
            >
                <Toolbar>
                    <IconButton
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{
                            mr: 2,
                            color: { xs: '#245D6B', sm: '#fff' }
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                color: '#245D6B',
                                fontWeight: 500,
                                fontSize: 17,
                                fontFamily: '"Montserrat", "Segoe UI", "Roboto", "Arial", sans-serif'
                            }}
                        >
                            Hi, {username}
                        </Typography>
                        <Box
                            sx={{
                                width: '2px',
                                height: '28px',
                                bgcolor: '#ccc',
                                ml: 2,
                                borderRadius: 1
                            }}
                        />
                        <IconButton
                            size="large"
                            edge="end"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            sx={{ color: '#245D6B', ml: 0 }}
                        >
                            <AccountCircle sx={{ fontSize: 40 }} />
                        </IconButton>
                    </Box>
                </Toolbar>
                <Menu
                    id="menu-appbar"
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    PaperProps={{
                        sx: { mt: 0 }
                    }} open={false}
                >

                </Menu>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            bgcolor: '#245D6B',
                            color: '#fff',
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            bgcolor: '#245D6B',
                            color: '#fff',
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    bgcolor: '#f5f5f5',
                    minHeight: '100vh',
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default Dashboard;