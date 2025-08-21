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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const ROWS_PER_PAGE = 5;

const BoxWeightEntry: React.FC = () => {
  const [priceRange, setPriceRange] = useState('');
  const [boxEntries, setBoxEntries] = useState<{ id: number; priceRange: string; totalBoxes: number; boxType: string; eventId?: number }[]>([]);
  const [boxRanges, setBoxRanges] = useState<{ id: number; priceRange: string; boxType: string[] }[]>([]);
  const [availableBoxTypes, setAvailableBoxTypes] = useState<string[]>([]);
  const [boxSearch, setBoxSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<{ id: number; priceRange: string; totalBoxes: number; boxType: string; displayId?: number } | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [totalBoxesByType, setTotalBoxesByType] = useState<{ [key: string]: string }>({});
  
  // Use context instead of local state
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  
  const API_BASE_URL = useApiBaseUrl();

  // Move fetchBoxEntries outside useEffect so it can be reused
  const fetchBoxEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      let url = `${API_BASE_URL}/box-weight-entries`;
      if (selectedAnnkutEvent) {
        url += `?eventId=${selectedAnnkutEvent}`;
      }
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
  if (res.status === 401) {
          localStorage.clear();
          window.location.href = '/login';
          return;
        }
        setBoxEntries([]);
        return;
      }

      const data = await res.json();
      setBoxEntries(selectedAnnkutEvent ? data : []);
  } catch (error) {
      setSnackbar({ open: true, message: 'Failed to fetch box entries.', severity: 'error' });
    }
  };

  useEffect(() => {
    if (selectedAnnkutEvent) {
      fetchBoxEntries();
    } else {
      setBoxEntries([]); // Clear entries when no event selected
    }
  }, [selectedAnnkutEvent]);

  useEffect(() => {
    fetchBoxEntries();
  }, [API_BASE_URL]);

  useEffect(() => {
    const fetchBoxRanges = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }

        let url = `${API_BASE_URL}/box-ranges`;
        if (selectedAnnkutEvent) {
          url += `?eventId=${selectedAnnkutEvent}`;
        }
        const res = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.clear();
            window.location.href = '/login';
            return;
          }
          setBoxRanges([]);
          return;
        }

        const data = await res.json();
        setBoxRanges(selectedAnnkutEvent ? data : []);
  } catch (error) {
        setSnackbar({ open: true, message: 'Failed to fetch box ranges.', severity: 'error' });
      }
    };

    if (selectedAnnkutEvent) {
      fetchBoxRanges();
    } else {
      setBoxRanges([]);
    }
  }, [selectedAnnkutEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAnnkutEvent) {
      setSnackbar({ open: true, message: 'Please select an Annkut event first.', severity: 'error' });
      return;
    }
    
    if (priceRange && Object.keys(totalBoxesByType).length > 0) {
      // Check for duplicate price range for the selected event
      const isDuplicate = boxEntries.some(entry => 
        entry.priceRange === priceRange && 
        entry.eventId?.toString() === String(selectedAnnkutEvent)
      );

      if (isDuplicate) {
        setSnackbar({ open: true, message: 'This box price range already exists for the selected event.', severity: 'error' });
        return;
      }

      try {
        const entries = Object.entries(totalBoxesByType).map(([type, totalBoxes]) => ({
          priceRange,
          boxType: type,
          totalBoxes: Number(totalBoxes),
          eventId: Number(selectedAnnkutEvent),
        }));

        const res = await fetch(`${API_BASE_URL}/box-weight-entries`, {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(entries),
        });

        if (!res.ok) {
          throw new Error('Failed to save entries');
        }

        const updatedEntries = await res.json();

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
        // Remove displayId before sending to backend
        const { displayId, ...entryData } = editEntry;
        
        const res = await fetch(`${API_BASE_URL}/box-weight-entries/${editEntry.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(entryData),
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
      const res = await fetch(`${API_BASE_URL}/box-weight-entries/${id}`, { 
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) {
        setSnackbar({ open: true, message: 'Failed to delete box entry.', severity: 'error' });
        return;
      }
  
      const weightRes = await fetch(`${API_BASE_URL}/weight-calculation-entries/delete-by-box/${id}`, { 
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
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

  const filteredBoxEntries = boxEntries
    .filter(entry => {
      if (!selectedAnnkutEvent) {
        return false;
      }
      
      const matchesSearch = entry.priceRange.toLowerCase().includes(boxSearch.toLowerCase()) ||
        entry.boxType.toLowerCase().includes(boxSearch.toLowerCase());
      
      const matchesEvent = entry.eventId?.toString() === String(selectedAnnkutEvent);
      
      return matchesSearch && matchesEvent;
    })
    .sort((a, b) => a.id - b.id);

  const pageCount = Math.ceil(filteredBoxEntries.length / ROWS_PER_PAGE);
  const currentPage = page > pageCount ? 1 : page;
  
  const paginatedEntries = filteredBoxEntries.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  ).map((entry, index) => ({
    ...entry,
    displayId: (currentPage - 1) * ROWS_PER_PAGE + index + 1,
  }));

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      {/* Title and Event Dropdown */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
          Box Numbers Master
        </Typography>
        {selectedEventDetails && (
          <Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>
            - {selectedEventDetails.eventName} {selectedEventDetails.eventYear}
          </Typography>
        )}
      </Box>
      {/* Form Section */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 2, 
          mx: 'auto', 
          mt: 4,
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
              {boxRanges
                .filter(range => {
                  // Only show ranges that haven't been added for the selected event
                  if (!selectedAnnkutEvent) return true;
                  
                  const isAlreadyAdded = boxEntries.some(entry => 
                    entry.priceRange === range.priceRange && 
                    entry.eventId?.toString() === selectedAnnkutEvent.toString()
                  );
                  
                  return !isAlreadyAdded;
                }).length > 0 ? (
                boxRanges
                  .filter(range => {
                    // Only show ranges that haven't been added for the selected event
                    if (!selectedAnnkutEvent) return true;
                    
                    const isAlreadyAdded = boxEntries.some(entry => 
                      entry.priceRange === range.priceRange && 
                      entry.eventId?.toString() === selectedAnnkutEvent.toString()
                    );
                    
                    return !isAlreadyAdded;
                  })
                  .map(range => (
                    <MenuItem key={range.id} value={range.priceRange}>
                      {range.priceRange}
                    </MenuItem>
                  ))
              ) : (
                <MenuItem disabled value="">
                  No more box ranges available
                </MenuItem>
              )}
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
          <TextField
            placeholder="Search Box Range or Type"
            value={boxSearch}
            onChange={e => setBoxSearch(e.target.value)}
            disabled={!selectedAnnkutEvent}
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
          {selectedAnnkutEvent && filteredBoxEntries.length > 0 && (
            <Button
              variant="outlined"
              sx={{
                color: '#245D6B',
                borderColor: '#245D6B',
                fontWeight: 600,
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
          )}
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
                <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Event</TableCell>
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
              ) : paginatedEntries.length > 0 ? (
                paginatedEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.displayId}</TableCell>
                    <TableCell>{entry.priceRange}</TableCell>
                    <TableCell>{entry.boxType}</TableCell>
                    <TableCell>{entry.totalBoxes}</TableCell>
                    <TableCell>
                      {selectedEventDetails?.eventName || 'N/A'} - {selectedEventDetails?.eventYear || 'N/A'}
                    </TableCell>
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
        {/* Pagination */}
        {selectedAnnkutEvent && filteredBoxEntries.length > ROWS_PER_PAGE && (
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

      {/* Print Dialog */}
      <Dialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
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
          <Box id="box-numbers-print">
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
                Box Numbers Master Report
              </h1>
              <div style={{ color: "#555", fontSize: 16, marginTop: 4 }}>
                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by Kitchen Manager
                {selectedEventDetails && (
                  <span>
                    &nbsp;|&nbsp; Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}
                  </span>
                )}
              </div>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                marginTop: "20px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <th
                    style={{
                      padding: "8px",
                      border: "1px solid #ddd",
                      fontWeight: 600,
                      color: "#245D6B",
                      textAlign: "left",
                    }}
                  >
                    Sr. No.
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      border: "1px solid #ddd",
                      fontWeight: 600,
                      color: "#245D6B",
                      textAlign: "left",
                    }}
                  >
                    Box Price Range
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      border: "1px solid #ddd",
                      fontWeight: 600,
                      color: "#245D6B",
                      textAlign: "left",
                    }}
                  >
                    Box Type
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      border: "1px solid #ddd",
                      fontWeight: 600,
                      color: "#245D6B",
                      textAlign: "left",
                    }}
                  >
                    Total Boxes
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      border: "1px solid #ddd",
                      fontWeight: 600,
                      color: "#245D6B",
                      textAlign: "left",
                    }}
                  >
                    Event
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBoxEntries.map((entry, index) => (
                  <tr
                    key={entry.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        color: "#333",
                      }}
                    >
                      {index + 1}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        color: "#333",
                      }}
                    >
                      {entry.priceRange}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        color: "#333",
                      }}
                    >
                      {entry.boxType}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        color: "#333",
                      }}
                    >
                      {entry.totalBoxes}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        color: "#333",
                      }}
                    >
                      {selectedEventDetails?.eventName || 'N/A'} - {selectedEventDetails?.eventYear || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredBoxEntries.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#999",
                  fontStyle: "italic",
                  padding: "40px",
                  fontSize: "16px",
                }}
              >
                No box entries data available for printing.
              </div>
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

export default BoxWeightEntry;
