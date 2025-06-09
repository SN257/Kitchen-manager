import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
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
  Snackbar,
  Alert,
} from '@mui/material';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import CategoryIcon from '@mui/icons-material/Category';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useApiBaseUrl } from '../config/config';

const categories = ['મીઠાઈ', 'ભીનું ફરસાણ', 'સૂકું ફરસાણ', 'નાસ્તો', 'અન્ય વાનગીઓ'];
const ROWS_PER_PAGE = 5;
const AddFoodItem: React.FC = () => {
  const [vangiName, setVangiName] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<{ id: number; vangiName: string; category: string }[]>([]);
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; vangiName: string; category: string } | null>(null);
  const [editVangiName, setEditVangiName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [foodItemSearch, setFoodItemSearch] = useState('');
  const API_BASE_URL = useApiBaseUrl();

  // Fetch items from server on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/food-items`)
      .then(res => res.json())
      .then(data => setItems(data));
  }, []);

  useEffect(() => {
    const pageCount = Math.ceil(items.length / ROWS_PER_PAGE);
    if (page > pageCount && pageCount > 0) {
      setPage(1);
    }
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vangiName && category) {
      try {
        const res = await fetch(`${API_BASE_URL}/food-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vangiName, category }),
        });
        if (!res.ok) {
          setSnackbar({ open: true, message: 'Failed to add food item.', severity: 'error' });
          return;
        }
        const newItem = await res.json();
        setItems(prev => [...prev, newItem]);
        setVangiName('');
        setCategory('');
        setPage(1);
        setSnackbar({ open: true, message: 'Food item added successfully!', severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/food-items/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setSnackbar({ open: true, message: 'Failed to delete food item.', severity: 'error' });
        return;
      }
      setItems(prev => prev.filter(item => item.id !== id));
      setSnackbar({ open: true, message: 'Food item deleted successfully!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
    }
  };

  const handleEditOpen = (item: { id: number; vangiName: string; category: string }) => {
    setEditItem(item);
    setEditVangiName(item.vangiName);
    setEditCategory(item.category);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (editItem) {
      try {
        const res = await fetch(`${API_BASE_URL}/food-items/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vangiName: editVangiName, category: editCategory }),
        });
        if (!res.ok) {
          setSnackbar({ open: true, message: 'Failed to update food item.', severity: 'error' });
          return;
        }
        const updated = await res.json();
        setItems(prev =>
          prev.map(item => (item.id === editItem.id ? updated : item))
        );
        setEditOpen(false);
        setEditItem(null);
        setSnackbar({ open: true, message: 'Food item updated successfully!', severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
      }
    }
  };

  // Pagination logic
  const pageCount = Math.ceil(items.length / ROWS_PER_PAGE);
  const currentPage = page > pageCount ? 1 : page;
  const filteredFoodItems = items.filter(item =>
    item.vangiName.toLowerCase().includes(foodItemSearch.toLowerCase())
  );
  const paginatedItems = filteredFoodItems.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );
  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FastfoodIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
          Add Food Item
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
            label="Vangi Name"
            value={vangiName}
            onChange={e => setVangiName(e.target.value)}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FastfoodIcon sx={{ color: '#245D6B' }} />
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CategoryIcon sx={{ color: '#245D6B' }} />
                </InputAdornment>
              ),
            }}
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
          label="Search by Food Item Name"
          variant="outlined"
          size="small"
          value={foodItemSearch}
          onChange={e => setFoodItemSearch(e.target.value)}
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
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Vanagi Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Category</TableCell>
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
                  <TableCell sx={{ fontSize: 16 }}>{item.vangiName}</TableCell>
                  <TableCell sx={{ fontSize: 16 }}>{item.category}</TableCell>
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
            count={Math.ceil(filteredFoodItems.length / ROWS_PER_PAGE)}
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
          <DialogTitle sx={{ p: 0, mb: 2 }}>Edit Food Item</DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <TextField
              label="Vangi Name"
              value={editVangiName}
              onChange={e => setEditVangiName(e.target.value)}
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
            <Typography>Are you sure you want to delete this food item?</Typography>
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

export default AddFoodItem;