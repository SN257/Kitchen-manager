import React, { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    MenuItem,
    Alert,
    InputAdornment,
} from "@mui/material";
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import { useApiBaseUrl } from "../config/config";

const CreateUser: React.FC = () => {
    const [form, setForm] = useState({
        username: "",
        password: "",
        role: "",
        center: "",
    });
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const API_BASE_URL = useApiBaseUrl();

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };


    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");

        const trimmedUsername = form.username.trim();
        if (!trimmedUsername || !form.password || !form.role || !form.center) {
            setError("All fields are required.");
            return;
        }

        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setMessage("User created successfully!");
                setForm({ username: "", password: "", role: "", center: "" });
            } else {
                setSuccess(false);
                setMessage(data.error || "Failed to create user.");
            }
        } catch {
            setSuccess(false);
            setMessage("Error connecting to server.");
        }
        setLoading(false);
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIndIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
                <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
                    Create New User
                </Typography>
            </Box>

            <Paper
                elevation={4}
                sx={{
                    p: { xs: 2, sm: 4 },
                    mt: 5,
                    width: '100%',
                    maxWidth: 600,
                    borderRadius: 2,
                    boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
                    mx: 'auto'
                }}
            >
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField
                        label="Username"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        fullWidth
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PersonIcon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
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
                        label="Password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        fullWidth
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockIcon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={handleTogglePassword}
                                        edge="end"
                                        aria-label="toggle password visibility"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
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
                        select
                        label="Role"
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        fullWidth
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <AssignmentIndIcon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
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
                    >
                        <MenuItem value="">Select Role</MenuItem>
                        <MenuItem value="center-admin">Center Admin</MenuItem>
                        <MenuItem value="sant">Sant</MenuItem>
                    </TextField>
                    <TextField
                        label="Center"
                        name="center"
                        value={form.center}
                        onChange={handleChange}
                        fullWidth
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LocationCityIcon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
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
                        variant="contained"
                        type="submit"
                        fullWidth
                        disabled={loading}
                        sx={{
                            bgcolor: '#245D6B',
                            fontWeight: 600,
                            letterSpacing: 1,
                            height: '50px',
                            transition: 'background 0.3s, color 0.3s',
                            '&:hover': {
                                bgcolor: '#4A7D91',
                                color: '#fff',
                            },
                        }}
                    >
                        {loading ? "Creating User..." : "Create User"}
                    </Button>
                </Box>

                {message && (
                    <Alert
                        severity={success ? "success" : "error"}
                        sx={{ mt: 3 }}
                        variant="standard"
                    >
                        {message}
                    </Alert>
                )}
            </Paper>
        </Box>
    );
};

export default CreateUser;