import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, TextField, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Pagination } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import CategoryIcon from '@mui/icons-material/Category';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ScaleIcon from '@mui/icons-material/Scale';
import NumbersIcon from '@mui/icons-material/Numbers';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const ROWS_PER_PAGE = 5;

const VasanMaster: React.FC = () => {
  const API_BASE_URL = useApiBaseUrl();
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const [vasanName, setVasanName] = useState('');
  const [foodName, setFoodName] = useState('');
  const [foodItems, setFoodItems] = useState<{ id: number; vangiName: string }[]>([]);
  const [totalWeight, setTotalWeight] = useState('');
  const [totalVasan, setTotalVasan] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/user/me`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) setCurrentUser(await res.json());
      } catch {}
    };
    fetchCurrentUser();
  }, [API_BASE_URL]);

  // Fetch food items from Food Master
  useEffect(() => {
    const fetchFoodItems = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/food-item`, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
            // Expecting array with vangiName
          setFoodItems(Array.isArray(data) ? data.map((d: any) => ({ id: d.id, vangiName: d.vangiName })) : []);
        }
      } catch {}
    };
    fetchFoodItems();
  }, [API_BASE_URL]);

  const fetchEntries = async () => {
    if (!selectedAnnkutEvent) { setEntries([]); return; }
    try {
      const url = `${API_BASE_URL}/vasans?eventId=${selectedAnnkutEvent}`;
      const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setEntries(await res.json());
      else if (res.status === 401) { localStorage.clear(); window.location.href = '/login'; }
    } catch {}
  };

  useEffect(() => { fetchEntries(); }, [selectedAnnkutEvent]);

  const clearForm = () => { setVasanName(''); setFoodName(''); setTotalWeight(''); setTotalVasan(''); };

  const handleAdd = async () => {
    if (!currentUser) { setError('Not authenticated'); setSuccess(''); setOpenSnackbar(true); return; }
    if (!selectedAnnkutEvent) { setError('Select event first'); setSuccess(''); setOpenSnackbar(true); return; }
    if (!vasanName || !foodName || !totalWeight || !totalVasan) { setError('Fill all fields'); setSuccess(''); setOpenSnackbar(true); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/vasans`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ vasanName, foodName, totalWeight: Number(totalWeight), totalVasan: Number(totalVasan), eventId: selectedAnnkutEvent }) });
      if (!res.ok) throw new Error();
      setSuccess('Vasan entry added'); setError(''); setOpenSnackbar(true); clearForm(); fetchEntries();
    } catch { setError('Add failed'); setSuccess(''); setOpenSnackbar(true); }
  };

  const handleEditOpen = (entry: any) => { setEditingEntry({ ...entry }); setEditDialogOpen(true); };
  const handleEditSave = async () => {
    if (!editingEntry) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vasans/${editingEntry.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ vasanName: editingEntry.vasanName, foodName: editingEntry.foodName, totalWeight: Number(editingEntry.totalWeight), totalVasan: Number(editingEntry.totalVasan), eventId: editingEntry.eventId }) });
      if (!res.ok) throw new Error();
      setSuccess('Updated successfully'); setError(''); setOpenSnackbar(true); setEditDialogOpen(false); setEditingEntry(null); fetchEntries();
    } catch { setError('Update failed'); setSuccess(''); setOpenSnackbar(true); }
  };

  const handleDeleteOpen = (id: number) => { setDeleteId(id); setDeleteDialogOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vasans/${deleteId}`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error();
      setSuccess('Deleted'); setError(''); setOpenSnackbar(true); setDeleteDialogOpen(false); setDeleteId(null); fetchEntries();
    } catch { setError('Delete failed'); setSuccess(''); setOpenSnackbar(true); }
  };

  const filtered = entries.filter(e => e.vasanName.toLowerCase().includes(search.toLowerCase()) || e.foodName.toLowerCase().includes(search.toLowerCase()));
  const pageCount = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>Vasan Master</Typography>
        {selectedEventDetails && <Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
      </Box>
      <Paper elevation={4} sx={{ p: { xs: 2, sm: 4 }, mt: 3, width: '100%', borderRadius: 2, boxShadow: '0 4px 24px rgba(36,93,107,0.08)', opacity: selectedAnnkutEvent ? 1 : 0.5, pointerEvents: selectedAnnkutEvent ? 'auto' : 'none', position: 'relative' }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(5, 1fr)'
            },
            alignItems: 'start'
          }}
        >
          <TextField
            fullWidth
            label="Vasan Name"
            value={vasanName}
            onChange={e => setVasanName(e.target.value)}
            InputProps={{
              startAdornment: <CategoryIcon sx={{ color: '#245D6B', mr: 1 }} />,
            }}
          />
          <Autocomplete
            fullWidth
            options={foodItems}
            getOptionLabel={(option) => option.vangiName}
            value={foodItems.find(f => f.vangiName === foodName) || null}
            onChange={(_, val) => setFoodName(val ? val.vangiName : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Food Name"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <RestaurantIcon sx={{ color: '#245D6B', mr: 1 }} />,
                }}
              />
            )}
            clearOnEscape
          />
          <TextField
            fullWidth
            label="Total Weight"
            value={totalWeight}
            onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setTotalWeight(e.target.value); }}
            InputProps={{ startAdornment: <ScaleIcon sx={{ color: '#245D6B', mr: 1 }} /> }}
          />
          <TextField
            fullWidth
            label="Total Vasan"
            value={totalVasan}
            onChange={e => { if (/^\d*$/.test(e.target.value)) setTotalVasan(e.target.value); }}
            InputProps={{ startAdornment: <NumbersIcon sx={{ color: '#245D6B', mr: 1 }} /> }}
          />
          <Button
            variant="contained"
            sx={{ bgcolor: '#245D6B', height: 56, fontWeight: 600, letterSpacing: 0.5 }}
            onClick={handleAdd}
          >
            Add
          </Button>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: -2, gap: 2 }}>
        <TextField label="Search" size="small" value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 300, background: '#fff' }} />
        {selectedAnnkutEvent && filtered.length > 0 && <Button variant="outlined" startIcon={<PrintIcon />} sx={{ color: '#245D6B', borderColor: '#245D6B' }} onClick={() => setPrintDialogOpen(true)}>Print</Button>}
      </Box>
      <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Vasan Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Food Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Total Weight</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Total Vasan</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Event</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!selectedAnnkutEvent ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ color: '#245D6B', fontStyle: 'italic', py: 4 }}>Select an Annkut event first</TableCell></TableRow>
            ) : paginated.length > 0 ? paginated.map((entry, idx) => (
              <TableRow key={entry.id}>
                <TableCell>{(page - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
                <TableCell>{entry.vasanName}</TableCell>
                <TableCell>{entry.foodName}</TableCell>
                <TableCell>{entry.totalWeight}</TableCell>
                <TableCell>{entry.totalVasan}</TableCell>
                <TableCell>{entry.event?.eventName || 'N/A'} - {entry.event?.eventYear || 'N/A'}</TableCell>
                <TableCell>
                  <IconButton size="small" sx={{ color: '#245D6B' }} onClick={() => handleEditOpen(entry)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteOpen(entry.id)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={7} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>No data found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {selectedAnnkutEvent && pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={pageCount} page={page} onChange={(_, v) => setPage(v)} />
        </Box>
      )}

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Vasan Entry</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
          <TextField
            label="Vasan Name"
            value={editingEntry?.vasanName || ''}
            onChange={e => setEditingEntry({ ...editingEntry, vasanName: e.target.value })}
            InputProps={{ startAdornment: <CategoryIcon sx={{ color: '#245D6B', mr: 1 }} /> }}
          />
          <Autocomplete
            options={foodItems}
            getOptionLabel={(option) => option.vangiName}
            value={foodItems.find(f => f.vangiName === (editingEntry?.foodName || '')) || null}
            onChange={(_, val) => setEditingEntry({ ...editingEntry, foodName: val ? val.vangiName : '' })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Food Name"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <RestaurantIcon sx={{ color: '#245D6B', mr: 1 }} />,
                }}
              />
            )}
            clearOnEscape
          />
          <TextField
            label="Total Weight"
            type="number"
            value={editingEntry?.totalWeight || ''}
            onChange={e => setEditingEntry({ ...editingEntry, totalWeight: e.target.value })}
            InputProps={{ startAdornment: <ScaleIcon sx={{ color: '#245D6B', mr: 1 }} /> }}
          />
          <TextField
            label="Total Vasan"
            type="number"
            value={editingEntry?.totalVasan || ''}
            onChange={e => setEditingEntry({ ...editingEntry, totalVasan: e.target.value })}
            InputProps={{ startAdornment: <NumbersIcon sx={{ color: '#245D6B', mr: 1 }} /> }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" sx={{ bgcolor: '#245D6B' }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this Vasan entry?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>
          Print Preview
          <Button variant="contained" sx={{ float: 'right', bgcolor: '#245D6B', ml: 2 }} onClick={() => window.print()}>Print</Button>
        </DialogTitle>
        <DialogContent>
          <Box id="vasan-print">
            <div style={{ textAlign: 'left', marginBottom: 24, borderBottom: '2px solid #245D6B', paddingBottom: 12 }}>
              <h1 style={{ color: '#245D6B', margin: 0, fontSize: 32, letterSpacing: 2, fontWeight: 700 }}>Vasan Master Report</h1>
              <div style={{ color: '#555', fontSize: 16, marginTop: 4 }}>
                {new Date().toLocaleDateString()} | Powered by Kitchen Manager
                {selectedEventDetails && <span> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</span>}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic', padding: 40, fontSize: 16 }}>No Vasan data available for printing.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginTop: '20px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Sr. No.</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Vasan Name</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Food Name</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Total Weight</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Total Vasan</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{entry.vasanName}</td>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{entry.foodName}</td>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{entry.totalWeight}</td>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{entry.totalVasan}</td>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{entry.event?.eventName || 'N/A'} - {entry.event?.eventYear || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)} sx={{ color: '#245D6B', fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={() => setOpenSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setOpenSnackbar(false)} severity={success ? 'success' : 'error'} sx={{ width: '100%' }}>{success || error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default VasanMaster;
