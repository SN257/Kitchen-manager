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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DescriptionIcon from '@mui/icons-material/Description';
import CategoryIcon from '@mui/icons-material/Category';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Pagination from '@mui/material/Pagination';
import MuiAlert from '@mui/material/Alert';
import axios from 'axios';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const EventMaster: React.FC = () => {
    const [eventType, setEventType] = useState('');
    const [annkutType, setAnnkutType] = useState('');
    const [customAnnkutType, setCustomAnnkutType] = useState('');
    const [eventName, setEventName] = useState('');
    const [eventYear, setEventYear] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [events, setEvents] = useState<any[]>([]);
    
    // Edit and Delete states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editEvent, setEditEvent] = useState<any>(null);
    const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
    
    // Edit dialog specific states
    const [editEventType, setEditEventType] = useState('');
    const [editAnnkutType, setEditAnnkutType] = useState('');
    const [editCustomAnnkutType, setEditCustomAnnkutType] = useState('');
    
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 1900; y--) years.push(y);
    const ROWS_PER_PAGE = 5;
    const [page, setPage] = useState(1);

    const paginatedEvents = events.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    const API_BASE_URL = useApiBaseUrl();

    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
    const [snackbarMsg, setSnackbarMsg] = useState('');

    const eventTypes = ['Annkut', 'Other'];
    const annkutTypes = ['Diwali Annkut', 'Patotsav Annkut', 'Other Annkut'];

    const { refreshAnnkutEvents } = useAnnkutEvent();

    // Update event name when selections change
    useEffect(() => {
        if (eventType === 'Annkut') {
            if (annkutType === 'Other Annkut' && customAnnkutType) {
                setEventName(customAnnkutType);
            } else if (annkutType && annkutType !== 'Other Annkut') {
                setEventName(annkutType);
            }
        } else if (eventType === 'Other') {
            setEventName('');
        }
    }, [eventType, annkutType, customAnnkutType]);

    // Reset dependent fields when event type changes
    const handleEventTypeChange = (value: string) => {
        setEventType(value);
        setAnnkutType('');
        setCustomAnnkutType('');
        setEventName('');
    };

    // Reset custom field when annkut type changes
    const handleAnnkutTypeChange = (value: string) => {
        setAnnkutType(value);
        if (value !== 'Other Annkut') {
            setCustomAnnkutType('');
        }
    };

    // Fetch events from backend
    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/events`, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
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
        
        if (!eventType || !eventYear) {
            setError('Event Type and Year are required.');
            return;
        }

        if (eventType === 'Annkut' && !annkutType) {
            setError('Please select Annkut type.');
            return;
        }

        if (eventType === 'Annkut' && annkutType === 'Other Annkut' && !customAnnkutType) {
            setError('Please enter custom Annkut type.');
            return;
        }

        if (eventType === 'Other' && !eventName) {
            setError('Please enter event name.');
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/api/events`, {
                eventName,
                eventYear,
                description,
            }, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setSuccess('Event saved successfully!');
            setEventType('');
            setAnnkutType('');
            setCustomAnnkutType('');
            setEventName('');
            setEventYear('');
            setDescription('');
            fetchEvents();
            
            // Refresh Annkut events if it's an Annkut event
            if (eventName.toLowerCase().includes('annkut')) {
                await refreshAnnkutEvents();
            }
        } catch (err) {
            setError('Failed to save event');
        }
    };

    // Handle edit functionality
    const handleEditOpen = (event: any) => {
        setEditEvent(event);
        
        // Determine event type and set appropriate fields
        const eventName = event.eventName;
        if (annkutTypes.includes(eventName)) {
            setEditEventType('Annkut');
            setEditAnnkutType(eventName);
            setEditCustomAnnkutType('');
        } else if (eventName && !annkutTypes.includes(eventName)) {
            // Check if it's a custom annkut type
            if (eventName.includes('Annkut') || eventName.includes('અન્નકૂટ')) {
                setEditEventType('Annkut');
                setEditAnnkutType('Other Annkut');
                setEditCustomAnnkutType(eventName);
            } else {
                setEditEventType('Other');
                setEditAnnkutType('');
                setEditCustomAnnkutType('');
            }
        }
        
        setEditDialogOpen(true);
    };

    const handleEditEventTypeChange = (value: string) => {
        setEditEventType(value);
        setEditAnnkutType('');
        setEditCustomAnnkutType('');
        
        if (value === 'Other') {
            setEditEvent((prev: any) => prev ? { ...prev, eventName: '' } : null);
        }
    };

    const handleEditAnnkutTypeChange = (value: string) => {
        setEditAnnkutType(value);
        if (value !== 'Other Annkut') {
            setEditCustomAnnkutType('');
            setEditEvent((prev: any) => prev ? { ...prev, eventName: value } : null);
        }
    };

    // Update event name when edit selections change
    useEffect(() => {
        if (editEventType === 'Annkut') {
            if (editAnnkutType === 'Other Annkut' && editCustomAnnkutType) {
                setEditEvent((prev: any) => prev ? { ...prev, eventName: editCustomAnnkutType } : null);
            } else if (editAnnkutType && editAnnkutType !== 'Other Annkut') {
                setEditEvent((prev: any) => prev ? { ...prev, eventName: editAnnkutType } : null);
            }
        }
    }, [editEventType, editAnnkutType, editCustomAnnkutType]);

    const handleEditSave = async () => {
        if (!editEvent) return;
        
        try {
            await axios.put(`${API_BASE_URL}/api/events/${editEvent.id}`, {
                eventName: editEvent.eventName,
                eventYear: editEvent.eventYear,
                description: editEvent.description,
            }, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setEditDialogOpen(false);
            setEditEvent(null);
            setSuccess('Event updated successfully!');
            fetchEvents();
            
            // Refresh Annkut events if it's an Annkut event
            if (editEvent.eventName.toLowerCase().includes('annkut')) {
                await refreshAnnkutEvents();
            }
        } catch (err) {
            setError('Failed to update event');
        }
    };

    // Handle delete functionality
    const handleDeleteOpen = (id: number) => {
        setDeleteEventId(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteEventId) return;

        const eventToDelete = events.find(e => e.id === deleteEventId);
        
        try {
            await axios.delete(`${API_BASE_URL}/api/events/${deleteEventId}`, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setDeleteDialogOpen(false);
            setDeleteEventId(null);
            setSuccess('Event deleted successfully!');
            fetchEvents();
            
            // Refresh Annkut events if it was an Annkut event
            if (eventToDelete?.eventName.toLowerCase().includes('annkut')) {
                await refreshAnnkutEvents();
            }
        } catch (err) {
            setError('Failed to delete event');
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
                        flexDirection: 'column',
                        gap: 3,
                        width: '100%',
                    }}
                >
                    {/* First Row */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            select
                            label="Event Type"
                            value={eventType}
                            onChange={e => handleEventTypeChange(e.target.value)}
                            required
                            fullWidth
                            sx={{ flex: 1 }}
                            InputProps={{
                                startAdornment: (
                                    <CategoryIcon sx={{ color: '#245D6B', mr: 1 }} />
                                ),
                            }}
                        >
                            {eventTypes.map(type => (
                                <MenuItem key={type} value={type}>
                                    {type}
                                </MenuItem>
                            ))}
                        </TextField>

                        {eventType === 'Annkut' && (
                            <TextField
                                select
                                label="Annkut Type"
                                value={annkutType}
                                onChange={e => handleAnnkutTypeChange(e.target.value)}
                                required
                                fullWidth
                                sx={{ flex: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <EventIcon sx={{ color: '#245D6B', mr: 1 }} />
                                    ),
                                }}
                            >
                                {annkutTypes.map(type => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        {eventType === 'Annkut' && annkutType === 'Other Annkut' && (
                            <TextField
                                label="Custom Annkut Type"
                                value={customAnnkutType}
                                onChange={e => setCustomAnnkutType(e.target.value)}
                                required
                                fullWidth
                                sx={{ flex: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <EventIcon sx={{ color: '#245D6B', mr: 1 }} />
                                    ),
                                }}
                            />
                        )}

                        {eventType === 'Other' && (
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
                        )}
                    </Box>

                    {/* Second Row */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
                                minWidth: '120px',
                                transition: 'background 0.3s, color 0.3s',
                                '&:hover': {
                                    bgcolor: '#4A7D91',
                                    color: '#fff',
                                },
                            }}
                            size="large"
                        >
                            Save Event
                        </Button>
                    </Box>
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
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
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
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            sx={{ color: '#245D6B', mr: 1 }}
                                            onClick={() => handleEditOpen(event)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteOpen(event.id)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
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

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit Event</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {/* Event Type Row */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                select
                                label="Event Type"
                                value={editEventType}
                                onChange={e => handleEditEventTypeChange(e.target.value)}
                                required
                                fullWidth
                                sx={{ flex: 1 }}
                            >
                                {eventTypes.map(type => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </TextField>

                            {editEventType === 'Annkut' && (
                                <TextField
                                    select
                                    label="Annkut Type"
                                    value={editAnnkutType}
                                    onChange={e => handleEditAnnkutTypeChange(e.target.value)}
                                    required
                                    fullWidth
                                    sx={{ flex: 1 }}
                                >
                                    {annkutTypes.map(type => (
                                        <MenuItem key={type} value={type}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}

                            {editEventType === 'Annkut' && editAnnkutType === 'Other Annkut' && (
                                <TextField
                                    label="Custom Annkut Type"
                                    value={editCustomAnnkutType}
                                    onChange={e => setEditCustomAnnkutType(e.target.value)}
                                    required
                                    fullWidth
                                    sx={{ flex: 1 }}
                                />
                            )}

                            {editEventType === 'Other' && (
                                <TextField
                                    label="Event Name"
                                    value={editEvent?.eventName || ''}
                                    onChange={e => setEditEvent((prev: any) => prev ? { ...prev, eventName: e.target.value } : null)}
                                    required
                                    fullWidth
                                    sx={{ flex: 1 }}
                                />
                            )}
                        </Box>

                        {/* Year and Description Row */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                select
                                label="Event Year"
                                value={editEvent?.eventYear || ''}
                                onChange={e => setEditEvent((prev: any) => prev ? { ...prev, eventYear: e.target.value } : null)}
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
                                    },
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
                                value={editEvent?.description || ''}
                                onChange={e => setEditEvent((prev: any) => prev ? { ...prev, description: e.target.value } : null)}
                                fullWidth
                                sx={{ flex: 2 }}
                                multiline
                                rows={2}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleEditSave} variant="contained" sx={{ bgcolor: '#245D6B' }}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this event?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

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
