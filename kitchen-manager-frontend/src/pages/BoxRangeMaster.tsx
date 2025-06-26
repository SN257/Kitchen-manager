import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    InputAdornment,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Pagination,
    Snackbar,
    Alert,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useApiBaseUrl } from '../config/config'; // Import BASE_URL from config.ts

const ROWS_PER_PAGE = 5;

const BoxRangeEntry: React.FC = () => {
    const [priceRange, setPriceRange] = useState('');
    const [boxType, setBoxType] = useState('');
    const [gramPerBox, setGramPerBox] = useState('');
    const [search, setSearch] = useState('');
    const [boxRanges, setBoxRanges] = useState<{ id: number; priceRange: string; boxType: string; gramPerBox: number }[]>([]);
    const [editingBox, setEditingBox] = useState<{ id: number; priceRange: string; boxType: string; gramPerBox: number } | null>(null);
    const [deleteBoxId, setDeleteBoxId] = useState<number | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const API_BASE_URL = useApiBaseUrl();

    // Fetch data from the database
    useEffect(() => {
        const fetchBoxRanges = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/box-ranges`);
                const data = await response.json();
                setBoxRanges(data);
            } catch (error) {
                console.error('Error fetching box ranges:', error);
            }
        };
        fetchBoxRanges();
    }, []);

    // Add a new box range
    const handleAdd = async () => {
        if (!priceRange || !boxType || !gramPerBox) {
            setError('Please fill in all fields.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/box-ranges`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceRange,
                    boxType,
                    gramPerBox,
                }),
            });
            const newBoxRange = await response.json();
            setBoxRanges(prev => [...prev, newBoxRange]);
            setPriceRange('');
            setBoxType('');
            setGramPerBox('');
            setSuccess('Box range added successfully!');
            setError('');
            setOpenSnackbar(true);
        } catch (error) {
            setError('Failed to add box range.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    // Open edit dialog
    const handleEditOpen = (box: { id: number; priceRange: string; boxType: string; gramPerBox: number }) => {
        setEditingBox(box);
        setEditDialogOpen(true);
    };

    // Save edited box range
    const handleEditSave = async () => {
        if (!editingBox) return;
        try {
            await fetch(`${API_BASE_URL}/box-ranges/${editingBox.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceRange: editingBox.priceRange,
                    boxType: editingBox.boxType,
                    gramPerBox: editingBox.gramPerBox,
                }),
            });
            setBoxRanges(prev =>
                prev.map(box =>
                    box.id === editingBox.id
                        ? { ...box, priceRange: editingBox.priceRange, boxType: editingBox.boxType, gramPerBox: editingBox.gramPerBox }
                        : box
                )
            );
            setEditDialogOpen(false);
            setEditingBox(null);
            setSuccess('Box range updated successfully!');
            setError('');
            setOpenSnackbar(true);
        } catch (error) {
            setError('Failed to update box range.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    // Open delete confirmation dialog
    const handleDeleteOpen = (id: number) => {
        setDeleteBoxId(id);
        setDeleteDialogOpen(true);
    };

    // Confirm delete
    const handleDeleteConfirm = async () => {
        try {
            await fetch(`${API_BASE_URL}/box-ranges/${deleteBoxId}`, {
                method: 'DELETE',
            });
            setBoxRanges(prev => prev.filter(box => box.id !== deleteBoxId));
            setDeleteDialogOpen(false);
            setDeleteBoxId(null);
            setSuccess('Box range deleted successfully!');
            setError('');
            setOpenSnackbar(true);
        } catch (error) {
            setError('Failed to delete box range.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    const filteredBoxRanges = boxRanges.filter(
        box =>
            box.priceRange.toLowerCase().includes(search.toLowerCase()) ||
            box.boxType.toLowerCase().includes(search.toLowerCase())
    );

    const pageCount = Math.ceil(filteredBoxRanges.length / ROWS_PER_PAGE);
    const paginatedBoxRanges = filteredBoxRanges.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    return (
        <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Inventory2Icon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
                <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
                    Box Range Entry
                </Typography>
            </Box>
            {/* Paper Container */}
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
                {/* Form Fields */}
                <Box
                    component="form"
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 2,
                        alignItems: 'flex-start',
                    }}
                >
                    <TextField
                        label="Price Range"
                        value={priceRange}
                        onChange={e => setPriceRange(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Inventory2Icon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        label="Box Type"
                        value={boxType}
                        onChange={e => setBoxType(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Inventory2Icon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        label="Gram per Box"
                        value={gramPerBox}
                        onChange={e => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value)) { // Allow only numeric values (including decimals)
                                setGramPerBox(value);
                            }
                        }}
                        required
                        type="number"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Inventory2Icon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: 1 }}
                    />
                    <Button
                        type="button"
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
                        }}
                        size="large"
                        onClick={handleAdd}
                    >
                        Add
                    </Button>
                </Box>
            </Paper>
            {/* Search Field */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: -2 }}>
                <TextField
                    label="Search by Price Range or Box Type"
                    variant="outlined"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#245D6B' }} />
                            </InputAdornment>
                        ),
                    }}
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
            </Box>
            {/* Table */}
            <TableContainer
                component={Paper}
                sx={{
                    mt: 4,
                    borderRadius: 2,
                    boxShadow: '0 2px 12px rgba(36,93,107,0.06)',
                }}
            >
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Price Range</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Box Type</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Gram per Box</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedBoxRanges.length > 0 ? (
                            paginatedBoxRanges.map((box, idx) => (
                                <TableRow key={box.id}>
                                    <TableCell sx={{ fontSize: 16 }}>
                                        {(currentPage - 1) * ROWS_PER_PAGE + idx + 1}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 16 }}>{box.priceRange}</TableCell>
                                    <TableCell sx={{ fontSize: 16 }}>{box.boxType}</TableCell>
                                    <TableCell sx={{ fontSize: 16 }}>
                                        {box.gramPerBox ? `${box.gramPerBox} g` : 'N/A'} {/* Add "g" suffix */}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            sx={{ color: '#245D6B' }}
                                            onClick={() => handleEditOpen(box)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteOpen(box.id)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No data found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {/* Pagination */}
            {pageCount > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                        count={pageCount}
                        page={currentPage}
                        onChange={(_, value) => setCurrentPage(value)}
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
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} sx={{ marginLeft: 20 }}>
                <Box sx={{ p: 3, minWidth: 600 }}>
                    <DialogTitle sx={{ p: 0, mb: 2 }}>Edit Box Range</DialogTitle>
                    <DialogContent sx={{ p: 0 }}>
                        <TextField
                            label="Price Range"
                            value={editingBox?.priceRange || ''}
                            onChange={e => setEditingBox({ ...editingBox!, priceRange: e.target.value })}
                            fullWidth
                            margin="dense"
                        />
                        <TextField
                            label="Box Type"
                            value={editingBox?.boxType || ''}
                            onChange={e => setEditingBox({ ...editingBox!, boxType: e.target.value })}
                            fullWidth
                            margin="dense"
                            sx={{ mt: 2 }}
                        />
                        <TextField
                            label="Gram per Box"
                            value={editingBox?.gramPerBox || ''}
                            onChange={e => setEditingBox({ ...editingBox!, gramPerBox: Number(e.target.value) })}
                            fullWidth
                            margin="dense"
                            sx={{ mt: 2 }}
                            type="number"
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 0, mt: 2 }}>
                        <Button onClick={() => setEditDialogOpen(false)} sx={{ color: '#245D6B' }}>Cancel</Button>
                        <Button onClick={handleEditSave} variant="contained" sx={{ background: '#245D6B' }}>Save</Button>
                    </DialogActions>
                </Box>
            </Dialog>
            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this box range?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} variant="contained" color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Snackbar */}
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
        </Box>
    );
};

export default BoxRangeEntry;