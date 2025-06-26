import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Pagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    MenuItem,
} from '@mui/material';
import KitchenIcon from '@mui/icons-material/Kitchen';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApiBaseUrl } from '../config/config';


const ROWS_PER_PAGE = 5;

const gujaratiToEnglishDigits = (input: string) =>
    input.replace(/[૦૧૨૩૪૫૬૭૮૯]/g, d =>
        '૦૧૨૩૪૫૬૭૮૯'.indexOf(d).toString()
    );
const categories = ['અનાજ-કઠોળ', 'સૂકા મસાલા', 'લીલા શાકભાજી ', 'ફ્રુટ', 'સૂકો મેવો'];
const AddIngredient: React.FC = () => {
    const [ingredientName, setIngredientName] = useState('');
    const [pricePerKg, setPricePerKg] = useState('');
    const [items, setItems] = useState<{ id: number; ingredientName: string; pricePerKg: number; category: string }[]>([]);
    const [page, setPage] = useState(1);
    const [editOpen, setEditOpen] = useState(false);
    const [editItem, setEditItem] = useState<{ id: number; ingredientName: string; pricePerKg: number; category: string } | null>(null);
    const [editIngredientName, setEditIngredientName] = useState('');
    const [editPricePerKg, setEditPricePerKg] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [category, setCategory] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const API_BASE_URL = useApiBaseUrl();

    const fetchIngredients = () => {
        fetch(`${API_BASE_URL}/ingredient`)
            .then(res => res.json())
            .then(data => setItems(data));
    };
    useEffect(() => {
        fetchIngredients();
    }, []);

    useEffect(() => {
        const pageCount = Math.ceil(items.length / ROWS_PER_PAGE);
        if (page > pageCount && pageCount > 0) {
            setPage(1);
        }
    }, [items]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/ingredient`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ingredientName,
                    pricePerKg: Number(gujaratiToEnglishDigits(pricePerKg)),
                    category

                }),
            });
            if (!res.ok) {
                setSnackbar({ open: true, message: 'Failed to add ingredient.', severity: 'error' });
                return;
            }
            setIngredientName('');
            setPricePerKg('');
            fetchIngredients();
            setSnackbar({ open: true, message: 'Ingredient added successfully!', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/ingredient/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                setSnackbar({ open: true, message: 'Failed to delete ingredient.', severity: 'error' });
                return;
            }
            fetchIngredients();
            setSnackbar({ open: true, message: 'Ingredient deleted successfully!', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
        }
    };

    const handleEditOpen = (item: { id: number; ingredientName: string; pricePerKg: number; category: string }) => {
        setEditItem(item);
        setEditIngredientName(item.ingredientName);
        setEditPricePerKg(item.pricePerKg.toString());
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editItem) return;
        try {
            const res = await fetch(`${API_BASE_URL}/ingredient/${editItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ingredientName: editIngredientName,
                    pricePerKg: Number(gujaratiToEnglishDigits(editPricePerKg)),
                    category: editCategory, // add this

                }),
            });
            if (!res.ok) {
                setSnackbar({ open: true, message: 'Failed to update ingredient.', severity: 'error' });
                return;
            }
            setEditOpen(false);
            setEditItem(null);
            fetchIngredients();
            setSnackbar({ open: true, message: 'Ingredient updated successfully!', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
        }
    };

    // Pagination logic
    const filteredItems = items.filter(item =>
        item.ingredientName.toLowerCase().includes(ingredientSearch.toLowerCase())
    );
    const pageCount = Math.ceil(filteredItems.length / ROWS_PER_PAGE);
    const currentPage = page > pageCount ? 1 : page;
    const paginatedItems = filteredItems.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    return (
        <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <KitchenIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
                <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
                    Add Ingredient
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
                    sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'flex-start' }}
                >
                    <TextField
                        label="Ingredient Name"
                        value={ingredientName}
                        onChange={e => setIngredientName(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <KitchenIcon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        label="1 Kg Price"
                        type="text"
                        inputMode="decimal"
                        value={pricePerKg}
                        onChange={(e) => {
                            let value = gujaratiToEnglishDigits(e.target.value);
                            if (/^\d*\.?\d*$/.test(value)) {
                                setPricePerKg(value);
                            }
                        }}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    ₹
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        select
                        label="Category"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        required
                        sx={{ flex: 1 }}
                    >
                        {categories.map(option => (
                            <MenuItem key={option} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </TextField>
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
                        }}
                        size="large"
                    >
                        Add
                    </Button>
                </Box>
            </Paper>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: -2 }}>
                <TextField
                    label="Search by Ingredient Name"
                    variant="outlined"
                    size="small"
                    value={ingredientSearch}
                    onChange={e => setIngredientSearch(e.target.value)}
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
            {/* Table grid for added items with pagination */}
            
                    <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Ingredient Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>1 Kg Price (₹)</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedItems.length > 0 ? (
                                    paginatedItems.map((item, idx) => (
                                        <TableRow key={item.id}>
                                            <TableCell sx={{ fontSize: 16 }}>
                                                {(currentPage - 1) * ROWS_PER_PAGE + idx + 1}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 16 }}>{item.ingredientName}</TableCell>
                                            <TableCell sx={{ fontSize: 16 }}>{item.category}</TableCell>
                                            <TableCell sx={{ fontSize: 16 }}>₹ {item.pricePerKg}</TableCell>
                                            <TableCell>
                                                <IconButton size="small" sx={{ color: '#245D6B' }} onClick={() => handleEditOpen(item)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => {
                                                        setDeleteId(item.id);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                      <TableCell colSpan={5} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
                                        No raw data
                                      </TableCell>
                                    </TableRow>
                                  )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {pageCount > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Pagination
                                count={pageCount}
                                page={currentPage}
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
                
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} sx={{ marginLeft: 20 }}>
                <Box sx={{ p: 3, minWidth: 600 }}>
                    <DialogTitle sx={{ p: 0, mb: 2 }}>Edit Ingredient</DialogTitle>
                    <DialogContent sx={{ p: 0 }}>
                        <TextField
                            label="Ingredient Name"
                            value={editIngredientName}
                            onChange={e => setEditIngredientName(e.target.value)}
                            fullWidth
                            margin="dense"
                        />
                        <TextField
                            select
                            label="Category"
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value)}
                            fullWidth
                            margin="dense"
                            sx={{ mt: 2 }}
                        >
                            {categories.map(option => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="1 Kg Price"
                            type="text"
                            inputMode="decimal"
                            value={editPricePerKg}
                            onChange={e => {
                                let value = gujaratiToEnglishDigits(e.target.value);
                                if (/^\d*\.?\d*$/.test(value)) {
                                    setEditPricePerKg(value);
                                }
                            }}
                            fullWidth
                            margin="dense"
                            sx={{ mt: 2 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        ₹
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 0, mt: 2 }}>
                        <Button onClick={() => setEditOpen(false)} sx={{ color: '#245D6B' }}>Cancel</Button>
                        <Button onClick={handleEditSave} variant="contained" sx={{ background: '#245D6B' }}>Save</Button>
                    </DialogActions>
                </Box>
            </Dialog>
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} sx={{ marginLeft: 20 }}>
                <Box sx={{ p: 3, minWidth: 600 }}>
                    <DialogTitle sx={{ p: 0, mb: 2 }}>Confirm Delete</DialogTitle>
                    <DialogContent sx={{ p: 0 }}>
                        <Typography>Are you sure you want to delete this ingredient?</Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 0, mt: 2 }}>
                        <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#245D6B' }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                if (deleteId !== null) {
                                    await handleDelete(deleteId);
                                }
                                setDeleteDialogOpen(false);
                                setDeleteId(null);
                            }}
                            color="error"
                            variant="contained"
                            sx={{ background: '#B71C1C' }}
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    variant="standard"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AddIngredient;