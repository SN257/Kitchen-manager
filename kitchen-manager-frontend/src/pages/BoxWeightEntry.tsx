import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
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
  ListItem,
  ListItemText,
  List,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApiBaseUrl } from '../config/config'; // Adjust the import based on your project structure

const ROWS_PER_PAGE = 5;

const BoxWeightEntry: React.FC = () => {
  const [priceRange, setPriceRange] = useState('');
  const [gram, setGram] = useState('');
  const [totalBoxes, setTotalBoxes] = useState('');
  const [entries, setEntries] = useState<{ id: number; priceRange: string; gram: string; totalBoxes: string }[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<{ id: number; priceRange: string; gram: string; totalBoxes: string } | null>(null);
  const [editPriceRange, setEditPriceRange] = useState('');
  const [editGram, setEditGram] = useState('');
  const [editTotalBoxes, setEditTotalBoxes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [boxRanges, setBoxRanges] = useState<{ id: number; priceRange: string; boxType: string }[]>([]);
  const [selectedBoxTypes, setSelectedBoxTypes] = useState<{ [key: string]: { checked: boolean; totalBoxes: string }  }>({});
  const [popupOpen, setPopupOpen] = useState(false);
  const [editingBoxTypeId, setEditingBoxTypeId] = useState<string | null>(null);
  const API_BASE_URL = useApiBaseUrl(); // Adjust the base URL as needed

  // Fetch box ranges from the backend
  useEffect(() => {
    const fetchBoxRanges = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/box-ranges`);
        const data = await response.json();
        setBoxRanges(data); // Populate boxRanges state
      } catch (error) {
        console.error('Failed to fetch box ranges:', error);
      }
    };

    fetchBoxRanges();
  }, [API_BASE_URL]);

  // Fetch entries from backend
  const fetchEntries = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/box-weight-entries`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Add entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (priceRange && gram && totalBoxes) {
      try {
        await fetch(`${API_BASE_URL}/box-weight-entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceRange, gram, totalBoxes }),
        });
        setPriceRange('');
        setGram('');
        setTotalBoxes('');
        setPage(1);
        setSnackbar({ open: true, message: 'Entry added successfully!', severity: 'success' });
        fetchEntries();
      } catch {
        setSnackbar({ open: true, message: 'Failed to add entry!', severity: 'error' });
      }
    }
  };

  // Edit entry
  const handleEditOpen = (entry: { id: number; priceRange: string; gram: string; totalBoxes: string }) => {
    setEditEntry(entry);
    setEditPriceRange(entry.priceRange);
    setEditGram(entry.gram);
    setEditTotalBoxes(entry.totalBoxes);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (editEntry) {
      try {
        await fetch(`${API_BASE_URL}/box-weight-entries/${editEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceRange: editPriceRange,
            gram: editGram,
            totalBoxes: editTotalBoxes,
          }),
        });
        setEditOpen(false);
        setEditEntry(null);
        setSnackbar({ open: true, message: 'Entry updated successfully!', severity: 'success' });
        fetchEntries();
      } catch {
        setSnackbar({ open: true, message: 'Failed to update entry!', severity: 'error' });
      }
    }
  };

  // Delete entry
  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/box-weight-entries/${id}`, { method: 'DELETE' });
      setSnackbar({ open: true, message: 'Entry deleted successfully!', severity: 'success' });
      fetchEntries();
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete entry!', severity: 'error' });
    }
  };

  // Pagination and search
  const filteredEntries = entries.filter(
    item =>
      item.priceRange.toLowerCase().includes(search.toLowerCase()) ||
      item.gram.toLowerCase().includes(search.toLowerCase()) ||
      item.totalBoxes.toLowerCase().includes(search.toLowerCase())
  );
  const pageCount = Math.ceil(filteredEntries.length / ROWS_PER_PAGE);
  const currentPage = page > pageCount ? 1 : page;
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const handlePriceRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedRange = boxRanges.find(range => range.priceRange === e.target.value);
    if (selectedRange) {
      setSelectedBoxTypes({}); // Reset selected box types
      setPopupOpen(false); // Close the dialog briefly to reset its state
      setTimeout(() => {
        setPriceRange(selectedRange.priceRange); // Update the selected price range
        setPopupOpen(true); // Force the dialog to open again
      }, 0);
    }
  };

  const handlePopupClose = () => {
    document.getElementById('root')?.setAttribute('aria-hidden', 'true'); // Restore aria-hidden
    setPopupOpen(false);
  };

  const handleBoxTypeCheck = (id: string) => {
    setSelectedBoxTypes(prev => ({
      ...prev,
      [id]: {
        checked: !prev[id]?.checked,
        totalBoxes: prev[id]?.totalBoxes || '', // Preserve existing totalBoxes or initialize it
      },
    }));
  };

  const handlePopupSubmit = () => {
    setPopupOpen(false);
    console.log('Selected Box Types:', selectedBoxTypes);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      {/* Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Inventory2Icon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
          Box Weight Entry
        </Typography>
      </Box>
      {/* Form */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mx: 'auto', maxWidth: 1200, mt: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              select
              label="Price Range"
              value={boxRanges.some(range => range.priceRange === priceRange) ? priceRange : ''}
              onChange={handlePriceRangeChange}
              sx={{ flex: 2 }}
              InputProps={{
                startAdornment: <Inventory2Icon sx={{ color: '#245D6B', mr: 1 }} />,
              }}
            >
              {boxRanges.map(range => (
                <MenuItem key={range.id} value={range.priceRange}>
                  {range.priceRange}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Gram"
              value={gram}
              onChange={(e) => setGram(e.target.value)}
              required
              type="number"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Total Boxes"
              value={totalBoxes}
              onChange={(e) => setTotalBoxes(e.target.value)}
              required
              type="number"
              sx={{ flex: 1 }}
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
              }}
              size="large"
            >
              Add
            </Button>
          </Box>
        </form>

        {/* Selected Box Types */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ color: '#245D6B', fontWeight: 700, mb: 2 }}>
            Selected Box Types
          </Typography>
          <List>
            {Object.entries(selectedBoxTypes)
              .filter(([_, value]) => value.checked)
              .map(([id, value]) => (
                <ListItem
                  key={id}
                  secondaryAction={
                    <>
                      <IconButton
                        size="small"
                        sx={{ color: '#245D6B' }}
                        aria-label="edit"
                        onClick={() => setEditingBoxTypeId(id)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="delete"
                        onClick={() => {
                          setSelectedBoxTypes(prev => {
                            const updated = { ...prev };
                            delete updated[id];
                            return updated;
                          });
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={`Box Type: ${boxRanges.find(range => range.id.toString() === id)?.boxType || ''}`}
                    secondary={`Total Boxes: ${value.totalBoxes}`}
                  />
                </ListItem>
              ))}
          </List>
        </Box>

        {/* Edit Box Type Dialog */}
        <Dialog
          open={!!editingBoxTypeId}
          onClose={() => setEditingBoxTypeId(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Box Type</DialogTitle>
          <DialogContent>
            <TextField
              label="Total Boxes"
              type="number"
              value={editingBoxTypeId ? selectedBoxTypes[editingBoxTypeId]?.totalBoxes || '' : ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedBoxTypes(prev => ({
                  ...prev,
                  [editingBoxTypeId!]: {
                    ...prev[editingBoxTypeId!],
                    totalBoxes: value,
                  },
                }));
              }}
              fullWidth
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingBoxTypeId(null)} sx={{ color: '#245D6B' }}>
              Cancel
            </Button>
            <Button
              onClick={() => setEditingBoxTypeId(null)}
              variant="contained"
              sx={{ background: '#245D6B' }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
      {/* Search bar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: -2 }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
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
      <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Box Price Range</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Gram</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Total Boxes</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedEntries.length > 0 ? (
              paginatedEntries.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell>{(currentPage - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
                  <TableCell>{item.priceRange}</TableCell>
                  <TableCell>{item.gram}</TableCell>
                  <TableCell>{item.totalBoxes}</TableCell>
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
                  No data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Pagination */}
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
      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <Box sx={{ p: 3, minWidth: 400 }}>
          <DialogTitle sx={{ p: 0, mb: 2 }}>Edit Entry</DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <TextField
              select
              label="Box Price Range"
              value={editPriceRange}
              onChange={e => setEditPriceRange(e.target.value)}
              fullWidth
              margin="dense"
            >
              {boxRanges.map(range => (
                <MenuItem key={range.id} value={range.priceRange}>{range.priceRange}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Gram"
              type="number"
              value={editGram}
              onChange={e => setEditGram(e.target.value)}
              fullWidth
              margin="dense"
              sx={{ mt: 2 }}
            />
            <TextField
              label="Total Number of Boxes"
              type="number"
              value={editTotalBoxes}
              onChange={e => setEditTotalBoxes(e.target.value)}
              fullWidth
              margin="dense"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 0, mt: 2 }}>
            <Button onClick={() => setEditOpen(false)} sx={{ color: '#245D6B' }}>Cancel</Button>
            <Button onClick={handleEditSave} variant="contained" sx={{ background: '#245D6B' }}>Save</Button>
          </DialogActions>
        </Box>
      </Dialog>
      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <Box sx={{ p: 3, minWidth: 400 }}>
          <DialogTitle sx={{ p: 0, mb: 2 }}>Confirm Delete</DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Typography>Are you sure you want to delete this entry?</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 0, mt: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#245D6B' }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteId !== null) {
                  handleDelete(deleteId);
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
      {/* Popup for Box Types */}
      <Dialog
        open={popupOpen}
        onClose={handlePopupClose}
        maxWidth="lg"
        sx={{ ml: 25, mt: 7 }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 2,
            backgroundColor: '#245D6B',
            color: '#fff',
          }}
        >
          <Typography variant="h6" component="span">
            {`Select Box Types for ${priceRange}`}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              mt: 2,
              gap: 2,
              alignItems: 'flex-start',
              width: '100%',
              minWidth: 800,
              minHeight: 300,
              maxHeight: 6 * 52,
              overflowY: 'scroll',
              '&::-webkit-scrollbar': {
                width: '8px',
                visibility: 'visible',
                cursor: 'pointer',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(36, 93, 107, 0.5)',
                borderRadius: '4px',
                cursor: 'pointer',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            {(() => {
              const columns = 3;
              const itemsPerColumn = Math.ceil(boxRanges.length / columns);
              const boxTypeChunks = Array.from({ length: columns }, (_, i) =>
                boxRanges.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn)
              );

              return boxTypeChunks.map((chunk, columnIndex) => (
                <Box
                  key={columnIndex}
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    borderRight: columnIndex < boxTypeChunks.length - 1 ? '1px solid #ccc' : 'none',
                    pr: 2,
                  }}
                >
                  {chunk.map((type) => (
                    <React.Fragment key={type.id}>
                      <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                          type="checkbox"
                          checked={!!selectedBoxTypes[type.id]}
                          onChange={() => handleBoxTypeCheck(type.id.toString())}
                          style={{
                            accentColor: '#245D6B',
                          }}
                        />
                        <ListItemText primary={type.boxType} sx={{ flex: 1 }} />
                        <TextField
                          label="Total Boxes"
                          type="number"
                          size="small"
                          value={selectedBoxTypes[type.id]?.totalBoxes || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSelectedBoxTypes(prev => ({
                              ...prev,
                              [type.id]: {
                                ...prev[type.id],
                                totalBoxes: value,
                              },
                            }));
                          }}
                          disabled={!selectedBoxTypes[type.id]?.checked}
                          sx={{ width: 100 }}
                          InputLabelProps={{
                            sx: {
                              fontSize: '15px', // Decrease font size of the label
                            },
                          }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </Box>
              ));
            })()}
          </Box>
        </DialogContent>

        <DialogActions sx={{ mb: 1, ml: 2, mr: 2, mt: 0 }}>
          <Button onClick={handlePopupClose} sx={{ color: '#245D6B' }}>Cancel</Button>
          <Button
            onClick={handlePopupSubmit}
            variant="contained"
            sx={{ background: '#245D6B' }}
          >
            Save Box Types
          </Button>
        </DialogActions>
      </Dialog>
      {/* Selected Box Types */}
      <List>
        {Object.entries(selectedBoxTypes)
          .filter(([_, value]) => value.checked)
          .map(([id, value]) => (
            <ListItem
              key={id}
              secondaryAction={
                <>
                  <IconButton
                    size="small"
                    sx={{ color: '#245D6B' }}
                    aria-label="edit"
                    onClick={() => setEditingBoxTypeId(id)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="delete"
                    onClick={() => {
                      setSelectedBoxTypes(prev => {
                        const updated = { ...prev };
                        delete updated[id];
                        return updated;
                      });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={`Box Type: ${boxRanges.find(range => range.id.toString() === id)?.boxType || ''}`}
                secondary={`Total Boxes: ${value.totalBoxes}`}
              />
            </ListItem>
          ))}
      </List>
      {/* Edit Box Type Dialog */}
      <Dialog
        open={!!editingBoxTypeId}
        onClose={() => setEditingBoxTypeId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Box Type</DialogTitle>
        <DialogContent>
          <TextField
            label="Total Boxes"
            type="number"
            value={editingBoxTypeId ? selectedBoxTypes[editingBoxTypeId]?.totalBoxes || '' : ''}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedBoxTypes(prev => ({
                ...prev,
                [editingBoxTypeId!]: {
                  ...prev[editingBoxTypeId!],
                  totalBoxes: value,
                },
              }));
            }}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingBoxTypeId(null)} sx={{ color: '#245D6B' }}>
            Cancel
          </Button>
          <Button
            onClick={() => setEditingBoxTypeId(null)}
            variant="contained"
            sx={{ background: '#245D6B' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
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
          variant="standard"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BoxWeightEntry;