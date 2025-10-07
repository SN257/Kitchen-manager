import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, CircularProgress, Button, Dialog, DialogTitle, DialogContent, Snackbar, Alert } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import { useApiBaseUrl } from '../config/config';

interface FoodPlan { foodName: string; fillWeightKg: number; }
interface VasanFillPlan { id:number; vasanId:number; foodPlans: FoodPlan[]; }
interface VasanNosEntry { vasanId:number; vasanName:string; foodName:string; totalVasan:number; sectionEntries:{ sectionId:number; sectionName:string; count:number }[] }
interface RecipeEntry { vangiName:string; items_per_kg:number; }
interface WeightEntry { vangiName:string; gram:number }

const SectionNosSummary: React.FC = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
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
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<number | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Function to fetch all data
  const fetchData = async (showLoader = true, isAutoRefresh = false) => {
    if (!selectedAnnkutEvent) {
      setNosEntries([]);
      setFillPlans([]);
      setRecipes([]);
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [planData, nosData, recipeData, weightData] = await Promise.all([
        fetch(`${API_BASE_URL}/vasan-fill-plans?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): []),
        fetch(`${API_BASE_URL}/vasan-nos-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): null),
        fetch(`${API_BASE_URL}/recipe`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): []),
        fetch(`${API_BASE_URL}/weight-entries?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): [])
      ]);

      if (debugMode) console.debug('SectionNosSummary fetched', { planData, nosData, recipeData, weightData });
      
      // Check if data has changed for auto-refresh notifications
      const currentNosSignature = JSON.stringify(nosData);
      const currentPlansSignature = JSON.stringify(planData);
      const prevNosSignature = JSON.stringify(nosEntries);
      const prevPlansSignature = JSON.stringify(fillPlans);
      
      const dataHasChanged = currentNosSignature !== prevNosSignature || currentPlansSignature !== prevPlansSignature;
      
      setFillPlans(Array.isArray(planData) ? planData : []);
      if (nosData && Array.isArray(nosData.entries)) setNosEntries(nosData.entries); else setNosEntries([]);
      setRecipes(Array.isArray(recipeData) ? recipeData : []);
      setWeights(Array.isArray(weightData) ? weightData : []);
      
      // Show notification if data changed during auto-refresh
      if (isAutoRefresh && dataHasChanged && (nosEntries.length > 0 || fillPlans.length > 0)) {
        setSnackbar({ open: true, message: 'Nos calculation data updated automatically', severity: 'success' });
      }
      
      // Fetch saved summary
      const saved = await fetch(`${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
        .then(r=> r.ok? r.json(): null)
        .catch(() => null);
        
      if (debugMode) console.debug('fetched cached summary', saved);
      if (saved && Array.isArray(saved.rows)) setCachedRows(saved.rows);
      
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error fetching section nos summary data:', error);
      if (isAutoRefresh) {
        console.warn('Auto-refresh failed, will retry on next interval');
      }
    } finally {
      if (showLoader) setLoading(false);
      else setRefreshing(false);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    fetchData(false);
  };

  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    if (!selectedAnnkutEvent) {
      setNosEntries([]);
      setFillPlans([]);
      setRecipes([]);
      return;
    }
    
    // Initial fetch
    fetchData(true);
    
    // Set up polling every 20 seconds to check for nos calculation updates
    // More frequent than FinalNosSummary since this is the source of truth
    refreshIntervalRef.current = window.setInterval(() => {
      fetchData(false, true); // false = don't show loader, true = is auto-refresh
    }, 20000);
    
    // Add window focus event listener to refresh when user returns to tab
    const handleWindowFocus = () => {
      const now = new Date().getTime();
      const lastRefresh = lastRefreshTime?.getTime() || 0;
      if (now - lastRefresh > 10000) {
        fetchData(false, true);
      }
    };
    
    window.addEventListener('focus', handleWindowFocus);
    
    // Cleanup interval and event listener on unmount or event change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [API_BASE_URL, selectedAnnkutEvent]);

  const rows = useMemo(() => {
    if (debugMode) console.debug('Computing SectionNosSummary rows', { fillPlans, nosEntries, recipes, weights, cachedRows });
    // Create a mapping of nos entries by vasan-food combination
    const keyFor = (vasanId:number, foodName:string) => `${vasanId}::${(foodName||'').toLowerCase()}`;
    const nosEntryMap = new Map<string, VasanNosEntry>();
    
    // Map individual food entries
    nosEntries.forEach(e => {
      if (e.foodName && !e.foodName.includes(',')) {
        // Individual food entry
        const k = keyFor(e.vasanId, e.foodName);
        nosEntryMap.set(k, e);
      }
    });
    
    // Map grouped entries separately
    const groupedEntries = new Map<string, VasanNosEntry>();
    nosEntries.forEach(e => {
      if (e.foodName && e.foodName.includes(',')) {
        const k = `grouped_${e.vasanId}_${e.foodName}`;
        groupedEntries.set(k, e);
        if (debugMode) console.debug('Registered grouped entry', { key: k, entry: e });
      }
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

    // Count how many times each vasan-food combination appears in fill plans
    const vasanFoodCounts = new Map<string, number>();
    const vasanFoodIndex = new Map<string, number>();
    
    fillPlans.forEach(plan => {
      plan.foodPlans.forEach(foodPlan => {
        const key = `${plan.vasanId}::${(foodPlan.foodName || '').toLowerCase()}`;
        vasanFoodCounts.set(key, (vasanFoodCounts.get(key) || 0) + 1);
      });
    });

    fillPlans.forEach(plan => {
      plan.foodPlans.forEach(foodPlan => {
        const foodKey = (foodPlan.foodName || '').trim().toLowerCase();
        const displayName = foodPlan.foodName || '';
        const vasanFoodKey = `${plan.vasanId}::${(foodPlan.foodName || '').toLowerCase()}`;
        
        // Track which occurrence this is for this vasan-food combination
        const currentIndex = vasanFoodIndex.get(vasanFoodKey) || 0;
        vasanFoodIndex.set(vasanFoodKey, currentIndex + 1);
        

        
        let planNos = 0;
        let planTotalWeightKg = 0;
        
        // Strategy: If there are multiple occurrences of the same vasan-food combination:
        // - First occurrence: Try individual entry first, then grouped
        // - Later occurrences: Try grouped entry first, then individual
        
        const preferGrouped = currentIndex > 0; // After first occurrence, prefer grouped
        
        let entryFound = false;
        
        if (preferGrouped) {
          // Try grouped first
          for (const [, groupedEntry] of groupedEntries) {
            if (groupedEntry.vasanId === plan.vasanId && groupedEntry.foodName) {
              const groupedFoods = groupedEntry.foodName.split(',').map(f => f.trim().toLowerCase());
              if (groupedFoods.includes((foodPlan.foodName||'').trim().toLowerCase())) {
                planNos = groupedEntry.totalVasan;
                const weightPerVasanKg = Number(foodPlan.fillWeightKg) || 0;
                planTotalWeightKg = planNos * weightPerVasanKg;
                entryFound = true;
                if (debugMode) console.debug('Matched grouped entry for plan', { planId: plan.id, foodPlan: foodPlan.foodName, groupedEntry });
                break;
              }
            }
          }
          
          // If no grouped entry found, try individual
          if (!entryFound) {
            const individualKey = keyFor(plan.vasanId, foodPlan.foodName);
            const individualEntry = nosEntryMap.get(individualKey);
            if (individualEntry) {
              planNos = individualEntry.totalVasan;
              const weightPerVasanKg = Number(foodPlan.fillWeightKg) || 0;
              planTotalWeightKg = planNos * weightPerVasanKg;
              entryFound = true;
              if (debugMode) console.debug('Matched individual entry for plan (preferGrouped fallback)', { individualKey, individualEntry });
            }
          }
        } else {
          // Try individual first  
          const individualKey = keyFor(plan.vasanId, foodPlan.foodName);
          const individualEntry = nosEntryMap.get(individualKey);
          if (individualEntry) {
            planNos = individualEntry.totalVasan;
            const weightPerVasanKg = Number(foodPlan.fillWeightKg) || 0;
            planTotalWeightKg = planNos * weightPerVasanKg;
            entryFound = true;
          }
          
          // If no individual entry found, try grouped
          if (!entryFound) {
            for (const [, groupedEntry] of groupedEntries) {
              if (groupedEntry.vasanId === plan.vasanId && groupedEntry.foodName) {
                const groupedFoods = groupedEntry.foodName.split(',').map(f => f.trim().toLowerCase());
                if (groupedFoods.includes((foodPlan.foodName||'').trim().toLowerCase())) {
                  planNos = groupedEntry.totalVasan;
                  const weightPerVasanKg = Number(foodPlan.fillWeightKg) || 0;
                  planTotalWeightKg = planNos * weightPerVasanKg;
                  entryFound = true;
                  if (debugMode) console.debug('Matched grouped entry for plan (individual fallback)', { planId: plan.id, foodPlan: foodPlan.foodName, groupedEntry });
                  break;
                }
              }
            }
          }
        }

        if (planTotalWeightKg > 0) {
          if (debugMode) console.debug('Plan contributes weight', { planId: plan.id, vasanId: plan.vasanId, food: foodPlan.foodName, planNos, planTotalWeightKg });
          // find recipe: special handling for 'મગજ'
          let recipe: RecipeEntry | undefined;
          if ((foodPlan.foodName || '').trim().startsWith('મગજ')) {
            recipe = recipes.find(r => r.vangiName.trim() === 'મગજ');
          } else {
            recipe = recipes.find(r => r.vangiName.toLowerCase() === (foodPlan.foodName||'').toLowerCase());
          }
          const flourForPlan = recipe && Number(recipe.items_per_kg) > 0 ? (planTotalWeightKg / Number(recipe.items_per_kg)) : 0;
          const gramPerPiece = weightMap.get((foodPlan.foodName||'').trim().toLowerCase()) || 0;
          const nangForPlan = gramPerPiece > 0 ? (planTotalWeightKg * 1000) / gramPerPiece : 0;

          if (!agg.has(foodKey)) {
            agg.set(foodKey, { id: plan.id, foodName: displayName, totalNos: planNos, totalWeightKg: planTotalWeightKg, flourRequiredKg: flourForPlan, totalNang: nangForPlan });
            if (debugMode) console.debug('Created agg entry', { foodKey, entry: agg.get(foodKey) });
          } else {
            const cur = agg.get(foodKey)!;
            // Don't accumulate nos anymore, just accumulate weights and calculations
            cur.totalWeightKg += planTotalWeightKg;
            cur.flourRequiredKg += flourForPlan;
            cur.totalNang += nangForPlan;
            if (debugMode) console.debug('Updated agg entry', { foodKey, entry: cur });
          }
        }
      });
    });

    if (debugMode) console.debug('Final aggregated map', Array.from(agg.entries()));
    // Convert agg map to array and sort by foodName
    const out = Array.from(agg.values()).map((v, idx) => ({ ...v, id: v.id || idx+1 }));
    out.sort((a,b) => (a.foodName||'').localeCompare(b.foodName || ''));
    if (debugMode) console.debug('Rows output', out);
    return out;
  }, [fillPlans, nosEntries, recipes, weights]);

  // Totals row removed per latest requirement; if needed later we can reintroduce.

  // Auto-save whenever calculated rows change (after data loaded) and differ from last saved snapshot.
  // Enhanced to be more aggressive about saving data immediately when changes are detected
  useEffect(() => {
    if (!selectedAnnkutEvent) return;
    if (loading) return; // wait until initial data load done
    if (!rows.length) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Build a lightweight signature to detect changes (avoid frequent identical saves)
    const signature = JSON.stringify(rows.map(r => ({ foodName: r.foodName, n: r.totalNos, tw: r.totalWeightKg, f: r.flourRequiredKg, tn: r.totalNang })));
    if (signature === lastSavedSignature) return;
    
    if (debugMode) console.debug('Auto-saving section nos summary due to data change', { rowCount: rows.length, signature: signature.substring(0, 100) + '...' });
    
    setAutoSaving(true);
    
    // Save immediately when data changes
    fetch(`${API_BASE_URL}/section-vasan-summary`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventId: selectedAnnkutEvent, rows })
    })
      .then(res => { 
        if (!res.ok) throw new Error('save failed'); 
        return res.json().catch(()=>null); 
      })
      .then(() => {
        setLastSavedSignature(signature);
        if (debugMode) console.debug('Section nos summary auto-saved successfully');
        
        // Refresh saved snapshot to ensure UI shows DB copy
        return fetch(`${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
          .then(r=> r.ok? r.json(): null)
          .then(saved => { 
            if (saved && Array.isArray(saved.rows)) {
              setCachedRows(saved.rows);
              if (debugMode) console.debug('Refreshed cached rows after auto-save', { rowCount: saved.rows.length });
            }
          });
      })
      .catch((error) => {
        console.error('Auto-save failed for section nos summary:', error);
        setSnackbar({ open:true, message:'Auto-save failed', severity:'error' });
      })
      .finally(() => setAutoSaving(false));
  }, [rows, selectedAnnkutEvent, loading, API_BASE_URL, lastSavedSignature, debugMode]);

  // Background service effect: Ensures data is calculated and saved even during background updates
  // This runs independently of the main component logic to guarantee database is always updated
  useEffect(() => {
    if (!selectedAnnkutEvent || loading || refreshing) return;
    if (!fillPlans.length && !nosEntries.length) return;
    
    // Only run this background service during auto-refresh cycles
    if (!lastRefreshTime) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Recalculate rows based on current data
    const currentRows = rows;
    if (!currentRows.length) return;
    
    // Check if we need to force a save (useful for background updates)
    const backgroundSignature = JSON.stringify(currentRows.map(r => ({ 
      foodName: r.foodName, 
      n: r.totalNos, 
      tw: r.totalWeightKg, 
      f: r.flourRequiredKg, 
      tn: r.totalNang 
    })));
    
    // If signature is different from what we last saved, ensure it gets saved
    if (backgroundSignature !== lastSavedSignature && !autoSaving) {
      if (debugMode) console.debug('Background service triggering save due to data drift');
      
      // Trigger a background save without UI indicators
      fetch(`${API_BASE_URL}/section-vasan-summary`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId: selectedAnnkutEvent, rows: currentRows })
      })
        .then(res => { 
          if (!res.ok) throw new Error('background save failed'); 
          return res.json().catch(() => null); 
        })
        .then(() => {
          setLastSavedSignature(backgroundSignature);
          if (debugMode) console.debug('Background service save completed');
          
          // Update cached rows silently
          return fetch(`${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`, { 
            credentials:'include', 
            headers:{ Authorization:`Bearer ${token}` }
          })
            .then(r => r.ok ? r.json() : null)
            .then(saved => { 
              if (saved && Array.isArray(saved.rows)) {
                setCachedRows(saved.rows);
              }
            });
        })
        .catch((error) => {
          if (debugMode) console.warn('Background service save failed:', error);
          // Don't show error to user for background saves
        });
    }
  }, [selectedAnnkutEvent, loading, refreshing, fillPlans, nosEntries, rows, lastRefreshTime, lastSavedSignature, autoSaving, API_BASE_URL, debugMode]);

  // Always prefer cachedRows (DB snapshot) if present so we display what's persisted
  // But compute totalNang on the fly if missing in snapshot
  const displayRows = useMemo(() => {
    // Prefer cachedRows only when it appears at least as comprehensive as computed rows.
    // This avoids an out-of-date saved snapshot (e.g., from server) hiding computed foods.
    const base = (cachedRows.length && cachedRows.length >= rows.length) ? cachedRows : rows;
    if (debugMode) console.debug('displayRows decision', { cachedRowsLength: cachedRows.length, computedRowsLength: rows.length, using: base === cachedRows ? 'cachedRows' : 'rows' });
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
        <Box sx={{ ml:'auto', display:'flex', gap:1, alignItems:'center', flexDirection: { xs: 'column', sm: 'row' } }}>
          {autoSaving && <Typography variant='caption' sx={{ color:'#245D6B' }}>Auto-saving...</Typography>}
          {refreshing && <Typography variant='caption' sx={{ color:'#245D6B' }}>Refreshing...</Typography>}
          {lastRefreshTime && !refreshing && (
            <Typography variant='caption' sx={{ color:'#666', fontSize: '0.75rem' }}>
              Last updated: {lastRefreshTime.toLocaleTimeString()}
            </Typography>
          )}
          <Button 
            variant='outlined' 
            size='small'
            disabled={loading || refreshing} 
            sx={{ borderColor:'#245D6B', color:'#245D6B' }} 
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button variant='outlined' disabled={!displayRows.length} sx={{ borderColor:'#245D6B', color:'#245D6B' }} onClick={()=> setPrintOpen(true)}>Print</Button>
          <Button variant='text' size='small' onClick={async () => {
            if (!selectedAnnkutEvent) return;
            const token = localStorage.getItem('token'); if (!token) return;
            try {
              const res = await fetch(`${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }});
              if (res.ok) {
                const saved = await res.json(); if (saved && Array.isArray(saved.rows)) setCachedRows(saved.rows);
                if (debugMode) console.debug('Refreshed cachedRows', saved);
              }
            } catch (e) { if (debugMode) console.debug('Refresh failed', e); }
          }} sx={{ color:'#245D6B' }}>Refresh Snapshot</Button>
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
      {debugMode && (
        <Box sx={{ mt: 2, p: 1, border: '1px dashed #ccc', borderRadius: 1, background: '#fafafa', fontSize: 12 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#333' }}>Debug (visible only with ?debug=1)</Typography>
          <pre style={{ maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify({ fillPlans, nosEntries, recipes, weights, rows, cachedRows }, null, 2)}</pre>
        </Box>
      )}
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
