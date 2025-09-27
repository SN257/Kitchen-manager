import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Paper, TextField, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Pagination, MenuItem, Checkbox, ListItemText, Chip, InputAdornment } from '@mui/material';
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
interface FoodPlan { foodName: string; fillWeightKg: number; }
interface Plan { id: number; vasanId: number; foodPlans: FoodPlan[]; vasan?: Vasan; event?: { eventName: string; eventYear: string }; }
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
  const [selectedFoods, setSelectedFoods] = useState<FoodItem[]>([]);
  const [magajSubType, setMagajSubType] = useState<string>('');
  // store per-food planned fill weights keyed by food id (string values to allow incremental typing)
  const [fillWeights, setFillWeights] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Plan | null>(null);
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

  const clearForm = () => { setVasanId(''); setSelectedFoods([]); setMagajSubType(''); setFillWeights({}); };
  

  const handleAdd = async () => {
  if (!currentUser) { setSnackbar({ open: true, message: 'Not authenticated', severity: 'error' }); return; }
  if (!selectedAnnkutEvent) { setSnackbar({ open: true, message: 'Select event first', severity: 'error' }); return; }
  // require vasan, at least one food, and a weight for every selected food
  if (!vasanId || selectedFoods.length === 0 || selectedFoods.some(f => !fillWeights[f.id])) { setSnackbar({ open: true, message: 'Fill all fields', severity: 'error' }); return; }
  const anyMagaj = selectedFoods.some(f => f.vangiName.trim().startsWith('મગજ'));
  if (anyMagaj && !magajSubType) { setSnackbar({ open: true, message: 'Select Magaj type', severity: 'error' }); return; }
    const token = localStorage.getItem('token');
    try {
      // Prepare food plans data for single entry creation
      const foodPlans = selectedFoods.map(f => {
        const base = f.vangiName;
        const nameToSave = base.trim().startsWith('મગજ') && magajSubType ? `${base} (${magajSubType})` : base;
        const weightStr = fillWeights[f.id] || '';
        return {
          foodName: nameToSave,
          fillWeightKg: Number(weightStr)
        };
      });

      // Create single entry with multiple food plans
      const res = await fetch(`${API_BASE_URL}/vasan-fill-plans`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        credentials: 'include', 
        body: JSON.stringify({ 
          vasanId: Number(vasanId), 
          eventId: selectedAnnkutEvent,
          foodPlans: foodPlans
        }) 
      });
      
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: 'Plan added', severity: 'success' }); clearForm(); fetchPlans();
    } catch { setSnackbar({ open: true, message: 'Add failed', severity: 'error' }); }
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/vasan-fill-plans/${editing.id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        credentials: 'include', 
        body: JSON.stringify({ 
          vasanId: editing.vasanId, 
          foodPlans: editing.foodPlans, 
          eventId: selectedAnnkutEvent 
        }) 
      });
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
    const foodNamesString = p.foodPlans.map(fp => fp.foodName).join(' ');
    return (v?.vasanName || '').toLowerCase().includes(search.toLowerCase()) || foodNamesString.toLowerCase().includes(search.toLowerCase());
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
        {/* First row: Vasan, Food selection, Magaj type (if needed), and Add button */}
        <Box sx={{ display: 'flex', gap: 2, width: '100%', flexWrap: 'nowrap', alignItems: 'flex-start', mb: selectedFoods.length > 0 ? 2 : 0, '& > .plan-field': { flex: 1, minWidth: 0 } }}>
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
            multiple
            disableCloseOnSelect
            options={foodItems}
            getOptionLabel={(o) => o ? `${o.vangiName}${o.category ? ' – ' + o.category : ''}` : ''}
            value={selectedFoods}
            onChange={(_, vals) => {
              const newSelected = vals as FoodItem[];
              setSelectedFoods(newSelected);
              // initialize fillWeights for newly selected foods, preserve existing values
              setFillWeights(prev => {
                const next: Record<number, string> = {};
                newSelected.forEach(f => {
                  next[f.id] = prev[f.id] ?? '';
                });
                return next;
              });
              const hasMagaj = newSelected.some(f => f.vangiName.trim().startsWith('મગજ'));
              if (hasMagaj) setMagajSubType(prev => prev || MAGAJ_SUBTYPES[0]); else setMagajSubType('');
            }}
            renderOption={(props, option, { selected }) => {
              const { key, ...otherProps } = props;
              return (
                <li key={key} {...otherProps}>
                  <Checkbox
                    style={{ marginRight: 8 }}
                    checked={selected}
                  />
                  <ListItemText primary={`${option.vangiName}${option.category ? ' – ' + option.category : ''}`} />
                </li>
              );
            }}
            renderTags={(value: FoodItem[], getTagProps) => {
              // Show first two items as chips, then a summary chip for the rest to keep single-line
              const showCount = 2;
              const toShow = value.slice(0, showCount);
              return (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {toShow.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option.vangiName}
                        size="small"
                        {...tagProps}
                        sx={{ flex: '0 0 auto', maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                      />
                    );
                  })}
                  {value.length > showCount && (
                    <Chip label={`+${value.length - showCount} more`} size="small" sx={{ flex: '0 0 auto' }} />
                  )}
                </div>
              );
            }}
            renderInput={(params) => {
              // Make a copy of params and explicitly clear the underlying input placeholder/value
              const modifiedParams = {
                ...params,
                inputProps: {
                  ...params.inputProps,
                  placeholder: selectedFoods.length > 0 ? '' : params.inputProps?.placeholder,
                  value: selectedFoods.length > 0 ? '' : params.inputProps?.value ?? '',
                }
              } as typeof params;

              return (
                <TextField
                  {...modifiedParams}
                  label="Food Name"
                  placeholder={selectedFoods.length > 0 ? '' : 'Select food(s)'}
                  sx={{
                    '& .MuiAutocomplete-tags': {
                      display: 'flex',
                      gap: 1,
                      flexWrap: 'nowrap',
                      overflow: 'hidden',
                      alignItems: 'center'
                    },
                    '& .MuiInputBase-root': {
                      minHeight: 56,
                      maxHeight: 56,
                      alignItems: 'center',
                      overflow: 'hidden'
                    }
                  }}
                  InputProps={{
                    ...modifiedParams.InputProps,
                    // Preserve Autocomplete's generated startAdornment (chips) and add our icon before it.
                    startAdornment: (() => {
                      const existing = modifiedParams.InputProps?.startAdornment as any;
                      // If Autocomplete already provides an InputAdornment (with chips), merge its children
                      if (existing && existing.props) {
                        return (
                          <InputAdornment position="start" sx={{ display: 'flex', alignItems: 'center', height: '100%', mr: 0 }}>
                            <RestaurantIcon sx={{ color: '#245D6B', mr: 1, verticalAlign: 'middle' }} />
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>{existing.props.children}</Box>
                          </InputAdornment>
                        );
                      }
                      // Fallback: just show the icon
                      return (
                        <InputAdornment position="start"><RestaurantIcon sx={{ color: '#245D6B' }} /></InputAdornment>
                      );
                    })(),
                    // Ensure the input text itself doesn't overflow the chips area
                    inputProps: {
                      ...modifiedParams.inputProps,
                      // Also visually hide the input (prevent line wrap/placeholder showing) when there are selected chips
                      placeholder: selectedFoods.length > 0 ? '' : modifiedParams.inputProps?.placeholder,
                      value: selectedFoods.length > 0 ? '' : modifiedParams.inputProps?.value ?? '',
                      style: {
                        ...(modifiedParams.inputProps?.style || {}),
                        width: selectedFoods.length > 0 ? 0 : modifiedParams.inputProps?.style?.width,
                        opacity: selectedFoods.length > 0 ? 0 : modifiedParams.inputProps?.style?.opacity,
                        pointerEvents: selectedFoods.length > 0 ? 'none' : modifiedParams.inputProps?.style?.pointerEvents,
                        padding: selectedFoods.length > 0 ? 0 : modifiedParams.inputProps?.style?.padding,
                        margin: selectedFoods.length > 0 ? 0 : modifiedParams.inputProps?.style?.margin,
                      }
                    }
                  }}
                />
              );
            }}
            clearOnEscape
          />
          {selectedFoods.some(f => f.vangiName.trim().startsWith('મગજ')) && (
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
          <Button variant="contained" sx={{ bgcolor: '#245D6B', height: 56, fontWeight: 600, letterSpacing: 0.5, flex: '0 0 140px' }} onClick={handleAdd}>Add</Button>
        </Box>

        {/* Second row: Per-selected-food planned fill weight inputs */}
        {selectedFoods.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, width: '100%', flexWrap: 'wrap' }}>
            {selectedFoods.map(f => (
              <Box key={f.id} sx={{ 
                minWidth: `calc(33.333% - 16px)`, 
                maxWidth: `calc(33.333% - 16px)`,
                flex: '0 0 calc(33.333% - 16px)'
              }}>
                <TextField
                  fullWidth
                  label={`${f.vangiName} - Fill Weight`}
                  value={fillWeights[f.id] ?? ''}
                  onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setFillWeights(prev => ({ ...prev, [f.id]: e.target.value })); }}
                  InputProps={{ 
                    startAdornment: <ScaleIcon sx={{ color: '#245D6B', mr: 1 }} />, 
                    endAdornment: <span style={{ color: '#245D6B', fontWeight: 600, marginLeft: 4 }}>Kg</span> 
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      height: 56,
                      minHeight: 56
                    }
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
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
                  <TableCell>
                    {p.foodPlans.map((fp, fpIdx) => (
                      <div key={fpIdx} style={{ marginBottom: fpIdx < p.foodPlans.length - 1 ? 4 : 0 }}>
                        {fp.foodName}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    {p.foodPlans.map((fp, fpIdx) => (
                      <div key={fpIdx} style={{ marginBottom: fpIdx < p.foodPlans.length - 1 ? 4 : 0 }}>
                        {fp.fillWeightKg} Kg
                      </div>
                    ))}
                  </TableCell>
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

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
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
          
          {/* Food Plans Editor */}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Food Plans</Typography>
          {editing?.foodPlans.map((foodPlan, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <TextField
                label="Food Name"
                value={foodPlan.foodName}
                onChange={(e) => {
                  if (!editing) return;
                  const newFoodPlans = [...editing.foodPlans];
                  newFoodPlans[index] = { ...newFoodPlans[index], foodName: e.target.value };
                  setEditing({ ...editing, foodPlans: newFoodPlans });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Weight (Kg)"
                value={foodPlan.fillWeightKg}
                onChange={(e) => {
                  if (!editing || !/^\d*\.?\d*$/.test(e.target.value)) return;
                  const newFoodPlans = [...editing.foodPlans];
                  newFoodPlans[index] = { ...newFoodPlans[index], fillWeightKg: Number(e.target.value) };
                  setEditing({ ...editing, foodPlans: newFoodPlans });
                }}
                sx={{ width: 150 }}
              />
              <IconButton 
                color="error" 
                onClick={() => {
                  if (!editing) return;
                  const newFoodPlans = editing.foodPlans.filter((_, i) => i !== index);
                  setEditing({ ...editing, foodPlans: newFoodPlans });
                }}
                disabled={editing?.foodPlans.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          
          <Button 
            onClick={() => {
              if (!editing) return;
              const newFoodPlans = [...editing.foodPlans, { foodName: '', fillWeightKg: 0 }];
              setEditing({ ...editing, foodPlans: newFoodPlans });
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add Food Plan
          </Button>
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
                        <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>
                          {p.foodPlans.map((fp, fpIdx) => (
                            <div key={fpIdx}>{fp.foodName}</div>
                          ))}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '12px 8px' }}>
                          {p.foodPlans.map((fp, fpIdx) => (
                            <div key={fpIdx}>{fp.fillWeightKg} Kg</div>
                          ))}
                        </td>
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
