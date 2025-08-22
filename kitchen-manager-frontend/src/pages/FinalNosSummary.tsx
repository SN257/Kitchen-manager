import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, CircularProgress, Button, Dialog, DialogTitle, DialogContent, Snackbar, Alert } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import { useApiBaseUrl } from '../config/config';

interface SummaryRow {
  foodName: string;
  totalWeightKg: number;
  totalNang: number;
  finalFlour: number;
}

interface WeightEntry { vangiName: string; gram: number }

const FinalNosSummary: React.FC = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const [loading, setLoading] = useState(false);
  const [annkutRows, setAnnkutRows] = useState<any[]>([]);
  const [sectionRows, setSectionRows] = useState<any[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedSignature, setLastSavedSignature] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{open:boolean; message:string; severity:'success'|'error'}>({open:false,message:'',severity:'success'});
  const [cachedRows, setCachedRows] = useState<SummaryRow[]>([]);
  const inFlightSave = useRef<string>('');
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  useEffect(() => {
    console.log('Selected Annkut Event:', selectedAnnkutEvent);
    if (!selectedAnnkutEvent) { setAnnkutRows([]); setSectionRows([]); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    const annkutUrl = `${API_BASE_URL}/annkut-sidhu-saman/?eventId=${selectedAnnkutEvent}`;
    const sectionUrl = `${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`;
    console.log('Fetching Annkut URL:', annkutUrl);
    console.log('Fetching Section URL:', sectionUrl);
  Promise.all([
      fetch(annkutUrl, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
        .then(async r => {
          if (!r.ok) return null;
          const ct = r.headers.get('content-type');
          if (ct && ct.includes('application/json')) return await r.json();
          return null;
        }),
      fetch(sectionUrl, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
        .then(async r => {
          if (!r.ok) return null;
          const ct = r.headers.get('content-type');
          if (ct && ct.includes('application/json')) return await r.json();
          return null;
        }),
      fetch(`${API_BASE_URL}/weight-entries?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
        .then(r => r.ok ? r.json() : [])
    ]).then(([annkutData, sectionData, weightData]) => {
      console.log('FULL Annkut API Response:', annkutData);
      const annkut = Array.isArray(annkutData) ? annkutData : [];
      const section = Array.isArray(sectionData?.rows)? sectionData.rows: [];
      console.log('RAW annkutRows:', annkut);
      console.log('RAW sectionRows:', section);
      setAnnkutRows(annkut);
      setSectionRows(section);
      setWeights(Array.isArray(weightData) ? weightData : []);
    }).finally(()=> setLoading(false));

    // Fetch saved snapshot (if backend endpoint exists)
    fetch(`${API_BASE_URL}/final-nos-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
      .then(r => r.ok ? r.json() : null)
      .then(saved => {
        if (saved && Array.isArray(saved.rows)) {
          // sanitize
          const rows: SummaryRow[] = saved.rows.map((r: any) => ({
            foodName: String(r.foodName || ''),
            totalWeightKg: Number(r.totalWeightKg) || 0,
            totalNang: Number(r.totalNang) || 0,
            finalFlour: Number(r.finalFlour) || 0,
          }));
          setCachedRows(rows);
        } else {
          setCachedRows([]);
        }
      })
      .catch(() => setCachedRows([]));
  }, [API_BASE_URL, selectedAnnkutEvent]);

  // Helper to get the correct food name field from Annkut row
  const getAnnkutFoodName = (row: any) => {
    return row?.mithai_name || '';
  };
  const normalizeName = (name: string) => String(name || '').trim().toLowerCase();
  const getBaseName = (name: string) => {
    if (!name) return '';
    return name.split('(')[0].trim().toLowerCase();
  };
  type Mapped = { row: any; name: string };
  const annkutMap = new Map<string, Mapped>();
  annkutRows.forEach(r => {
    const name = getAnnkutFoodName(r);
    annkutMap.set(normalizeName(name), { row: r, name });
  });
  const sectionMap = new Map<string, Mapped>();
  sectionRows.forEach(r => {
    const name = String(r.foodName || '');
    sectionMap.set(normalizeName(name), { row: r, name });
  });
  const weightMap = new Map<string, number>((weights || []).map(w => [String(w.vangiName || '').trim().toLowerCase(), Number(w.gram) || 0]));
  const allFoods = Array.from(new Set([...annkutMap.keys(), ...sectionMap.keys()]));
  const summaryRows: SummaryRow[] = allFoods.map(key => {
    const a = annkutMap.get(key);
    const s = sectionMap.get(key);
    const annkutRow = a?.row;
    const sectionRow = s?.row;
    const displayName = s?.name || a?.name || key;
    // Use total_flour and total_nang for Annkut row, flourRequiredKg and totalNang for Section row
    const annkutFlour = annkutRow ? Number(annkutRow.total_flour) || 0 : 0;
    const annkutNang = annkutRow ? Number(annkutRow.total_nang) || 0 : 0;
    const annkutWeight = annkutRow ? Number(annkutRow.total_weight) || 0 : 0;
    const sectionFlour = sectionRow ? Number(sectionRow.flourRequiredKg) || 0 : 0;
    const sectionNang = sectionRow ? Number(sectionRow.totalNang) || 0 : 0;
    const sectionWeight = sectionRow ? Number(sectionRow.totalWeightKg) || 0 : 0;
    // Pick the row with the greater flour value for all columns
    let totalWeightKg, totalNang;
    if (annkutFlour >= sectionFlour) {
      totalWeightKg = annkutWeight;
      totalNang = annkutNang;
    } else {
      totalWeightKg = sectionWeight;
      totalNang = sectionNang;
    }
    // If weight is not available, derive from totalNang and piece gram
    if ((!totalWeightKg || !isFinite(totalWeightKg)) && (Number(totalNang) || 0) > 0) {
      const gram = weightMap.get(normalizeName(displayName)) || weightMap.get(getBaseName(displayName)) || 0;
      if (gram > 0) totalWeightKg = (Number(totalNang) * gram) / 1000;
      else totalWeightKg = 0;
    }
    return {
      foodName: displayName,
      totalWeightKg,
      totalNang,
      finalFlour: Math.max(annkutFlour, sectionFlour)
    };
  });

  const baseRows: SummaryRow[] = (cachedRows && cachedRows.length ? cachedRows : summaryRows);
  const displayRows: SummaryRow[] = baseRows.map(r => {
    let tw = Number(r.totalWeightKg) || 0;
    const tn = Number(r.totalNang) || 0;
    if ((!tw || !isFinite(tw)) && tn > 0) {
      const gram = weightMap.get(getBaseName(r.foodName)) || weightMap.get(String(r.foodName || '').trim().toLowerCase()) || 0;
      if (gram > 0) tw = (tn * gram) / 1000;
    }
    return { ...r, totalWeightKg: tw };
  });

  useEffect(() => {
    if (!selectedAnnkutEvent) return;
    if (loading) return;
    if (!summaryRows.length) return;
    const token = localStorage.getItem('token');
    if (!token) return;
  const signature = JSON.stringify(summaryRows.map(r => ({ f:r.foodName, tw:r.totalWeightKg, tn:r.totalNang, ff:r.finalFlour })));
  if (signature === lastSavedSignature) return;
  if (inFlightSave.current === signature) return; // prevent duplicate concurrent save
  inFlightSave.current = signature;
    setAutoSaving(true);
    fetch(`${API_BASE_URL}/final-nos-summary`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventId: selectedAnnkutEvent, rows: summaryRows })
    })
      .then(res => { if (!res.ok) throw new Error('save failed'); return res.json().catch(()=>null); })
      .then(() => {
        setLastSavedSignature(signature);
        // Refresh snapshot
        return fetch(`${API_BASE_URL}/final-nos-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
          .then(r=> r.ok? r.json(): null)
          .then(saved => {
            if (saved && Array.isArray(saved.rows)) {
              const rows: SummaryRow[] = saved.rows.map((r: any) => ({
                foodName: String(r.foodName || ''),
                totalWeightKg: Number(r.totalWeightKg) || 0,
                totalNang: Number(r.totalNang) || 0,
                finalFlour: Number(r.finalFlour) || 0,
              }));
              setCachedRows(rows);
            }
          });
      })
      .catch(() => {
        setSnackbar({ open:true, message:'Auto-save failed (endpoint missing?)', severity:'error' });
      })
  .finally(() => { setAutoSaving(false); if (inFlightSave.current === signature) inFlightSave.current = ''; });
  }, [summaryRows, selectedAnnkutEvent, loading, API_BASE_URL, lastSavedSignature]);

  return (
    <Box sx={{ p:{ xs:2, sm:1 }, minHeight:'80vh' }}>
      <Box sx={{ display:'flex', alignItems:'center', mb:3 }}>
        <SummarizeIcon sx={{ color:'#245D6B', fontSize:32, mr:1 }} />
        <Typography variant='h5' sx={{ color:'#245D6B', fontWeight:700 }}>Final Nos Summary</Typography>
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
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Food Name</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Total Nang</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center' }}>Final Flour Required (Kg)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
        {displayRows.map((r,i) => (
                  <TableRow key={`${r.foodName}-${i}`}>
                    <TableCell sx={{ textAlign:'center' }}>{r.foodName}</TableCell>
          <TableCell sx={{ textAlign:'center' }}>{`${r.totalWeightKg.toFixed(2)} kg`}</TableCell>
          <TableCell sx={{ textAlign:'center' }}>{`${Math.round(r.totalNang)} nos`}</TableCell>
          <TableCell sx={{ textAlign:'center', fontWeight:700, color:'#245D6B' }}>{`${r.finalFlour.toFixed(2)} kg`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Print dialog */}
      <Dialog open={printOpen} onClose={()=> setPrintOpen(false)} maxWidth='xl' fullWidth>
        <DialogTitle>Final Nos Summary Print</DialogTitle>
        <DialogContent dividers sx={{ '@media print': { bgcolor:'#fff', p:2 } }}>
          <Box sx={{ mb:3, borderBottom:'2px solid #245D6B', pb:1.5, '@media print': { mb:2, pb:1, borderBottom:'2px solid #245D6B' } }}>
            <Typography variant='h5' sx={{ fontWeight:700, color:'#245D6B', letterSpacing:1, '@media print': { color:'#245D6B', fontSize:26 } }}>Final Nos Summary Report</Typography>
            <Typography variant='body2' sx={{ color:'#555', mt:0.5, '@media print': { color:'#000' } }}>
              {new Date().toLocaleDateString()} | Powered by Kitchen Manager
              {selectedEventDetails && <> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</>}
            </Typography>
          </Box>
          <TableContainer sx={{ width:'100%', boxShadow:'none', '@media print': { width:'100%' } }}>
            <Table stickyHeader sx={{ border:'1px solid #245D6B', fontSize:13, '@media print': { fontSize:13 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Food Name</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Total Nang</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, textAlign:'center', border:'1px solid #245D6B' }}>Final Flour Required (Kg)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
        {displayRows.map((r,i) => (
                  <TableRow key={`${r.foodName}-${i}`}>
                    <TableCell sx={{ textAlign:'center', border:'1px solid #245D6B' }}>{r.foodName}</TableCell>
          <TableCell sx={{ textAlign:'center', border:'1px solid #245D6B' }}>{`${r.totalWeightKg.toFixed(2)} kg`}</TableCell>
          <TableCell sx={{ textAlign:'center', fontWeight:600, border:'1px solid #245D6B' }}>{`${Math.round(r.totalNang)} nos`}</TableCell>
          <TableCell sx={{ textAlign:'center', fontWeight:600, border:'1px solid #245D6B' }}>{`${r.finalFlour.toFixed(2)} kg`}</TableCell>
                  </TableRow>
                ))}
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

export default FinalNosSummary;
