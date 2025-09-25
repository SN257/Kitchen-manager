import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, CircularProgress, Button, Dialog, DialogTitle, DialogContent, Snackbar, Alert } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import { useApiBaseUrl } from '../config/config';

interface VasanFillPlan { id:number; vasanId:number; foodName:string; fillWeightKg:number }
interface VasanNosEntry { vasanId:number; vasanName:string; foodName:string; totalVasan:number; sectionEntries:{ sectionId:number; sectionName:string; count:number }[] }
interface RecipeEntry { vangiName:string; items_per_kg:number; }
interface WeightEntry { vangiName:string; gram:number }

const SectionNosSummary: React.FC = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const [loading, setLoading] = useState(false);
  const [fillPlans, setFillPlans] = useState<VasanFillPlan[]>([]);
  const [nosEntries, setNosEntries] = useState<VasanNosEntry[]>([]);
  const [recipes, setRecipes] = useState<RecipeEntry[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedSignature, setLastSavedSignature] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{open:boolean; message:string; severity:'success'|'error'}>({open:false,message:'',severity:'success'});
  const [cachedRows, setCachedRows] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedAnnkutEvent) { setNosEntries([]); setFillPlans([]); setRecipes([]); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    Promise.all([
      // vasans not needed for aggregated view
      fetch(`${API_BASE_URL}/vasan-fill-plans?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): []),
      fetch(`${API_BASE_URL}/vasan-nos-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): null),
      fetch(`${API_BASE_URL}/recipe`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): []),
      fetch(`${API_BASE_URL}/weight-entries?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): [])
    ]).then(([planData, nosData, recipeData, weightData]) => {
      setFillPlans(Array.isArray(planData)? planData: []);
      if (nosData && Array.isArray(nosData.entries)) setNosEntries(nosData.entries); else setNosEntries([]);
      setRecipes(Array.isArray(recipeData)? recipeData: []);
      setWeights(Array.isArray(weightData)? weightData: []);
    }).finally(()=> setLoading(false));
    // fetch saved summary
    fetch(`${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): null).then(saved => { if (saved && Array.isArray(saved.rows)) setCachedRows(saved.rows); });
  }, [API_BASE_URL, selectedAnnkutEvent]);

  const rows = useMemo(() => {
    // Aggregate by foodName (case-insensitive). For each fillPlan, get its nos and per-plan weight, then sum into food-level totals.
    const keyFor = (vasanId:number, foodName:string) => `${vasanId}::${(foodName||'').toLowerCase()}`;
    const compositeMap = new Map<string, VasanNosEntry>();
    nosEntries.forEach(e => {
      const k = keyFor(e.vasanId, e.foodName || '');
      compositeMap.set(k, e);
    });
    // legacy aggregate by vasanId
    const legacyAggregate = new Map<number, number>();
    nosEntries.forEach(e => {
      legacyAggregate.set(e.vasanId, (legacyAggregate.get(e.vasanId) || 0) + (e.totalVasan || 0));
    });
    const weightMap = new Map<string, number>((weights||[]).map(w => [ (w.vangiName||'').trim().toLowerCase(), Number(w.gram)||0 ]));

    const agg = new Map<string, {
      id: number;
      foodName: string;
      totalNos: number;
      totalWeightKg: number;
      flourRequiredKg: number;
      totalNang: number;
    }>();

    fillPlans.forEach(plan => {
      const compositeKey = keyFor(plan.vasanId, plan.foodName);
      const nosEntry = compositeMap.get(compositeKey);
      let planNos = nosEntry ? nosEntry.totalVasan : 0;
      if (!nosEntry && !plan.foodName && legacyAggregate.has(plan.vasanId)) {
        planNos = legacyAggregate.get(plan.vasanId)!;
      }
      const weightPerVasanKg = Number(plan.fillWeightKg) || 0;
      const planTotalWeightKg = planNos * weightPerVasanKg;

      // find recipe: special handling for 'મગજ'
      let recipe: RecipeEntry | undefined;
      if ((plan.foodName || '').trim().startsWith('મગજ')) {
        recipe = recipes.find(r => r.vangiName.trim() === 'મગજ');
      } else {
        recipe = recipes.find(r => r.vangiName.toLowerCase() === (plan.foodName||'').toLowerCase());
      }
      const flourForPlan = recipe && Number(recipe.items_per_kg) > 0 ? (planTotalWeightKg / Number(recipe.items_per_kg)) : 0;
      const gramPerPiece = weightMap.get((plan.foodName||'').trim().toLowerCase()) || 0;
      const nangForPlan = gramPerPiece > 0 ? (planTotalWeightKg * 1000) / gramPerPiece : 0;

      const foodKey = (plan.foodName || '').trim().toLowerCase();
      const displayName = plan.foodName || '';
      if (!agg.has(foodKey)) {
        agg.set(foodKey, { id: plan.id, foodName: displayName, totalNos: planNos, totalWeightKg: planTotalWeightKg, flourRequiredKg: flourForPlan, totalNang: nangForPlan });
      } else {
        const cur = agg.get(foodKey)!;
        cur.totalNos += planNos;
        cur.totalWeightKg += planTotalWeightKg;
        cur.flourRequiredKg += flourForPlan;
        cur.totalNang += nangForPlan;
      }
    });

    // Convert agg map to array and sort by foodName
    const out = Array.from(agg.values()).map((v, idx) => ({ ...v, id: v.id || idx+1 }));
    out.sort((a,b) => (a.foodName||'').localeCompare(b.foodName || ''));
    return out;
  }, [fillPlans, nosEntries, recipes, weights]);

  // Totals row removed per latest requirement; if needed later we can reintroduce.

  // Auto-save whenever calculated rows change (after data loaded) and differ from last saved snapshot.
  useEffect(() => {
    if (!selectedAnnkutEvent) return;
    if (loading) return; // wait until initial data load done
    if (!rows.length) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    // Build a lightweight signature to detect changes (avoid frequent identical saves)
  const signature = JSON.stringify(rows.map(r => ({ foodName: r.foodName, n: r.totalNos, tw: r.totalWeightKg, f: r.flourRequiredKg, tn: r.totalNang })));
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
  // But compute totalNang on the fly if missing in snapshot
  const displayRows = useMemo(() => {
    const base = (cachedRows.length ? cachedRows : rows) as any[];
    if (!base?.length) return base || [];
    const weightMap = new Map<string, number>((weights||[]).map(w => [ (w.vangiName||'').trim().toLowerCase(), Number(w.gram)||0 ]));
    return base.map(r => {
      // normalize numeric fields to safe numbers
      const totalWeightKg = Number(r.totalWeightKg) || 0;
      const totalNos = Number(r.totalNos) || 0;
      const flourRequiredKg = Number(r.flourRequiredKg) || 0;
      const totalNang = (r.totalNang === undefined || r.totalNang === null)
        ? (() => {
            const gramPerPiece = weightMap.get((r.foodName||'').trim().toLowerCase()) || 0;
            return gramPerPiece > 0 ? (totalWeightKg * 1000) / gramPerPiece : 0;
          })()
        : Number(r.totalNang) || 0;

      const weightPerVasanKg = totalNos > 0 ? (totalWeightKg / totalNos) : 0;

      return {
        ...r,
        totalWeightKg,
        totalNos,
        flourRequiredKg,
        totalNang,
        weightPerVasanKg,
      };
    });
  }, [cachedRows, rows, weights]);

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
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Food Name</TableCell>
                  
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Total Nos</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Total Nang</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Flour Required (Kg)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
        {displayRows.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ textAlign:'center' }}>{idx + 1}</TableCell>
                    <TableCell sx={{ textAlign:'center' }}>{r.foodName}</TableCell>
          
          <TableCell sx={{ textAlign:'center', fontWeight:600 }}>{`${r.totalNos} nos`}</TableCell>
          <TableCell sx={{ textAlign:'center' }}>{`${r.totalWeightKg.toFixed(2)} kg`}</TableCell>
          <TableCell sx={{ textAlign:'center', fontWeight:600 }}>{`${Math.round(r.totalNang || 0)} nos`}</TableCell>
          <TableCell sx={{ textAlign:'center', fontWeight:600 }}>{`${r.flourRequiredKg.toFixed(2)} kg`}</TableCell>
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
          <DialogContent
            dividers
            sx={{
              '@media print': {
                bgcolor: '#fff',
                p: 2,
              }
            }}
          >
            <Box sx={{ mb:3, borderBottom:'2px solid #245D6B', pb:1.5, '@media print': { mb:2, pb:1, borderBottom:'2px solid #245D6B' } }}>
              <Typography variant='h5' sx={{ fontWeight:700, color:'#245D6B', letterSpacing:1, '@media print': { color:'#245D6B', fontSize:26 } }}>Section Nos Summary Report</Typography>
              <Typography variant='body2' sx={{ color:'#555', mt:0.5, '@media print': { color:'#000' } }}>
                {new Date().toLocaleDateString()} | Powered by Kitchen Manager
                {selectedEventDetails && <> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</>}
              </Typography>
            </Box>
            <TableContainer sx={{ width:'100%', boxShadow:'none', '@media print': { width:'100%' } }}>
              <Table stickyHeader sx={{ border:'1px solid #245D6B', fontSize:13, '@media print': { fontSize:13 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>ID</TableCell>
                    <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Food Name</TableCell>
                    
                    <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Total Nos</TableCell>
                    <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Total Weight (Kg)</TableCell>
                    <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Total Nang</TableCell>
                    <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Flour Required (Kg)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
          {displayRows.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell sx={{ textAlign:'center', border:'1px solid #245D6B' }}>{idx + 1}</TableCell>
                      <TableCell sx={{ textAlign:'center', border:'1px solid #245D6B' }}>{r.foodName}</TableCell>
            
            <TableCell sx={{ textAlign:'center', fontWeight:600, border:'1px solid #245D6B' }}>{`${r.totalNos} nos`}</TableCell>
            <TableCell sx={{ textAlign:'center', border:'1px solid #245D6B' }}>{`${r.totalWeightKg.toFixed(2)} kg`}</TableCell>
            <TableCell sx={{ textAlign:'center', fontWeight:600, border:'1px solid #245D6B' }}>{`${Math.round(r.totalNang || 0)} nos`}</TableCell>
            <TableCell sx={{ textAlign:'center', fontWeight:600, border:'1px solid #245D6B' }}>{`${r.flourRequiredKg.toFixed(2)} kg`}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row intentionally removed in print view as well */}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <Box sx={{ display:'flex', justifyContent:'flex-end', gap:1, p:2, pt:1 }}>
            <Button onClick={()=> window.print()} variant='contained' size='small' sx={{ bgcolor:'#245D6B', textTransform:'none', '&:hover':{ bgcolor:'#1d4b56' } }}>Print</Button>
            <Button onClick={()=> setPrintOpen(false)} size='small' sx={{ color:'#245D6B', textTransform:'none' }}>Close</Button>
          </Box>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={()=> setSnackbar({...snackbar, open:false})} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert onClose={()=> setSnackbar({...snackbar, open:false})} severity={snackbar.severity} sx={{ width:'100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SectionNosSummary;
