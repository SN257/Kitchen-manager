import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, CircularProgress, Button, Dialog, DialogTitle, DialogContent, Snackbar, Alert } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import { useApiBaseUrl } from '../config/config';

interface VasanMasterEntry { id:number; vasanName:string; description?:string }
interface VasanFillPlan { id:number; vasanId:number; foodName:string; fillWeightKg:number }
interface VasanNosEntry { vasanId:number; vasanName:string; foodName:string; totalVasan:number; sectionEntries:{ sectionId:number; sectionName:string; count:number }[] }
interface RecipeEntry { vangiName:string; items_per_kg:number; }

const SectionNosSummary: React.FC = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const [loading, setLoading] = useState(false);
  const [vasans, setVasans] = useState<VasanMasterEntry[]>([]);
  const [fillPlans, setFillPlans] = useState<VasanFillPlan[]>([]);
  const [nosEntries, setNosEntries] = useState<VasanNosEntry[]>([]);
  const [recipes, setRecipes] = useState<RecipeEntry[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedSignature, setLastSavedSignature] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{open:boolean; message:string; severity:'success'|'error'}>({open:false,message:'',severity:'success'});
  const [cachedRows, setCachedRows] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedAnnkutEvent) { setVasans([]); setNosEntries([]); setFillPlans([]); setRecipes([]); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/vasans?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): []),
      fetch(`${API_BASE_URL}/vasan-fill-plans?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): []),
      fetch(`${API_BASE_URL}/vasan-nos-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): null),
      fetch(`${API_BASE_URL}/recipe`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): [])
    ]).then(([vasanData, planData, nosData, recipeData]) => {
      setVasans(Array.isArray(vasanData)? vasanData: []);
      setFillPlans(Array.isArray(planData)? planData: []);
      if (nosData && Array.isArray(nosData.entries)) setNosEntries(nosData.entries); else setNosEntries([]);
      setRecipes(Array.isArray(recipeData)? recipeData: []);
    }).finally(()=> setLoading(false));
    // fetch saved summary
    fetch(`${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): null).then(saved => { if (saved && Array.isArray(saved.rows)) setCachedRows(saved.rows); });
  }, [API_BASE_URL, selectedAnnkutEvent]);

  const rows = useMemo(() => {
    const keyFor = (vasanId:number, foodName:string) => `${vasanId}::${(foodName||'').toLowerCase()}`;
    // Build map keyed by composite (vasanId+foodName); allow multiple entries per vasan
    const compositeMap = new Map<string, VasanNosEntry>();
    nosEntries.forEach(e => {
      const k = keyFor(e.vasanId, e.foodName || '');
      compositeMap.set(k, e);
    });
    // Also build legacy aggregate map (by vasanId) for fallback when no specific foodName entry exists
    const legacyAggregate = new Map<number, number>();
    nosEntries.forEach(e => {
      legacyAggregate.set(e.vasanId, (legacyAggregate.get(e.vasanId) || 0) + (e.totalVasan || 0));
    });
    return fillPlans.map(plan => {
      const compositeKey = keyFor(plan.vasanId, plan.foodName);
      const nos = compositeMap.get(compositeKey);
      let totalNos = nos ? nos.totalVasan : 0;
      if (!nos && !plan.foodName && legacyAggregate.has(plan.vasanId)) {
        totalNos = legacyAggregate.get(plan.vasanId)!; // rare legacy case without foodName
      }
      const weightPerVasanKg = plan.fillWeightKg || 0;
      const totalWeightKg = totalNos * weightPerVasanKg;
      const recipe = recipes.find(r => r.vangiName.toLowerCase() === plan.foodName.toLowerCase());
      const flourRequiredKg = recipe && Number(recipe.items_per_kg) > 0 ? (totalWeightKg / Number(recipe.items_per_kg)) : 0;
      return {
        id: plan.id,
        vasanId: plan.vasanId,
        vasanName: vasans.find(v=> v.id===plan.vasanId)?.vasanName || 'N/A',
        foodName: plan.foodName,
        weightPerVasanKg,
        totalNos,
        totalWeightKg,
        flourRequiredKg,
      };
    }).sort((a,b)=> a.vasanId - b.vasanId);
  }, [fillPlans, nosEntries, recipes, vasans]);

  // Totals row removed per latest requirement; if needed later we can reintroduce.

  // Auto-save whenever calculated rows change (after data loaded) and differ from last saved snapshot.
  useEffect(() => {
    if (!selectedAnnkutEvent) return;
    if (loading) return; // wait until initial data load done
    if (!rows.length) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    // Build a lightweight signature to detect changes (avoid frequent identical saves)
    const signature = JSON.stringify(rows.map(r => ({ vasanId:r.vasanId, w:r.weightPerVasanKg, n:r.totalNos, tw:r.totalWeightKg, f:r.flourRequiredKg })));
    if (signature === lastSavedSignature) return;
    setAutoSaving(true);
    fetch(`${API_BASE_URL}/section-vasan-summary`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventId: selectedAnnkutEvent, rows })
    })
      .then(res => { if (!res.ok) throw new Error('save failed'); return res.json().catch(()=>null); })
      .then(() => {
        setLastSavedSignature(signature);
        // Refresh saved snapshot to ensure UI shows DB copy
        return fetch(`${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
          .then(r=> r.ok? r.json(): null)
          .then(saved => { if (saved && Array.isArray(saved.rows)) setCachedRows(saved.rows); });
      })
      .catch(() => {
        setSnackbar({ open:true, message:'Auto-save failed', severity:'error' });
      })
      .finally(() => setAutoSaving(false));
  }, [rows, selectedAnnkutEvent, loading, API_BASE_URL, lastSavedSignature]);

  // Always prefer cachedRows (DB snapshot) if present so we display what's persisted
  const displayRows = cachedRows.length ? cachedRows : rows;

  return (
    <Box sx={{ p:{ xs:2, sm:1 }, minHeight:'80vh' }}>
      <Box sx={{ display:'flex', alignItems:'center', mb:3 }}>
        <SummarizeIcon sx={{ color:'#245D6B', fontSize:32, mr:1 }} />
        <Typography variant='h5' sx={{ color:'#245D6B', fontWeight:700 }}>Section Nos Summary</Typography>
        {selectedEventDetails && <Typography variant='body1' sx={{ ml:2, color:'#666', fontStyle:'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
        <Box sx={{ ml:'auto', display:'flex', gap:1, alignItems:'center' }}>
          {autoSaving && <Typography variant='caption' sx={{ color:'#245D6B' }}>Auto-saving...</Typography>}
          <Button variant='outlined' disabled={!displayRows.length} sx={{ borderColor:'#245D6B', color:'#245D6B' }} onClick={()=> setPrintOpen(true)}>Print</Button>
        </Box>
      </Box>
      <Paper elevation={3} sx={{ p:2, opacity: selectedAnnkutEvent?1:0.5, pointerEvents: selectedAnnkutEvent? 'auto':'none' }}>
  {!selectedAnnkutEvent ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#245D6B' }}>Select an Annkut event first</Box>
        ) : loading ? (
          <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress /></Box>
  ) : displayRows.length === 0 ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#999' }}>No data available</Box>
        ) : (
          <TableContainer sx={{ maxHeight:'70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>ID</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Vasan (Food)</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Weight / Vasan (Kg)</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Total Nos</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Flour Required (Kg)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ textAlign:'center' }}>{r.vasanId}</TableCell>
                    <TableCell sx={{ textAlign:'center' }}>{r.vasanName} ({r.foodName})</TableCell>
                    <TableCell sx={{ textAlign:'center' }}>{r.weightPerVasanKg.toFixed(2)}</TableCell>
                    <TableCell sx={{ textAlign:'center', fontWeight:600 }}>{r.totalNos}</TableCell>
                    <TableCell sx={{ textAlign:'center' }}>{r.totalWeightKg.toFixed(2)}</TableCell>
                    <TableCell sx={{ textAlign:'center', fontWeight:600 }}>{r.flourRequiredKg.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {/* Totals row intentionally removed */}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      <Dialog open={printOpen} onClose={()=> setPrintOpen(false)} maxWidth='xl' fullWidth>
        <DialogTitle>Section Nos Summary Print</DialogTitle>
        <DialogContent>
          <Box sx={{ mb:2 }}>
            <Typography variant='h6' sx={{ fontWeight:700, color:'#245D6B' }}>Section Nos Summary Report</Typography>
            <Typography variant='body2' sx={{ color:'#555' }}>{new Date().toLocaleDateString()} {selectedEventDetails && `| Event: ${selectedEventDetails.eventName} ${selectedEventDetails.eventYear}`}</Typography>
          </Box>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr>
                <th style={{ border:'1px solid #ccc', padding:6, background:'#245D6B', color:'#fff', textAlign:'center' }}>Vasan ID</th>
                <th style={{ border:'1px solid #ccc', padding:6, background:'#245D6B', color:'#fff', textAlign:'center' }}>Vasan (Food)</th>
                <th style={{ border:'1px solid #ccc', padding:6, background:'#245D6B', color:'#fff', textAlign:'center' }}>Weight / Vasan (Kg)</th>
                <th style={{ border:'1px solid #ccc', padding:6, background:'#245D6B', color:'#fff', textAlign:'center' }}>Total Nos</th>
                <th style={{ border:'1px solid #ccc', padding:6, background:'#245D6B', color:'#fff', textAlign:'center' }}>Total Weight (Kg)</th>
                <th style={{ border:'1px solid #ccc', padding:6, background:'#245D6B', color:'#fff', textAlign:'center' }}>Flour Required (Kg)</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map(r => (
                <tr key={r.id}>
                  <td style={{ border:'1px solid #ccc', padding:6, textAlign:'center' }}>{r.vasanId}</td>
                  <td style={{ border:'1px solid #ccc', padding:6, textAlign:'center' }}>{r.vasanName} ({r.foodName})</td>
                  <td style={{ border:'1px solid #ccc', padding:6, textAlign:'center' }}>{r.weightPerVasanKg.toFixed(2)}</td>
                  <td style={{ border:'1px solid #ccc', padding:6, textAlign:'center', fontWeight:600 }}>{r.totalNos}</td>
                  <td style={{ border:'1px solid #ccc', padding:6, textAlign:'center' }}>{r.totalWeightKg.toFixed(2)}</td>
                  <td style={{ border:'1px solid #ccc', padding:6, textAlign:'center', fontWeight:600 }}>{r.flourRequiredKg.toFixed(2)}</td>
                </tr>
              ))}
              {/* Totals row intentionally removed in print view as well */}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={()=> setSnackbar({...snackbar, open:false})} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert onClose={()=> setSnackbar({...snackbar, open:false})} severity={snackbar.severity} sx={{ width:'100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SectionNosSummary;
