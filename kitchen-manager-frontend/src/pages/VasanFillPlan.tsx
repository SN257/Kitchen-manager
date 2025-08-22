import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Paper, TextField, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Pagination, MenuItem } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import AddTaskIcon from '@mui/icons-material/AddTask';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ScaleIcon from '@mui/icons-material/Scale';
import PrintIcon from '@mui/icons-material/Print';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import { useApiBaseUrl } from '../config/config';

interface Vasan { id: number; vasanName: string; description?: string; }
interface Plan { id: number; vasanId: number; foodName: string; fillWeightKg: number; vasan?: Vasan; event?: { eventName: string; eventYear: string }; }
interface FoodItem { id: number; vangiName: string; category: string; }

const ROWS_PER_PAGE = 5; // align with other master pages
const MAGAJ_SUBTYPES = ["લાડુડી", "લાડવા", "ચોસલા"];

const VasanFillPlan: React.FC = () => {
  const API_BASE_URL = useApiBaseUrl();
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const [vasans, setVasans] = useState<Vasan[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [vasanId, setVasanId] = useState<number | ''>('');
  const [foodName, setFoodName] = useState('');
  const [magajSubType, setMagajSubType] = useState<string>('');
  const [fillWeightKg, setFillWeightKg] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Plan | null>(null);
  const [editingSubType, setEditingSubType] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const fetchVasans = () => {
    if (!selectedAnnkutEvent) { setVasans([]); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/vasans?eventId=${selectedAnnkutEvent}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
      .then(r => r.json())
      .then(d => setVasans(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  // Fetch vasans (from Vasan Master backend) when event changes
  useEffect(() => { fetchVasans(); }, [selectedAnnkutEvent, API_BASE_URL]);

  // Listen to global vasan changes broadcast by VasanMaster
  useEffect(() => {
    const handler = () => fetchVasans();
    window.addEventListener('vasansChanged', handler as EventListener);
    return () => window.removeEventListener('vasansChanged', handler as EventListener);
  }, [selectedAnnkutEvent]);

  // Fetch existing plans
  const fetchPlans = () => {
    if (!selectedAnnkutEvent) { setPlans([]); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/vasan-fill-plans?eventId=${selectedAnnkutEvent}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
      .then(r => r.json()).then(d => setPlans(Array.isArray(d) ? d : []));
  };
  useEffect(() => { fetchPlans(); }, [selectedAnnkutEvent]);

  // Fetch current user for auth state (mirrors other pages)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/user/me`, { credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) setCurrentUser(await res.json());
      } catch {/* ignore */}
    };
    fetchCurrentUser();
  }, [API_BASE_URL]);

  // Fetch food items (Food Master)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/food-item`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
      .then(r => r.json())
      .then(d => setFoodItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [API_BASE_URL]);

  const clearForm = () => { setVasanId(''); setFoodName(''); setMagajSubType(''); setFillWeightKg(''); };

  const handleAdd = async () => {
  if (!currentUser) { setSnackbar({ open: true, message: 'Not authenticated', severity: 'error' }); return; }
  if (!selectedAnnkutEvent) { setSnackbar({ open: true, message: 'Select event first', severity: 'error' }); return; }
  if (!vasanId || !foodName || !fillWeightKg) { setSnackbar({ open: true, message: 'Fill all fields', severity: 'error' }); return; }
  if (foodName.trim().startsWith('મગજ') && !magajSubType) { setSnackbar({ open: true, message: 'Select Magaj type', severity: 'error' }); return; }
    const token = localStorage.getItem('token');
    try {
      const nameToSave = foodName.trim().startsWith('મગજ') && magajSubType ? `${foodName} (${magajSubType})` : foodName;
      const res = await fetch(`${API_BASE_URL}/vasan-fill-plans`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, credentials: 'include', body: JSON.stringify({ vasanId: Number(vasanId), foodName: nameToSave, fillWeightKg: Number(fillWeightKg), eventId: selectedAnnkutEvent }) });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: 'Plan added', severity: 'success' }); clearForm(); fetchPlans();
    } catch { setSnackbar({ open: true, message: 'Add failed', severity: 'error' }); }
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const token = localStorage.getItem('token');
    try {
      const baseName = (editing.foodName || '').split('(')[0].trim();
      const nameToSave = baseName.startsWith('મગજ') && editingSubType ? `${baseName} (${editingSubType})` : editing.foodName;
      const res = await fetch(`${API_BASE_URL}/vasan-fill-plans/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, credentials: 'include', body: JSON.stringify({ vasanId: editing.vasanId, foodName: nameToSave, fillWeightKg: Number(editing.fillWeightKg), eventId: selectedAnnkutEvent }) });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: 'Updated', severity: 'success' }); setEditDialogOpen(false); setEditing(null); fetchPlans();
    } catch { setSnackbar({ open: true, message: 'Update failed', severity: 'error' }); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/vasan-fill-plans/${deleteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: 'Deleted', severity: 'success' }); setDeleteDialogOpen(false); setDeleteId(null); fetchPlans();
    } catch { setSnackbar({ open: true, message: 'Delete failed', severity: 'error' }); }
  };

  const filtered = useMemo(() => plans.filter(p => {
    const v = vasans.find(vs => vs.id === p.vasanId);
    return (v?.vasanName || '').toLowerCase().includes(search.toLowerCase()) || p.foodName.toLowerCase().includes(search.toLowerCase());
  }), [plans, vasans, search]);

  const pageCount = Math.ceil(filtered.length / ROWS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AddTaskIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>Vasan Fill Plan</Typography>
        {selectedEventDetails && <Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
      </Box>

      <Paper elevation={4} sx={{ p: { xs: 2, sm: 4 }, mt: 3, width: '100%', borderRadius: 2, boxShadow: '0 4px 24px rgba(36,93,107,0.08)', opacity: selectedAnnkutEvent ? 1 : 0.5, pointerEvents: selectedAnnkutEvent ? 'auto' : 'none', position: 'relative' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', flexWrap: 'nowrap', '& > .plan-field': { flex: 1, minWidth: 0 } }}>
          <Autocomplete
            className="plan-field"
            options={vasans}
            getOptionLabel={(o) => o.description ? `${o.vasanName} – ${o.description}` : o.vasanName}
            value={vasans.find(v => v.id === vasanId) || null}
            onChange={(_, val) => setVasanId(val ? val.id : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vasan"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <CategoryIcon sx={{ color: '#245D6B', mr: 1 }} />,
                }}
              />
            )}
            clearOnEscape
          />
          <Autocomplete
            className="plan-field"
            options={foodItems}
            getOptionLabel={(o) => o ? `${o.vangiName}${o.category ? ' – ' + o.category : ''}` : ''}
            value={foodItems.find(fi => fi.vangiName === foodName) || null}
            onChange={(_, val) => {
              setFoodName(val ? val.vangiName : '');
              if (val && val.vangiName.trim().startsWith('મગજ')) setMagajSubType(MAGAJ_SUBTYPES[0]); else setMagajSubType('');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Food Name"
                placeholder="Select food"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <RestaurantIcon sx={{ color: '#245D6B', mr: 1 }} />,
                }}
              />
            )}
            clearOnEscape
          />
          {foodName.trim().startsWith('મગજ') && (
            <TextField
              className="plan-field"
              select
              label="Magaj Type"
              value={magajSubType || MAGAJ_SUBTYPES[0]}
              onChange={(e) => setMagajSubType(e.target.value)}
              size="small"
            >
              {MAGAJ_SUBTYPES.map(sub => (
                <MenuItem key={sub} value={sub}>{sub}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField className="plan-field" label="Planned Fill Weight" value={fillWeightKg} onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setFillWeightKg(e.target.value); }} InputProps={{ startAdornment: <ScaleIcon sx={{ color: '#245D6B', mr: 1 }} />, endAdornment: <span style={{ color: '#245D6B', fontWeight: 600, marginLeft: 4 }}>Kg</span> }} />
          <Button variant="contained" sx={{ bgcolor: '#245D6B', height: 56, fontWeight: 600, letterSpacing: 0.5, flex: '0 0 140px' }} onClick={handleAdd}>Add</Button>
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
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Vasan Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Food Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Planned Fill Weight (Kg)</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Event</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!selectedAnnkutEvent ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ color: '#245D6B', fontStyle: 'italic', py: 4 }}>Select an event first</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>No plans</TableCell></TableRow>
            ) : paginated.map((p, idx) => {
              const v = vasans.find(vs => vs.id === p.vasanId);
              return (
                <TableRow key={p.id}>
                  <TableCell>{(page - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
                  <TableCell>{v?.vasanName || 'N/A'}</TableCell>
                  <TableCell>{p.foodName}</TableCell>
                  <TableCell>{p.fillWeightKg} Kg</TableCell>
                  <TableCell>{p.event?.eventName || 'N/A'} - {p.event?.eventYear || 'N/A'}</TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: '#245D6B' }} onClick={() => { setEditing(p); setEditDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => { setDeleteId(p.id); setDeleteDialogOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {selectedAnnkutEvent && pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={pageCount} page={page} onChange={(_, v) => setPage(v)} />
        </Box>
      )}

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Fill Plan</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 420 }}>
          <Autocomplete
            options={vasans}
            getOptionLabel={(o) => o.description ? `${o.vasanName} – ${o.description}` : o.vasanName}
            value={vasans.find(v => v.id === (editing?.vasanId || 0)) || null}
            onChange={(_, val) => setEditing(editing ? { ...editing, vasanId: val ? val.id : editing.vasanId } : editing)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vasan"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <CategoryIcon sx={{ color: '#245D6B', mr: 1 }} />,
                }}
              />
            )}
            clearOnEscape
          />
          <Autocomplete
            options={foodItems}
            getOptionLabel={(o) => o ? `${o.vangiName}${o.category ? ' – ' + o.category : ''}` : ''}
            value={foodItems.find(fi => fi.vangiName === ((editing?.foodName || '').split('(')[0].trim())) || null}
            onChange={(_, val) => {
              if (!editing) return;
              const newFood = val ? val.vangiName : editing.foodName;
              const isMagaj = !!val && val.vangiName.trim().startsWith('મગજ');
              setEditing({ ...editing, foodName: newFood });
              setEditingSubType(isMagaj ? (editingSubType || MAGAJ_SUBTYPES[0]) : '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Food Name"
                placeholder="Select food"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <RestaurantIcon sx={{ color: '#245D6B', mr: 1 }} />,
                }}
              />
            )}
            clearOnEscape
          />
          {((editing?.foodName || '').split('(')[0].trim().startsWith('મગજ')) && (
            <TextField
              select
              label="Magaj Type"
              value={editingSubType || (() => { const m = /\(([^)]+)\)/.exec(editing?.foodName || ''); return m ? m[1] : MAGAJ_SUBTYPES[0]; })()}
              onChange={(e) => setEditingSubType(e.target.value)}
              size="small"
            >
              {MAGAJ_SUBTYPES.map(sub => (
                <MenuItem key={sub} value={sub}>{sub}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField label="Planned Fill Weight (Kg)" value={editing?.fillWeightKg ?? ''} onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setEditing(editing ? { ...editing, fillWeightKg: Number(e.target.value) } : editing); }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" sx={{ bgcolor: '#245D6B' }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this fill plan?</DialogContent>
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
          <Box>
            <div style={{ textAlign: 'left', marginBottom: 24, borderBottom: '2px solid #245D6B', paddingBottom: 12 }}>
              <h1 style={{ color: '#245D6B', margin: 0, fontSize: 32, letterSpacing: 2, fontWeight: 700 }}>Vasan Fill Plan Report</h1>
              <div style={{ color: '#555', fontSize: 16, marginTop: 4 }}>
                {new Date().toLocaleDateString()} | Powered by Kitchen Manager
                {selectedEventDetails && <span> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</span>}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic', padding: 40, fontSize: 16 }}>No fill plan data available for printing.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginTop: '20px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Sr. No.</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Vasan Name</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Food Name</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Planned Fill Weight (Kg)</th>
                    <th style={{ border: '1px solid #ccc', padding: '12px 8px', background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => {
                    const v = vasans.find(vs => vs.id === p.vasanId);
                    return (
                      <tr key={p.id}>
                        <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{v?.vasanName || 'N/A'}</td>
                        <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{p.foodName}</td>
                        <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{p.fillWeightKg} Kg</td>
                        <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>{p.event?.eventName || 'N/A'} - {p.event?.eventYear || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)} sx={{ color: '#245D6B', fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default VasanFillPlan;
