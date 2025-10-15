import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, TextField, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Pagination, Menu, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import CategoryIcon from '@mui/icons-material/Category';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const ROWS_PER_PAGE = 5;

const VasanMaster: React.FC = () => {
  const API_BASE_URL = useApiBaseUrl();
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const [vasanName, setVasanName] = useState('');
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
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

  const clearForm = () => { setVasanName(''); setDescription(''); };

  const handleAdd = async () => {
    if (!currentUser) { setError('Not authenticated'); setSuccess(''); setOpenSnackbar(true); return; }
    if (!selectedAnnkutEvent) { setError('Select event first'); setSuccess(''); setOpenSnackbar(true); return; }
    if (!vasanName) { setError('Vasan name required'); setSuccess(''); setOpenSnackbar(true); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/vasans`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ vasanName, description, eventId: selectedAnnkutEvent }) });
      if (!res.ok) throw new Error();
  setSuccess('Vasan entry added'); setError(''); setOpenSnackbar(true); clearForm(); fetchEntries();
  window.dispatchEvent(new CustomEvent('vasansChanged'));
    } catch { setError('Add failed'); setSuccess(''); setOpenSnackbar(true); }
  };

  const handleEditOpen = (entry: any) => { setEditingEntry({ ...entry }); setEditDialogOpen(true); };
  const handleEditSave = async () => {
    if (!editingEntry) return;
    try {
  const res = await fetch(`${API_BASE_URL}/vasans/${editingEntry.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ vasanName: editingEntry.vasanName, description: editingEntry.description, eventId: editingEntry.eventId }) });
      if (!res.ok) throw new Error();
  setSuccess('Updated successfully'); setError(''); setOpenSnackbar(true); setEditDialogOpen(false); setEditingEntry(null); fetchEntries();
  window.dispatchEvent(new CustomEvent('vasansChanged'));
    } catch { setError('Update failed'); setSuccess(''); setOpenSnackbar(true); }
  };

  const handleDeleteOpen = (id: number) => { setDeleteId(id); setDeleteDialogOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vasans/${deleteId}`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error();
  setSuccess('Deleted'); setError(''); setOpenSnackbar(true); setDeleteDialogOpen(false); setDeleteId(null); fetchEntries();
  window.dispatchEvent(new CustomEvent('vasansChanged'));
    } catch { setError('Delete failed'); setSuccess(''); setOpenSnackbar(true); }
  };

  const filtered = entries.filter(e => e.vasanName.toLowerCase().includes(search.toLowerCase()) || (e.description || '').toLowerCase().includes(search.toLowerCase()));
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
            display: 'flex',
            gap: 2,
            alignItems: 'stretch',
            width: '100%',
            '& > .vasan-field': { flex: 1 },
          }}
        >
          <TextField
            className="vasan-field"
            label="Vasan Name"
            value={vasanName}
            onChange={e => setVasanName(e.target.value)}
            InputProps={{ startAdornment: <CategoryIcon sx={{ color: '#245D6B', mr: 1 }} /> }}
          />
          <TextField
            className="vasan-field"
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            multiline
            minRows={1}
            InputProps={{ startAdornment: <DescriptionIcon sx={{ color: '#245D6B', mr: 1 }} /> }}
          />
          <Button
            variant="contained"
            sx={{ bgcolor: '#245D6B', height: 56, fontWeight: 600, letterSpacing: 0.5, flex: '0 0 140px' }}
            onClick={handleAdd}
          >
            Add
          </Button>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: -2, gap: 2 }}>
        <TextField label="Search" size="small" value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 300, background: '#fff' }} />
        {selectedAnnkutEvent && filtered.length > 0 && (
          <>
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ color: '#245D6B', borderColor: '#245D6B' }} onClick={(e) => setExportAnchorEl(e.currentTarget)}>Export</Button>
            <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={() => setExportAnchorEl(null)}>
              <MenuItem onClick={async () => { setExportAnchorEl(null); try { const XLSX = await import('xlsx'); const data = filtered.map((en:any, idx:number) => ({ ID: idx+1, 'Vasan Name': en.vasanName, Description: en.description || '', Event: en.event ? `${en.event.eventName} - ${en.event.eventYear}` : '' })); const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Vasan Master'); XLSX.writeFile(wb, `Vasan_Master_${selectedEventDetails?.eventName || 'Export'}.xlsx`);} catch (err) { setOpenSnackbar(true); setSuccess(''); setError('Failed to export'); } }}>Export Excel</MenuItem>
              <MenuItem onClick={async () => { setExportAnchorEl(null); try { const html2canvas = (await import('html2canvas')).default; const jsPDF = (await import('jspdf')).default; const elem = document.querySelector('#vasan-print'); const tempDiv = document.createElement('div'); tempDiv.style.position = 'absolute'; tempDiv.style.left = '-9999px'; tempDiv.innerHTML = elem ? elem.innerHTML : '<div>No data</div>'; document.body.appendChild(tempDiv); const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: '#fff' }); document.body.removeChild(tempDiv); const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF('p', 'mm', 'a4'); const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = (canvas.height * pdfWidth) / canvas.width; pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight); pdf.save(`Vasan_Master_${selectedEventDetails?.eventName || 'Export'}.pdf`);} catch (err) { setOpenSnackbar(true); setSuccess(''); setError('Failed to export'); } }}>Export PDF</MenuItem>
            </Menu>
            <Button variant="outlined" startIcon={<PrintIcon />} sx={{ color: '#245D6B', borderColor: '#245D6B' }} onClick={() => setPrintDialogOpen(true)}>Print</Button>
          </>
        )}
      </Box>
      <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Vasan Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Description</TableCell>
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
                <TableCell>{entry.description}</TableCell>
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
          <TextField
            label="Description"
            value={editingEntry?.description || ''}
            onChange={e => setEditingEntry({ ...editingEntry, description: e.target.value })}
            InputProps={{ startAdornment: <DescriptionIcon sx={{ color: '#245D6B', mr: 1 }} /> }}
            multiline
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
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Description</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{entry.vasanName}</td>
                      <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{entry.description}</td>
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
