import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Snackbar, Alert, InputAdornment,
    Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Pagination
} from '@mui/material';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApiBaseUrl } from '../config/config';
import '../App.css';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
const ROWS_PER_PAGE = 5;

const WeightEntry: React.FC = () => {
    const [foodItems, setFoodItems] = useState<{ id: number; vangiName: string; uniqueKey: string }[]>([]);
    const [selectedItems, setSelectedItems] = useState<{ [key: string]: { vangiName: string; gram: string } }>({});
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [savedItemSearch, setSavedItemSearch] = useState('');
    const [weightEntries, setWeightEntries] = useState<{ 
        id: number; 
        vangiName: string; 
        gram: number; 
        createdAt: string; 
        eventId?: number; 
        event?: { 
            id: number; 
            eventName: string; 
            eventYear: string; 
            description?: string; 
        } 
    }[]>([]);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<any>(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();

    const API_BASE_URL = useApiBaseUrl();

    // Fetch current user data
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/user/me`, {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (res.ok) {
                    const userData = await res.json();
                    setCurrentUser(userData);
                } else {
                }
            } catch (error) {
            }
        };
        fetchCurrentUser();
    }, [API_BASE_URL]);

    useEffect(() => {
        const fetchSelectedMithais = async () => {
            try {
                // Require event to scope selections
                if (!selectedAnnkutEvent) {
                    setFoodItems([]);
                    return;
                }
                // Fetch selections and the food item catalog to verify mithai category
                const token = localStorage.getItem('token');
                const headers: HeadersInit = token
                    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                    : { 'Content-Type': 'application/json' };
                const [selRes, foodRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/annkut-food-selections?eventId=${selectedAnnkutEvent}`, { 
                        method: 'GET', 
                        credentials: 'include',
                        headers,
                    }),
                    fetch(`${API_BASE_URL}/food-item`, { 
                        method: 'GET', 
                        credentials: 'include',
                        headers,
                    }),
                ]);
                if (!selRes.ok) {
                    setFoodItems([]);
                    return;
                }
                const selections = await selRes.json();
                const foodCatalog = foodRes.ok ? await foodRes.json() : [];
                const mithaiSet = new Set(
                    (Array.isArray(foodCatalog) ? foodCatalog : [])
                        .filter((fi: any) => fi.category === 'મીઠાઈ')
                        .map((fi: any) => (fi.vangiName || '').trim())
                );
                const items = (Array.isArray(selections) ? selections : [])
                    .filter((entry: any) => {
                        const fromRelation = entry?.foodItem?.category === 'મીઠાઈ';
                        const rawName = (entry?.vangiName ?? entry?.foodItem?.vangiName ?? '').trim();
                        // Normalize by stripping any parenthetical subtype e.g., "મગજ (લાડુડી)" -> "મગજ"
                        const baseName = rawName.replace(/\s*\(.*?\)\s*/g, '').trim();
                        const fromCatalog = mithaiSet.has(rawName) || mithaiSet.has(baseName);
                        return fromRelation || fromCatalog;
                    })
                    .map((entry: any) => ({
                        id: entry?.foodItem?.id ?? entry?.id,
                        vangiName: entry?.vangiName ?? entry?.foodItem?.vangiName,
                        uniqueKey: `${entry?.foodItem?.id ?? entry?.id}-${entry?.vangiName ?? entry?.foodItem?.vangiName}`,
                    }))
                    // de-duplicate by vangiName
                    .filter((itm: any, idx: number, arr: any[]) => arr.findIndex(x => x.vangiName === itm.vangiName) === idx);

                // Remove items that already have weight entries for the selected event (avoid duplicates)
                try {
                    const existingNames = new Set(
                        (Array.isArray(weightEntries) ? weightEntries : [])
                            .filter((w) => selectedAnnkutEvent ? w.eventId?.toString() === selectedAnnkutEvent.toString() : true)
                            .map((w) => (w.vangiName || '').trim())
                    );
                    const filtered = items.filter((it: any) => !existingNames.has((it.vangiName || '').trim()));
                    setFoodItems(filtered);
                } catch (e) {
                    setFoodItems(items);
                }
                setFoodItems(items);
            } catch {
                setFoodItems([]);
            }
        };
        fetchSelectedMithais();
    }, [API_BASE_URL, selectedAnnkutEvent]);
    useEffect(() => {
        if (selectedAnnkutEvent) {
            fetchWeightEntries();
        }
    }, [selectedAnnkutEvent]);
    
    const fetchWeightEntries = async () => {
        try {
            // Check if user is logged in
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }

            const url = selectedAnnkutEvent 
                ? `${API_BASE_URL}/weight-entries?eventId=${selectedAnnkutEvent}`
                : `${API_BASE_URL}/weight-entries`;
            
            const res = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                }
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    // Clear local storage and redirect to login
                    localStorage.clear();
                    window.location.href = '/login';
                    return;
                }
                setWeightEntries([]);
                return;
            }
            
            const data = await res.json();
            setWeightEntries(Array.isArray(data) ? data : []);
        } catch (error) {
            setWeightEntries([]);
        }
    };

    useEffect(() => {
        fetchWeightEntries();
    }, []);

    useEffect(() => {
        const handleAfterPrint = () => setPrintDialogOpen(false);
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    const handleCheck = (item: { id: number; vangiName: string; uniqueKey: string }) => {
        setSelectedItems(prev => {
            if (prev[item.uniqueKey]) {
                const copy = { ...prev };
                delete copy[item.uniqueKey];
                return copy;
            } else {
                return {
                    ...prev,
                    [item.uniqueKey]: {
                        vangiName: item.vangiName,
                        gram: '',
                        nang: '',
                    }
                };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentUser) {
            setError('User not authenticated. Please login again.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }
        
        if (!selectedAnnkutEvent) {
            setError('Please select an Annkut event first.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }
        
        if (Object.keys(selectedItems).length === 0) {
            setError('Please select at least one food item.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }
        for (const item of Object.values(selectedItems)) {
            if (!item.gram || isNaN(Number(item.gram)) || Number(item.gram) <= 0) {
                setError('Please enter a valid gram per item for all selected items.');
                setSuccess('');
                setOpenSnackbar(true);
                return;
            }
            // if (!item.nang || isNaN(Number(item.nang)) || Number(item.nang) <= 0) {
            //     setError('Please enter a valid nang for all selected items.');
            //     setSuccess('');
            //     setOpenSnackbar(true);
            //     return;
            // }
        }
        try {
            // Save all selected items to backend
            for (const item of Object.values(selectedItems)) {
                const vangiName = item.vangiName;
                await fetch(`${API_BASE_URL}/weight-entries`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        vangiName,
                        gram: Number(item.gram),
                        eventId: selectedAnnkutEvent,
                        userId: currentUser.id // Include user ID
                    }),
                });
            }
            setSuccess('Weight entry saved!');
            setError('');
            setOpenSnackbar(true);
            setSelectedItems({});
            fetchWeightEntries(); // Refresh table from DB
            // Force re-render of food items by updating a state or calling fetchFoodItems again
            // Force re-render of food items by updating a state or calling fetchFoodItems again
        } catch (err) {
            setError('Failed to save weight entry.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`${API_BASE_URL}/weight-entries/${id}`, { 
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetchWeightEntries();
            setSuccess('Entry deleted!');
            setError('');
            setOpenSnackbar(true);
        } catch {
            setError('Failed to delete entry.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    const handleEditOpen = (entry: any) => {
        setEditEntry({ ...entry });
        setEditDialogOpen(true);
    };

    const handleEditChange = (field: string, value: any) => {
        setEditEntry((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleEditSave = async () => {
        try {
            await fetch(`${API_BASE_URL}/weight-entries/${editEntry.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    vangiName: editEntry.vangiName,
                    gram: Number(editEntry.gram),
                }),
            });
            setEditDialogOpen(false);
            setEditEntry(null);
            fetchWeightEntries();
            setSuccess('Entry updated!');
            setError('');
            setOpenSnackbar(true);
        } catch {
            setError('Failed to update entry.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    // Filter weight entries by search and selected event
    const filteredWeightEntries = weightEntries
        .slice() // make a copy to avoid mutating state
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .filter(item => {
            // Filter by search term
            const matchesSearch = item.vangiName.toLowerCase().includes(savedItemSearch.toLowerCase());
            
            // Filter by selected event
            const matchesEvent = selectedAnnkutEvent ? 
                item.eventId?.toString() === selectedAnnkutEvent.toString() : 
                true;
            
            return matchesSearch && matchesEvent;
        });

    return (
        <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
                    Weight Master
                </Typography>
                {selectedEventDetails && (
                    <Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>
                        - {selectedEventDetails.eventName} {selectedEventDetails.eventYear}
                    </Typography>
                )}
            </Box>
            
            <Paper
                elevation={4}
                sx={{
                    p: { xs: 2, sm: 4 },
                    mt: 3,
                    width: '100%',
                    mx: 'auto',
                    borderRadius: 2,
                    boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
                    opacity: selectedAnnkutEvent ? 1 : 0.5,
                    pointerEvents: selectedAnnkutEvent ? 'auto' : 'none',
                    position: 'relative',
                }}
            >
                {!selectedAnnkutEvent && (
                    <Box sx={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        textAlign: 'center',
                        color: '#245D6B',
                        fontWeight: 600
                    }}>
                    </Box>
                )}
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        width: '100%',
                    }}
                >
                    {/* Inline Food Item Selection */}
                    <Box sx={{ mb: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: -2, justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 600, color: '#245D6B', mt: 0, mb: 2 }} variant="h6">
                                Select Food Item(s) (મીઠાઈ)
                            </Typography>
                            <TextField
                                placeholder="Search Food Item"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: '#245D6B' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    mb: 2,
                                    background: '#f5fafd',
                                    borderRadius: 2,
                                }}
                            />
                        </Box>
                        <Box
                            sx={{
                                maxHeight: 300,
                                overflowY: 'auto',
                                background: '#f9f9f9',
                                p: 2.5,
                                borderRadius: 2,
                                border: '1px solid #e0e0e0',
                            }}
                        >
                            <Grid container spacing={2}>
                                {foodItems
                                    .filter(item => item.vangiName.toLowerCase().includes(search.toLowerCase()))
                                    .filter(item => {
                                        // Filter out items that are already saved for the selected event
                                        if (!selectedAnnkutEvent) return true;
                                        
                                        
                                        const isAlreadySaved = weightEntries.some(entry => {
                                            const match = entry.vangiName === item.vangiName && 
                                                         entry.eventId?.toString() === selectedAnnkutEvent.toString();
                                            return match;
                                        });
                                        
                                        // No special handling for મગજ subtypes here
                                        
                                        return !isAlreadySaved;
                                    })
                                    .map(item => (
                                        <Grid key={item.uniqueKey} columns={{ xs: 12, sm: 6 }}>
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    background: selectedItems[item.uniqueKey] ? 'rgba(36,93,107,0.08)' : '#fff',
                                                    boxShadow: selectedItems[item.uniqueKey] ? '0 2px 8px rgba(36,93,107,0.10)' : 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 2,
                                                    height: 70,
                                                    width: 500,
                                                    transition: 'background 0.2s, box-shadow 0.2s',
                                                    border: '1px solid #e0e0e0',
                                                    '&:hover': {
                                                        background: 'rgba(36,93,107,0.12)',
                                                        boxShadow: '0 4px 16px rgba(36,93,107,0.12)',
                                                    },
                                                }}
                                            >
                                                <Checkbox
                                                    checked={!!selectedItems[item.uniqueKey]}
                                                    onChange={() => handleCheck(item)}
                                                    sx={{
                                                        color: '#245D6B',
                                                        '&.Mui-checked': {
                                                            color: '#4A7D91',
                                                        },
                                                    }}
                                                />
                                                <Typography sx={{ flex: 1, color: '#245D6B', fontWeight: 400, fontSize: 16 }}>
                                                    {item.vangiName}
                                                </Typography>
                                                {/* No subtype dropdown for મગજ */}
                                                <TextField
                                                    label="Weight (g)"
                                                    value={selectedItems[item.uniqueKey]?.gram || ''}
                                                    onChange={e =>
                                                        setSelectedItems(prev => ({
                                                            ...prev,
                                                            [item.uniqueKey]: {
                                                                vangiName: item.vangiName,
                                                                gram: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                    type="number"
                                                    inputProps={{ min: 0, step: 0.01 }}
                                                    size="small"
                                                    sx={{
                                                        width: 120,
                                                        background: '#fff',
                                                        borderRadius: 1,
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: 1,
                                                            color: '#245D6B',
                                                            fontWeight: 400,
                                                            background: '#fff',
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            color: '#245D6B',
                                                            fontWeight: 400,
                                                        },
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: '#245D6B',
                                                        },
                                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: '#4A7D91',
                                                        },
                                                    }}
                                                    InputLabelProps={{
                                                        style: { color: '#245D6B', fontWeight: 400 },
                                                    }}
                                                    disabled={!selectedItems[item.uniqueKey]}
                                                />
                                            </Box>
                                        </Grid>
                                    ))}
                            </Grid>
                        </Box>
                    </Box>  
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
                        Save
                    </Button>
                </Box>
            </Paper>
            {weightEntries.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 4, mb: -2, gap: 2 }}>
                    <TextField
                        label="Search by Food Name"
                        variant="outlined"
                        size="small"
                        value={savedItemSearch}
                        onChange={e => setSavedItemSearch(e.target.value)}
                        sx={{
                            width: 300,
                            background: '#fff',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-root': {
                                background: '#fff',
                                color: '#245D6B',
                            },
                            '& .MuiInputLabel-root': { color: '#245D6B' },
                            '& .MuiInputBase-input': { color: '#245D6B' },
                        }}
                    />
                    <Button
                        variant="outlined"
                        sx={{
                            color: '#245D6B',
                            borderColor: '#245D6B',
                            fontWeight: 600,
                            ml: 0,
                            height: 40,
                            '&:hover': {
                                bgcolor: '#f5fafd',
                                borderColor: '#4A7D91',
                            },
                        }}
                        onClick={() => setPrintDialogOpen(true)}
                    >
                        Print
                    </Button>
                </Box>
            )}
            <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Id</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Food Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>1 Piece Weight (g)</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Event</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!selectedAnnkutEvent ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ color: '#245D6B', fontStyle: 'italic', py: 4, fontSize: 16 }}>
                                    Please select an Annkut event first
                                </TableCell>
                            </TableRow>
                        ) : filteredWeightEntries.length > 0 ? (
                            filteredWeightEntries
                                .slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)
                                .map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{(page - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
                                        <TableCell>{item.vangiName}</TableCell>
                                        <TableCell>{item.gram} g</TableCell>
                                        <TableCell>{item.event?.eventName || 'N/A'} - {item.event?.eventYear || 'N/A'}</TableCell>
                                        <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                sx={{ color: '#245D6B' }}
                                                onClick={() => handleEditOpen(item)}
                                                aria-label="edit"
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(item.id)}
                                                aria-label="delete"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
                                    No data available
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>

                </Table>
            </TableContainer>
            {filteredWeightEntries.length > ROWS_PER_PAGE && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination
                        count={Math.ceil(filteredWeightEntries.length / ROWS_PER_PAGE)}
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
                <Alert
                    onClose={() => setOpenSnackbar(false)}
                    severity={success ? 'success' : 'error'}
                    sx={{ width: '100%' }}
                >
                    {success || error}
                </Alert>
            </Snackbar>
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
                <DialogTitle>Edit Entry</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
                    <TextField
                        label="Food Name"
                        value={editEntry?.vangiName || ''}
                        onChange={e => handleEditChange('vangiName', e.target.value)}
                        fullWidth
                    />
                    <TextField
                        label="1 Piece Weight (g)"
                        type="number"
                        value={editEntry?.gram || ''}
                        onChange={e => handleEditChange('gram', e.target.value)}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleEditSave} variant="contained" color="primary">Save</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="xl" fullWidth>
                <DialogTitle>
                    Print Preview
                    <Button
                        variant="contained"
                        sx={{ float: "right", bgcolor: "#245D6B", ml: 2 }}
                        onClick={() => window.print()}
                    >
                        Print
                    </Button>
                </DialogTitle>
                <DialogContent>
                    <Box id="print-section">
                        <div
                            style={{
                                textAlign: "left",
                                marginBottom: 24,
                                borderBottom: "2px solid #245D6B",
                                paddingBottom: 12,
                            }}
                        >
                            <h1
                                style={{
                                    color: "#245D6B",
                                    margin: 0,
                                    fontSize: 32,
                                    letterSpacing: 2,
                                    fontWeight: 700,
                                }}
                            >
                                Weight Master Report
                            </h1>
                            <div style={{ color: "#555", fontSize: 16, marginTop: 4 }}>
                                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by
                                Kitchen Manager
                                {selectedEventDetails && (
                                    <span>
                                        &nbsp;|&nbsp; Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {filteredWeightEntries.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    color: "#999",
                                    fontStyle: "italic",
                                    padding: "40px",
                                    fontSize: "16px",
                                }}
                            >
                                No weight entry data available for printing.
                            </div>
                        ) : (
                            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 20 }}>
                                <thead>
                                    <tr>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "8px",
                                                background: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                                textAlign: "left",
                                            }}
                                        >
                                            Id
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "8px",
                                                background: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                                textAlign: "left",
                                            }}
                                        >
                                            Food Name
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "8px",
                                                background: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                                textAlign: "left",
                                            }}
                                        >
                                            1 Piece Weight (g)
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "8px",
                                                background: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                                textAlign: "left",
                                            }}
                                        >
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredWeightEntries
                                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                        .map((item, idx) => (
                                            <tr key={item.id}>
                                                <td style={{ border: '1px solid #ccc', padding: 8 }}>{idx + 1}</td>
                                                <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.vangiName}</td>
                                                <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.gram} g</td>
                                                <td style={{ border: '1px solid #ccc', padding: 8 }}>{new Date(item.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPrintDialogOpen(false)} sx={{ color: '#245D6B', fontWeight: 600 }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default WeightEntry;
