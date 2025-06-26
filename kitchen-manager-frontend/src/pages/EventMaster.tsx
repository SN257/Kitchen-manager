import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    MenuItem,
    Snackbar,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DescriptionIcon from '@mui/icons-material/Description';
import Pagination from '@mui/material/Pagination';
import MuiAlert from '@mui/material/Alert';
import axios from 'axios';
import { useApiBaseUrl } from '../config/config';

const EventMaster: React.FC = () => {
    const [eventName, setEventName] = useState('');
    const [eventYear, setEventYear] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [events, setEvents] = useState<any[]>([]); // Replace any with your event type
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 1900; y--) years.push(y);
    const ROWS_PER_PAGE = 5;
    const [page, setPage] = useState(1);

    const paginatedEvents = events.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    const API_BASE_URL = useApiBaseUrl(); // or use your config

    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
    const [snackbarMsg, setSnackbarMsg] = useState('');

    // Fetch events from backend
    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/events`);
            setEvents(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setError('Failed to fetch events');
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        if (error) {
            setSnackbarType('error');
            setSnackbarMsg(error);
            setOpenSnackbar(true);
        } else if (success) {
            setSnackbarType('success');
            setSnackbarMsg(success);
            setOpenSnackbar(true);
        }
    }, [error, success]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!eventName || !eventYear) {
            setError('Event Name and Year are required.');
            return;
        }
        try {
            await axios.post(`${API_BASE_URL}/api/events`, {
                eventName,
                eventYear,
                description,
            });
            setSuccess('Event saved successfully!');
            setEventName('');
            setEventYear('');
            setDescription('');
            fetchEvents(); // Refresh the table from DB
        } catch (err) {
            setError('Failed to save event');
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EventIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
                <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
                    Event Master
                </Typography>
            </Box>
            <Paper
                elevation={4}
                sx={{
                    p: { xs: 2, sm: 4 },
                    mt: 5,
                    width: '100%',
                    borderRadius: 2,
                    boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
                }}
            >
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 2,
                        alignItems: 'center',
                        width: '100%',
                    }}
                >
                    <TextField
                        label="Event Name"
                        value={eventName}
                        onChange={e => setEventName(e.target.value)}
                        required
                        fullWidth
                        sx={{ flex: 1 }}
                        InputProps={{
                            startAdornment: (
                                <EventIcon sx={{ color: '#245D6B', mr: 1 }} />
                            ),
                        }}
                    />
                    <TextField
                        select
                        label="Event Year"
                        value={eventYear}
                        onChange={e => setEventYear(e.target.value)}
                        required
                        fullWidth
                        sx={{ flex: 1 }}
                        SelectProps={{
                            MenuProps: {
                                PaperProps: {
                                    style: {
                                        maxHeight: 5 * 48,
                                        overflowY: 'auto',
                                    },
                                },
                                anchorOrigin: {
                                    vertical: 'bottom',
                                    horizontal: 'left',
                                },
                                transformOrigin: {
                                    vertical: 'top',
                                    horizontal: 'left',
                                },
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <CalendarMonthIcon sx={{ color: '#245D6B', mr: 1 }} />
                            ),
                        }}
                    >
                        {years.map(year => (
                            <MenuItem key={year} value={year}>
                                {year}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label="Description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        fullWidth
                        sx={{ flex: 2 }}
                        InputProps={{
                            startAdornment: (
                                <DescriptionIcon sx={{ color: '#245D6B', mr: 1 }} />
                            ),
                        }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        sx={{
                            bgcolor: '#245D6B',
                            fontWeight: 600,
                            letterSpacing: 1,
                            height: '56px',
                            minWidth: '90px',
                            transition: 'background 0.3s, color 0.3s',
                            '&:hover': {
                                bgcolor: '#4A7D91',
                                color: '#fff',
                            },
                            alignSelf: 'stretch',
                        }}
                        size="large"
                    >
                        Save Event
                    </Button>
                </Box>
            </Paper>

            {/* Event Table */}
            <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Event Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Year</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Description</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedEvents.length > 0 ? (
                            paginatedEvents.map((event, idx) => (
                                <TableRow key={event.id}>
                                    <TableCell>{(page - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
                                    <TableCell>{event.eventName}</TableCell>
                                    <TableCell>{event.eventYear}</TableCell>
                                    <TableCell>{event.description}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
                                    No events found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {Math.ceil(events.length / ROWS_PER_PAGE) > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination
                        count={Math.ceil(events.length / ROWS_PER_PAGE)}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        sx={{
                            '& .MuiPaginationItem-root': {
                                color: '#245D6B',
                                borderColor: '#245D6B',
                            },
                            '& .Mui-selected': {
                                backgroundColor: '#4A7D91 !important',
                                color: '#fff',
                                borderColor: '#245D6B',
                            },
                            '& .MuiPaginationItem-root:hover': {
                                backgroundColor: '#E3F2FD',
                            },
                        }}
                    />
                </Box>
            )}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <MuiAlert
                    onClose={() => setOpenSnackbar(false)}
                    severity={snackbarType}
                    sx={{ width: '100%' }}
                    variant="standard"
                >
                    {snackbarMsg}
                </MuiAlert>
            </Snackbar>
        </Box>
    );
};

export default EventMaster;