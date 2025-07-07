import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Snackbar, Alert, InputAdornment,
    Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Pagination
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ScaleIcon from '@mui/icons-material/Scale';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApiBaseUrl } from '../config/config';
import '../App.css';
const MAGAJ_SUBTYPES = ["લાડુડી", "લાડવા", "ચોસલા"];
const ROWS_PER_PAGE = 5;

const WeightEntry: React.FC = () => {
    const [foodItems, setFoodItems] = useState<{ id: number; vangiName: string }[]>([]);
    const [selectedItems, setSelectedItems] = useState<{ [id: number]: { vangiName: string; gram: string; subType?: string } }>({});
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [savedItemSearch, setSavedItemSearch] = useState('');
    const [weightEntries, setWeightEntries] = useState<{ id: number; vangiName: string; gram: number; nang: number; createdAt: string }[]>([]);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<any>(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    type Event = {
        id: string;
        name: string;
        eventName: string;
        eventYear: string;
    };

    const [annkutEvents, setAnnkutEvents] = useState<Event[]>([]);
    const [selectedAnnkutEvent, setSelectedAnnkutEvent] = useState('');

    const API_BASE_URL = useApiBaseUrl();

    useEffect(() => {
        const fetchFoodItems = async () => {
            const res = await fetch(`${API_BASE_URL}/food-item`);
            const data = await res.json();
            setFoodItems(data.filter((item: any) => item.category === 'મીઠાઈ'));
        };
        fetchFoodItems();
    }, [API_BASE_URL]);

    useEffect(() => {
        const fetchAnnkutEvents = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/events?eventName=Annkut`);
                if (!res.ok) {
                    throw new Error(`Failed to fetch Annkut events: ${res.status}`);
                }
                const data = await res.json();
                const filteredAnnkutEvents = data.filter((event: any) => event.eventName === 'Annkut'); // Filter Annkut events
                console.log('Filtered Annkut Events:', filteredAnnkutEvents); // Debugging: Log filtered events
                setAnnkutEvents(filteredAnnkutEvents); // Update state with filtered events
            } catch (err) {
                console.error('Failed to fetch Annkut events:', err);
            }
        };
        fetchAnnkutEvents();
    }, [API_BASE_URL]);
    
    const fetchWeightEntries = async () => {
        const res = await fetch(`${API_BASE_URL}/weight-entries`);
        let data = [];
        try {
            data = await res.json();
        } catch {
            data = [];
        }
        if (!Array.isArray(data)) data = [];
        setWeightEntries(data);
    };

    useEffect(() => {
        fetchWeightEntries();
    }, []);

    useEffect(() => {
        const handleAfterPrint = () => setPrintDialogOpen(false);
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    const handleCheck = (item: { id: number; vangiName: string }) => {
        setSelectedItems(prev => {
            if (prev[item.id]) {
                const copy = { ...prev };
                delete copy[item.id];
                return copy;
            } else {
                return {
                    ...prev,
                    [item.id]: {
                        vangiName: item.vangiName,
                        gram: '',
                        nang: '',
                        subType: item.vangiName.trim().startsWith("મગજ") ? MAGAJ_SUBTYPES[0] : undefined,
                    }
                };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                let vangiName = item.vangiName;
                if (item.vangiName.startsWith("મગજ") && item.subType) {
                    vangiName = `મગજ (${item.subType})`;
                }
                console.log('Saving:', vangiName, item);
                await fetch(`${API_BASE_URL}/weight-entries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vangiName,
                        gram: Number(item.gram),
                    }),
                });
            }
            setSuccess('Weight entry saved!');
            setError('');
            setOpenSnackbar(true);
            setSelectedItems({});
            fetchWeightEntries(); // Refresh table from DB
        } catch (err) {
            setError('Failed to save weight entry.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`${API_BASE_URL}/weight-entries/${id}`, { method: 'DELETE' });
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
                headers: { 'Content-Type': 'application/json' },
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

    // Filter weight entries by search
    const filteredWeightEntries = weightEntries
        .slice() // make a copy to avoid mutating state
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .filter(item =>
            item.vangiName.toLowerCase().includes(savedItemSearch.toLowerCase())
        );

    return (
        <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScaleIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
                <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
                    Weight Entry
                </Typography>
            </Box>
            <Paper
                elevation={4}
                sx={{
                    p: { xs: 2, sm: 4 },
                    mt: 5,
                    width: '100%',
                    mx: 'auto',
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
                                    .map(item => (
                                        <Grid key={item.id} columns={{ xs: 12, sm: 6 }}>
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    background: selectedItems[item.id] ? 'rgba(36,93,107,0.08)' : '#fff',
                                                    boxShadow: selectedItems[item.id] ? '0 2px 8px rgba(36,93,107,0.10)' : 'none',
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
                                                    checked={!!selectedItems[item.id]}
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
                                                {/* Show dropdown if મગજ is selected */}
                                                {item.vangiName.trim().startsWith("મગજ") && selectedItems[item.id] && (
                                                    <TextField
                                                        select
                                                        label="Type"
                                                        value={selectedItems[item.id].subType || MAGAJ_SUBTYPES[0]}
                                                        onChange={e =>
                                                            setSelectedItems(prev => ({
                                                                ...prev,
                                                                [item.id]: {
                                                                    ...prev[item.id],
                                                                    subType: e.target.value,
                                                                },
                                                            }))
                                                        }
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
                                                        SelectProps={{
                                                            native: false,
                                                            MenuProps: {
                                                                PaperProps: {
                                                                    sx: {
                                                                        backgroundColor: '#fff',
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
                                                    >
                                                        {MAGAJ_SUBTYPES.map(sub => (
                                                            <MenuItem key={sub} value={sub} style={{ fontWeight: 600, color: '#245D6B', background: '#fff' }}>
                                                                {sub}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                )}
                                                <TextField
                                                    label="1 Piece Weight"
                                                    value={selectedItems[item.id]?.gram || ''}
                                                    onChange={e =>
                                                        setSelectedItems(prev => ({
                                                            ...prev,
                                                            [item.id]: {
                                                                ...prev[item.id],
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
                                                    disabled={!selectedItems[item.id]}
                                                />
                                            </Box>
                                        </Grid>
                                    ))}
                            </Grid>
                        </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            select
                            label="Annkut Event"
                            value={selectedAnnkutEvent}
                            onChange={(e) => setSelectedAnnkutEvent(e.target.value)}
                            fullWidth
                            size="small"
                        >
                            {annkutEvents.map((evt) => (
                                <MenuItem key={evt.id} value={evt.id}>
                                    {evt.name}
                                </MenuItem>
                            ))}
                        </TextField>
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
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>1 Piece Weight</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredWeightEntries.length > 0 ? (
                            filteredWeightEntries
                                .slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)
                                .map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{(page - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
                                        <TableCell>{item.vangiName}</TableCell>
                                        <TableCell>{item.gram}</TableCell>
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
                                <TableCell colSpan={5} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
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
                        label="Gram"
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
            <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Print Preview</DialogTitle>
                <DialogContent>
                    <Box sx={{ overflowX: 'auto' }}>
                        <div id="print-section">
                            {/* Content inside the div */}
                        </div>
                        <div style={{
                            textAlign: 'left',
                            marginBottom: 24,
                            borderBottom: '2px solid #245D6B',
                            paddingBottom: 12
                        }}>
                            <h1 style={{
                                color: '#245D6B',
                                margin: 0,
                                fontSize: 32,
                                letterSpacing: 2,
                                fontWeight: 700
                            }}>
                                Weight Entry Report
                            </h1>
                            <div style={{ color: '#555', fontSize: 16, marginTop: 4 }}>
                                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by Kitchen Manager
                            </div>
                        </div>
                        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 20 }}>
                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid #ccc', padding: 8, background: '#f5fafd', color: '#245D6B' }}>Id</th>
                                    <th style={{ border: '1px solid #ccc', padding: 8, background: '#f5fafd', color: '#245D6B' }}>Food Name</th>
                                    <th style={{ border: '1px solid #ccc', padding: 8, background: '#f5fafd', color: '#245D6B' }}>Gram</th>
                                    <th style={{ border: '1px solid #ccc', padding: 8, background: '#f5fafd', color: '#245D6B' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weightEntries
                                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                    .map((item, idx) => (
                                        <tr key={item.id}>
                                            <td style={{ border: '1px solid #ccc', padding: 8 }}>{idx + 1}</td>
                                            <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.vangiName}</td>
                                            <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.gram}</td>
                                            <td style={{ border: '1px solid #ccc', padding: 8 }}>{new Date(item.createdAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        sx={{ color: '#245D6B', fontWeight: 600 }}
                        onClick={() => setPrintDialogOpen(false)}>Close</Button>
                    <Button
                        variant="contained"
                        sx={{ bgcolor: '#245D6B', color: '#fff', fontWeight: 600 }}
                        onClick={() => window.print()}
                    >
                        Print
                    </Button>
                </DialogActions>
            </Dialog>
            <div>
                <h1>Annkut Events</h1>
                {annkutEvents.length > 0 ? (
                    <ul>
                        {annkutEvents.map(event => (
                            <li key={event.id}>
                                {event.eventName} ({event.eventYear})
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No Annkut events found.</p>
                )}
            </div>
        </Box>
    );
};

export default WeightEntry;