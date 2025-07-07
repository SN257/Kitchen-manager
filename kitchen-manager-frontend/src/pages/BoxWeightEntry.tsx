import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Pagination,
  MenuItem,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApiBaseUrl } from '../config/config';

const ROWS_PER_PAGE = 5;

const BoxWeightEntry: React.FC = () => {
  const [priceRange, setPriceRange] = useState('');
  const [boxEntries, setBoxEntries] = useState<{ id: number; priceRange: string; totalBoxes: number; boxType: string }[]>([]);
  const [boxRanges, setBoxRanges] = useState<{ id: number; priceRange: string; boxType: string[] }[]>([]);
  const [availableBoxTypes, setAvailableBoxTypes] = useState<string[]>([]);
  const [boxSearch, setBoxSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<{ id: number; priceRange: string; totalBoxes: number; boxType: string } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [totalBoxesByType, setTotalBoxesByType] = useState<{ [key: string]: string }>({});
  const API_BASE_URL = useApiBaseUrl();

  useEffect(() => {
    // Fetch box entries from the backend
    const fetchBoxEntries = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/box-weight-entries`);
        const data = await res.json();
        setBoxEntries(data);
      } catch {
        setSnackbar({ open: true, message: 'Failed to fetch box entries.', severity: 'error' });
      }
    };

    fetchBoxEntries();
  }, [API_BASE_URL]);

  useEffect(() => {
    // Fetch box ranges from the backend
    const fetchBoxRanges = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/box-ranges`);
        const data = await res.json();
        setBoxRanges(data); // Example: [{ id: 1, priceRange: "50 - 99", boxType: ["TT 33"], gramPerBox: 75 }, ...]
      } catch {
        setSnackbar({ open: true, message: 'Failed to fetch box ranges.', severity: 'error' });
      }
    };

    fetchBoxRanges();
  }, [API_BASE_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (priceRange && Object.keys(totalBoxesByType).length > 0) {
      try {
        const entries = Object.entries(totalBoxesByType).map(([type, totalBoxes]) => ({
          priceRange,
          boxType: type,
          totalBoxes: Number(totalBoxes),
        }));

        const res = await fetch(`${API_BASE_URL}/box-weight-entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entries), // Send multiple entries
        });

        if (!res.ok) {
          throw new Error('Failed to save entries');
        }

        const updatedEntries = await res.json();

        // Merge updated entries with existing ones
        setBoxEntries(prev => {
          const updatedIds = updatedEntries.map((entry: { id: number }) => entry.id);
          const filteredPrevEntries = prev.filter(entry => !updatedIds.includes(entry.id));
          return [...filteredPrevEntries, ...updatedEntries];
        });

        setPriceRange('');
        setAvailableBoxTypes([]);
        setTotalBoxesByType({});
        setSnackbar({ open: true, message: 'Entries added successfully!', severity: 'success' });
      } catch (error) {
        console.error('Error adding entries:', error);
        setSnackbar({ open: true, message: 'Failed to add entries.', severity: 'error' });
      }
    } else {
      setSnackbar({ open: true, message: 'Please fill out all fields.', severity: 'error' });
    }
  };

  const handleEditOpen = (entry: { id: number; priceRange: string; totalBoxes: number; boxType: string }) => {
    setEditEntry(entry);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (editEntry) {
      try {
        const res = await fetch(`${API_BASE_URL}/box-weight-entries/${editEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editEntry),
        });
        if (!res.ok) {
          setSnackbar({ open: true, message: 'Failed to update box entry.', severity: 'error' });
          return;
        }
        const updated = await res.json();
        setBoxEntries(prev =>
          prev.map(entry => (entry.id === editEntry.id ? updated : entry))
        );
        setEditOpen(false);
        setEditEntry(null);
        setSnackbar({ open: true, message: 'Box entry updated successfully!', severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/box-weight-entries/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setSnackbar({ open: true, message: 'Failed to delete box entry.', severity: 'error' });
        return;
      }
  
      const weightRes = await fetch(`${API_BASE_URL}/weight-calculation-entries/delete-by-box/${id}`, { method: 'DELETE' });
      if (!weightRes.ok) {
        setSnackbar({ open: true, message: 'Failed to delete associated weight calculation entries.', severity: 'error' });
        return;
      }
  
      setBoxEntries(prev => prev.filter(entry => entry.id !== id));
      setSnackbar({ open: true, message: 'Box entry and associated weight calculation entries deleted successfully!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete box entry.', severity: 'error' });
    }
  };

  const pageCount = Math.ceil(boxEntries.length / ROWS_PER_PAGE);
  const currentPage = page > pageCount ? 1 : page;
  const filteredBoxEntries = boxEntries
    .filter(entry => entry.priceRange.toLowerCase().includes(boxSearch.toLowerCase()))
    .sort((a, b) => a.id - b.id); // Sort by id in ascending order
  const paginatedEntries = filteredBoxEntries.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  ).map((entry, index) => ({
    ...entry,
    displayId: (currentPage - 1) * ROWS_PER_PAGE + index + 1, // Generate sequential ID
  }));

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      {/* Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Inventory2Icon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
          Box Weight Entry
        </Typography>
      </Box>
      {/* Form Section */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mx: 'auto', mt: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, width: '100%' }}>
            {/* Price Range Dropdown */}
            <TextField
              select
              label="Box Price Range"
              value={priceRange}
              onChange={(e) => {
                setPriceRange(e.target.value);
                const selectedRange = boxRanges.find(range => range.priceRange === e.target.value);
                setAvailableBoxTypes(selectedRange?.boxType || []); // Dynamically update box types
                setTotalBoxesByType({}); // Reset total boxes for new selection
              }}
              required
              sx={{ flex: 1 }}
            >
              {boxRanges.map(range => (
                <MenuItem key={range.id} value={range.priceRange}>
                  {range.priceRange}
                </MenuItem>
              ))}
            </TextField>

            {/* Total Boxes Fields */}
            {availableBoxTypes.map(type => (
              <TextField
                key={type}
                label={`Total Boxes (${type})`}
                value={totalBoxesByType[type] || ''}
                onChange={(e) =>
                  setTotalBoxesByType(prev => ({ ...prev, [type]: e.target.value }))
                }
                required
                type="number"
                sx={{ flex: 1 }}
              />
            ))}

            {/* Submit Button */}
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
            >
              Add
            </Button>
          </Box>
        </form>
      </Paper>
      {/* Table Section */}
      <Box sx={{ mt: 4 }}>
        {/* Search Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <TextField
            placeholder="Search Box Range"
            value={boxSearch}
            onChange={e => setBoxSearch(e.target.value)}
            size="small"
            variant="outlined"
            sx={{
              width: 300,
              background: '#ffffff',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': {
                  borderColor: '#245D6B',
                },
                '&:hover fieldset': {
                  borderColor: '#4A7D91',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#4A7D91',
                },
              },
            }}
          />
        </Box>
        {/* Table Section */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Id</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Box Price Range</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Box Type</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Total Boxes</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEntries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.displayId}</TableCell> {/* Use sequential ID */}
                  <TableCell>{entry.priceRange}</TableCell>
                  <TableCell>{entry.boxType}</TableCell>
                  <TableCell>{entry.totalBoxes}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      sx={{ color: '#245D6B' }}
                      onClick={() => handleEditOpen(entry)}
                      aria-label="edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(entry.id)}
                      aria-label="delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {/* Pagination */}
        {filteredBoxEntries.length > ROWS_PER_PAGE && (
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
      </Box>
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Box Entry</DialogTitle>
        <DialogContent>
          <TextField
            label="Box Price Range"
            value={editEntry?.priceRange || ''}
            onChange={e => setEditEntry(prev => (prev ? { ...prev, priceRange: e.target.value } : prev))}
            fullWidth
          />
          <TextField
            label="Total Boxes"
            value={editEntry?.totalBoxes || ''}
            onChange={e => setEditEntry(prev => (prev ? { ...prev, totalBoxes: Number(e.target.value) } : prev))}
            fullWidth
            type="number"
          />
          <TextField
            label="Box Type"
            value={editEntry?.boxType || ''}
            onChange={e => setEditEntry(prev => (prev ? { ...prev, boxType: e.target.value } : prev))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BoxWeightEntry;