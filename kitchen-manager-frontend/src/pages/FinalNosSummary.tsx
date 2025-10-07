import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, CircularProgress, Button, Dialog, DialogTitle, DialogContent, Snackbar, Alert, TextField } from '@mui/material';
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

interface RecipeEntry { vangiName: string; items_per_kg: number }

interface ExtraEntry {
  foodName: string;
  extraWeight: number;
  extraNang: number;
  extraFlour: number;
}

const FinalNosSummary: React.FC = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const [loading, setLoading] = useState(false);
  const [annkutRows, setAnnkutRows] = useState<any[]>([]);
  const [sectionRows, setSectionRows] = useState<any[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedSignature, setLastSavedSignature] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [cachedRows, setCachedRows] = useState<SummaryRow[]>([]);
  const inFlightSave = useRef<string>('');
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [recipes, setRecipes] = useState<RecipeEntry[]>([]);
  const [extraEntries, setExtraEntries] = useState<Map<string, ExtraEntry>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<number | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Function to fetch all data
  const fetchData = async (showLoader = true, isAutoRefresh = false) => {
    if (!selectedAnnkutEvent) {
      setAnnkutRows([]);
      setSectionRows([]);
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    
    try {
      const annkutUrl = `${API_BASE_URL}/annkut-sidhu-saman/?eventId=${selectedAnnkutEvent}`;
      const sectionUrl = `${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`;
      console.log('Fetching Annkut URL:', annkutUrl);
      console.log('Fetching Section URL:', sectionUrl);
      
      const [annkutData, sectionData, weightData, recipeData] = await Promise.all([
        fetch(annkutUrl, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
          .then(async r => {
            if (!r.ok) return null;
            const ct = r.headers.get('content-type');
            if (ct && ct.includes('application/json')) return await r.json();
            return null;
          }),
        fetch(sectionUrl, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
          .then(async r => {
            if (!r.ok) return null;
            const ct = r.headers.get('content-type');
            if (ct && ct.includes('application/json')) return await r.json();
            return null;
          }),
        fetch(`${API_BASE_URL}/weight-entries?eventId=${selectedAnnkutEvent}`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/recipe`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : [])
      ]);

      console.log('FULL Annkut API Response:', annkutData);
      const annkut = Array.isArray(annkutData) ? annkutData : [];
      const section = Array.isArray(sectionData?.rows) ? sectionData.rows : [];
      console.log('RAW annkutRows:', annkut);
      console.log('RAW sectionRows:', section);
      
      // Check if data has changed for auto-refresh notifications
      const currentAnnkutSignature = JSON.stringify(annkut);
      const currentSectionSignature = JSON.stringify(section);
      const prevAnnkutSignature = JSON.stringify(annkutRows);
      const prevSectionSignature = JSON.stringify(sectionRows);
      
      const dataHasChanged = currentAnnkutSignature !== prevAnnkutSignature || currentSectionSignature !== prevSectionSignature;
      
      setAnnkutRows(annkut);
      setSectionRows(section);
      setWeights(Array.isArray(weightData) ? weightData : []);
      setRecipes(Array.isArray(recipeData) ? recipeData : []);

      // Show notification if data changed during auto-refresh
      if (isAutoRefresh && dataHasChanged && (annkutRows.length > 0 || sectionRows.length > 0)) {
        setSnackbar({ open: true, message: 'Data updated automatically', severity: 'success' });
      }

      // Fetch saved snapshot (if backend endpoint exists)
      const saved = await fetch(`${API_BASE_URL}/final-nos-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      if (saved && Array.isArray(saved.rows)) {
        // sanitize and preserve extra fields
        const rows: SummaryRow[] = saved.rows.map((r: any) => ({
          foodName: String(r.foodName || ''),
          totalWeightKg: Number(r.totalWeightKg) || 0,
          totalNang: Number(r.totalNang) || 0,
          finalFlour: Number(r.finalFlour) || 0,
          // Note: SummaryRow type doesn't currently declare extras; we'll store them in extraEntries map below
        }));
        setCachedRows(rows);

        // initialize extraEntries map from saved rows if extras exist
        const extrasMap = new Map<string, ExtraEntry>();
        saved.rows.forEach((r: any) => {
          const name = String(r.foodName || '').trim();
          const ew = Number(r.extraWeight) || 0;
          const en = Number(r.extraNang) || 0;
          const ef = Number(r.extraFlour) || 0;
          if (ew > 0 || en > 0 || ef > 0) {
            extrasMap.set(name, { foodName: name, extraWeight: ew, extraNang: en, extraFlour: ef });
          }
        });
        if (extrasMap.size) setExtraEntries(extrasMap);
      } else {
        setCachedRows([]);
      }
      
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      if (isAutoRefresh) {
        // Don't show error notifications for auto-refresh failures
        console.warn('Auto-refresh failed, will retry on next interval');
      }
    } finally {
      if (showLoader) setLoading(false);
      else setRefreshing(false);
    }
  };

  // Manual refresh removed (server-side autosync handles updates)

  useEffect(() => {
    console.log('Selected Annkut Event:', selectedAnnkutEvent);
    // reset event-scoped state when event changes to avoid showing previous event data
    setCachedRows([]);
    setExtraEntries(new Map());
    setLastSavedSignature('');
    inFlightSave.current = '';
    
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    if (!selectedAnnkutEvent) {
      setAnnkutRows([]);
      setSectionRows([]);
      return;
    }
    
    // Initial fetch
    fetchData(true);
    
    // Set up polling every 30 seconds to check for updates
    refreshIntervalRef.current = window.setInterval(() => {
      fetchData(false, true); // false = don't show loader, true = is auto-refresh
    }, 30000);
    
    // Add window focus event listener to refresh when user returns to tab
    const handleWindowFocus = () => {
      // Only refresh if it's been more than 10 seconds since last refresh
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
  }, [API_BASE_URL, selectedAnnkutEvent]); // Removed lastRefreshTime from dependency array

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

  // prefer cachedRows only when it looks as comprehensive as computed summaryRows
  const baseRows: SummaryRow[] = (cachedRows && cachedRows.length && cachedRows.length >= summaryRows.length) ? cachedRows : summaryRows;
  const displayRows: SummaryRow[] = baseRows.map(r => {
    let tw = Number(r.totalWeightKg) || 0;
    const tn = Number(r.totalNang) || 0;
    if ((!tw || !isFinite(tw)) && tn > 0) {
      const gram = weightMap.get(getBaseName(r.foodName)) || weightMap.get(String(r.foodName || '').trim().toLowerCase()) || 0;
      if (gram > 0) tw = (tn * gram) / 1000;
    }
    return { ...r, totalWeightKg: tw };
  });

  // Helper to update extra entries with automatic calculations (using SectionNosSummary logic)
  const updateExtraEntry = (foodName: string, field: 'extraWeight' | 'extraNang' | 'extraFlour', value: number) => {
    setExtraEntries(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(foodName) || { foodName, extraWeight: 0, extraNang: 0, extraFlour: 0 };
      
      // Get the gram per piece for calculations (same as SectionNosSummary)
      const gram = weightMap.get(normalizeName(foodName)) || weightMap.get(getBaseName(foodName)) || 0;
      
      // Find recipe (same logic as SectionNosSummary)
      let recipe: RecipeEntry | undefined;
      if (foodName.trim().startsWith('મગજ')) {
        recipe = recipes.find(r => r.vangiName.trim() === 'મગજ');
      } else {
        recipe = recipes.find(r => r.vangiName.toLowerCase() === foodName.toLowerCase());
      }
      const itemsPerKg = recipe ? Number(recipe.items_per_kg) : 1;
      
      // Create new entry with updated field
      const newEntry = { ...existing, [field]: value };
      
      if (field === 'extraWeight' && value > 0) {
        // Weight changed -> calculate nang and flour (SectionNosSummary logic)
        // Nang calculation: nang = (weight_kg * 1000) / gram_per_piece
        const nang = gram > 0 ? (value * 1000) / gram : 0;
        // Flour calculation: flour = weight_kg / items_per_kg
        const flour = itemsPerKg > 0 ? value / itemsPerKg : 0;
        newEntry.extraNang = Math.round(nang * 100) / 100;
        newEntry.extraFlour = Math.round(flour * 100) / 100;
      } else if (field === 'extraNang' && value > 0) {
        // Nang changed -> calculate weight and flour
        // Weight calculation: weight = (nang * gram_per_piece) / 1000
        const weight = gram > 0 ? (value * gram) / 1000 : 0;
        // Flour calculation: flour = weight / items_per_kg
        const flour = itemsPerKg > 0 ? weight / itemsPerKg : 0;
        newEntry.extraWeight = Math.round(weight * 100) / 100;
        newEntry.extraFlour = Math.round(flour * 100) / 100;
      } else if (field === 'extraFlour' && value > 0) {
        // Flour changed -> calculate weight and nang
        // Weight calculation: weight = flour * items_per_kg
        const weight = value * itemsPerKg;
        // Nang calculation: nang = (weight * 1000) / gram_per_piece
        const nang = gram > 0 ? (weight * 1000) / gram : 0;
        newEntry.extraWeight = Math.round(weight * 100) / 100;
        newEntry.extraNang = Math.round(nang * 100) / 100;
      }
      
      // If value is 0 or negative, clear all fields
      if (value <= 0) {
        newEntry.extraWeight = 0;
        newEntry.extraNang = 0;
        newEntry.extraFlour = 0;
      }
      
      newMap.set(foodName, newEntry);
      return newMap;
    });
  };

  // Formatting helpers
  const fmtKg = (n: number) => (n && isFinite(n) && n > 0 ? `${n.toFixed(2)} kg` : '-');
  const fmtNos = (n: number) => (n && isFinite(n) && n > 0 ? `${Math.round(n)} nos` : '-');
  const groupDivider = '1.5px solid #245D6B';
  // Header-specific borders so grid lines are visible on dark header background (lighter and thinner)
  const headerBorder = '0.5px solid rgba(255,255,255,0.6)';
  const headerGroupDivider = '1px solid rgba(255,255,255,0.7)';
  // Colors used for source highlighting
  const annkutBg = '#E8F6FF'; // light blue
  const sectionBg = '#E8FFF0'; // light green

  useEffect(() => {
    if (!selectedAnnkutEvent) return;
    if (loading) return;
    if (!summaryRows.length) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    // include extras in signature so updating only extras still triggers save
    const signature = JSON.stringify(summaryRows.map(r => {
      const extras = extraEntries.get(r.foodName) || { extraWeight: 0, extraNang: 0, extraFlour: 0 };
      return {
        f: r.foodName,
        tw: r.totalWeightKg,
        tn: r.totalNang,
        ff: r.finalFlour,
        ew: Number(extras.extraWeight) || 0,
        en: Number(extras.extraNang) || 0,
        ef: Number(extras.extraFlour) || 0,
      };
    }));
    if (signature === lastSavedSignature) return;
    if (inFlightSave.current === signature) return; // prevent duplicate concurrent save
    inFlightSave.current = signature;
    setAutoSaving(true);
    // attach extras from extraEntries to rows before saving
    const rowsToSave = summaryRows.map(r => {
      const extras = extraEntries.get(r.foodName) || { extraWeight: 0, extraNang: 0, extraFlour: 0 };
      const ew = Number(extras.extraWeight) || 0;
      const en = Number(extras.extraNang) || 0;
      const ef = Number(extras.extraFlour) || 0;
      // Save aggregated values so database reflects final displayed totals
      return {
        foodName: r.foodName,
        totalWeightKg: Number(r.totalWeightKg || 0) + ew,
        totalNang: Number(r.totalNang || 0) + en,
        finalFlour: Number(r.finalFlour || 0) + ef,
        extraWeight: ew,
        extraNang: en,
        extraFlour: ef,
      };
    });

    fetch(`${API_BASE_URL}/final-nos-summary`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventId: selectedAnnkutEvent, rows: rowsToSave })
    })
      .then(res => { if (!res.ok) throw new Error('save failed'); return res.json().catch(() => null); })
      .then(() => {
        setLastSavedSignature(signature);
        // Refresh snapshot
        return fetch(`${API_BASE_URL}/final-nos-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(saved => {
            if (saved && Array.isArray(saved.rows)) {
              // update cached rows and extras map
              const rows: SummaryRow[] = saved.rows.map((r: any) => ({
                foodName: String(r.foodName || ''),
                totalWeightKg: Number(r.totalWeightKg) || 0,
                totalNang: Number(r.totalNang) || 0,
                finalFlour: Number(r.finalFlour) || 0,
              }));
              setCachedRows(rows);
              const extrasMap = new Map<string, ExtraEntry>();
              saved.rows.forEach((r: any) => {
                const name = String(r.foodName || '').trim();
                const ew = Number(r.extraWeight) || 0;
                const en = Number(r.extraNang) || 0;
                const ef = Number(r.extraFlour) || 0;
                if (ew > 0 || en > 0 || ef > 0) {
                  extrasMap.set(name, { foodName: name, extraWeight: ew, extraNang: en, extraFlour: ef });
                }
              });
              if (extrasMap.size) setExtraEntries(extrasMap);
            }
          });
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Auto-save failed (endpoint missing?)', severity: 'error' });
      })
      .finally(() => { setAutoSaving(false); if (inFlightSave.current === signature) inFlightSave.current = ''; });
  }, [summaryRows, selectedAnnkutEvent, loading, API_BASE_URL, lastSavedSignature]);

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SummarizeIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
        <Typography variant='h5' sx={{ color: '#245D6B', fontWeight: 700 }}>Final Nos Summary</Typography>
        {selectedEventDetails && <Typography variant='body1' sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
          {autoSaving && <Typography variant='caption' sx={{ color: '#245D6B' }}>Auto-saving...</Typography>}
          {refreshing && <Typography variant='caption' sx={{ color: '#245D6B' }}>Refreshing...</Typography>}
          {/* Last updated timestamp removed - UI now relies on auto-save/refresh indicators */}
          <Button variant='outlined' disabled={!displayRows.length} sx={{ borderColor: '#245D6B', color: '#245D6B' }} onClick={() => setPrintOpen(true)}>Print</Button>
        </Box>
      </Box>
      <Paper elevation={3} sx={{ p: 2, opacity: selectedAnnkutEvent ? 1 : 0.5, pointerEvents: selectedAnnkutEvent ? 'auto' : 'none' }}>
        {!selectedAnnkutEvent ? (
          <Box sx={{ textAlign: 'center', py: 6, fontStyle: 'italic', color: '#245D6B' }}>Select an Annkut event first</Box>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : displayRows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, fontStyle: 'italic', color: '#999' }}>No data available</Box>
        ) : (
          <TableContainer sx={{ position: 'relative', maxHeight: '70vh' }}>
            <Table stickyHeader sx={{ border: '1px solid #245D6B', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', '& td': { border: '0.5px solid #245D6B' }, '& tbody td': { borderTop: 0 } }}>
                {/* Fixed column widths: 1 name column + 12 data columns (4 groups x 3 cols) */}
                <colgroup>
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                </colgroup>
              <TableHead sx={{
                position: 'sticky',
                top: 0,
                zIndex: 3,
                // Full outer border around the sticky header block
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: '1px solid #245D6B',
                  borderBottom: 0,
                  pointerEvents: 'none',
                  zIndex: 4
                },
                // Persistent bottom border for the whole header block
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderBottom: '1px solid #245D6B',
                  pointerEvents: 'none',
                  zIndex: 4
                },
                // Header cell internals: subtle vertical dividers
                '& th': {
                  border: '0 !important',
                  backgroundClip: 'padding-box',
                  boxShadow: 'inset -1px 0 rgba(255,255,255,0.6)'
                },
                // Bottom border under the grouped header (first header row)
                '& tr:first-of-type th': {
                  boxShadow: 'inset -1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.7)'
                },
                '& .MuiTableCell-head': { borderBottom: '0 !important' }
              }}>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ position: 'sticky', left: 0, zIndex: 4, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', verticalAlign: 'middle' }}>Food Name</TableCell>
                  <TableCell colSpan={3} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', zIndex: 3 }}>Box-wise Annkut</TableCell>
                  <TableCell colSpan={3} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', zIndex: 3 }}>Section-wise Annkut</TableCell>
                  <TableCell colSpan={3} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', zIndex: 3 }}>Extra</TableCell>
                  <TableCell colSpan={3} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', zIndex: 3 }}>Final Summary</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Total Nang</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Required Flour (Kg)</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Total Nang</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Required Flour (Kg)</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Extra Weight (Kg)</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Extra Nang</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Extra Flour (Kg)</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Total Nang</TableCell>
                  <TableCell sx={{ position: 'sticky', top: 56, zIndex: 3, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Required Flour (Kg)</TableCell>
                </TableRow>
              </TableHead>
              {/* table body remains */}
              <TableBody>
                {allFoods.map((key, i) => {
                  const a = annkutMap.get(key);
                  const s = sectionMap.get(key);
                  const annkutRow = a?.row;
                  const sectionRow = s?.row;
                  const displayName = s?.name || a?.name || key;

                  // Annkut values
                  let aWeight = annkutRow ? Number(annkutRow.total_weight) || 0 : 0;
                  const aNang = annkutRow ? Number(annkutRow.total_nang) || 0 : 0;
                  const aFlour = annkutRow ? Number(annkutRow.total_flour) || 0 : 0;
                  if ((!aWeight || !isFinite(aWeight)) && aNang > 0) {
                    const gram = weightMap.get(normalizeName(displayName)) || weightMap.get(getBaseName(displayName)) || 0;
                    if (gram > 0) aWeight = (aNang * gram) / 1000;
                  }

                  // Section values
                  let sWeight = sectionRow ? Number(sectionRow.totalWeightKg) || 0 : 0;
                  const sNang = sectionRow ? Number(sectionRow.totalNang) || 0 : 0;
                  const sFlour = sectionRow ? Number(sectionRow.flourRequiredKg) || 0 : 0;
                  if ((!sWeight || !isFinite(sWeight)) && sNang > 0) {
                    const gram = weightMap.get(normalizeName(displayName)) || weightMap.get(getBaseName(displayName)) || 0;
                    if (gram > 0) sWeight = (sNang * gram) / 1000;
                  }

                  // Extra values
                  const extra = extraEntries.get(displayName) || { foodName: displayName, extraWeight: 0, extraNang: 0, extraFlour: 0 };
                  const eWeight = Number(extra.extraWeight) || 0;
                  const eNang = Number(extra.extraNang) || 0;
                  const eFlour = Number(extra.extraFlour) || 0;

                  // Final values (include extra values)
                  let baseWeight: number = 0;
                  let baseNang: number = 0;
                  let baseFlour = Math.max(aFlour, sFlour);
                  if (aFlour >= sFlour) {
                    baseWeight = aWeight;
                    baseNang = aNang;
                  } else {
                    baseWeight = sWeight;
                    baseNang = sNang;
                  }
                  if ((!baseWeight || !isFinite(baseWeight)) && baseNang > 0) {
                    const gram = weightMap.get(normalizeName(displayName)) || weightMap.get(getBaseName(displayName)) || 0;
                    if (gram > 0) baseWeight = (baseNang * gram) / 1000;
                  }

                  const fWeight = baseWeight + eWeight;
                  const fNang = baseNang + eNang;
                  const fFlour = baseFlour + eFlour;

                  const picked = aFlour >= sFlour ? 'annkut' : 'section';
                  const finalBg = picked === 'annkut' ? annkutBg : sectionBg;

                  return (
                    <TableRow key={`all-${displayName}-${i}`}>
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', textAlign: 'center', borderRight: groupDivider }}>{displayName}</TableCell>
                        <TableCell sx={{ textAlign: 'center', background: annkutBg }}>{fmtKg(aWeight)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', background: annkutBg }}>{fmtNos(aNang)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', borderRight: groupDivider, background: annkutBg }}>{fmtKg(aFlour)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', background: sectionBg }}>{fmtKg(sWeight)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', background: sectionBg }}>{fmtNos(sNang)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', borderRight: groupDivider, background: sectionBg }}>{fmtKg(sFlour)}</TableCell>
                      <TableCell sx={{ textAlign: 'center', p: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={eWeight || ''}
                          onChange={(e) => updateExtraEntry(displayName, 'extraWeight', Number(e.target.value) || 0)}
                          sx={{ 
                            width: '80px',
                            '& .MuiOutlinedInput-root': { 
                              height: '32px',
                              fontSize: '0.875rem'
                            }
                          }}
                          inputProps={{ step: 0.01, min: 0 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', p: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={eNang || ''}
                          onChange={(e) => updateExtraEntry(displayName, 'extraNang', Number(e.target.value) || 0)}
                          sx={{ 
                            width: '80px',
                            '& .MuiOutlinedInput-root': { 
                              height: '32px',
                              fontSize: '0.875rem'
                            }
                          }}
                          inputProps={{ step: 1, min: 0 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', borderRight: groupDivider, p: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={eFlour || ''}
                          onChange={(e) => updateExtraEntry(displayName, 'extraFlour', Number(e.target.value) || 0)}
                          sx={{ 
                            width: '80px',
                            '& .MuiOutlinedInput-root': { 
                              height: '32px',
                              fontSize: '0.875rem'
                            }
                          }}
                          inputProps={{ step: 0.01, min: 0 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', background: finalBg }}>{fmtKg(fWeight)}</TableCell>
                      <TableCell sx={{ textAlign: 'center', background: finalBg }}>{fmtNos(fNang)}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: '#245D6B', background: finalBg }}>{fmtKg(fFlour)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Print dialog */}
      <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth='xl' fullWidth>
        <DialogTitle>Final Nos Summary Print</DialogTitle>
        <DialogContent dividers sx={{ '@media print': { bgcolor: '#fff', p: 2 } }}>
          <Box sx={{ mb: 3, borderBottom: '2px solid #245D6B', pb: 1.5, '@media print': { mb: 2, pb: 1, borderBottom: '2px solid #245D6B' } }}>
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#245D6B', letterSpacing: 1, '@media print': { color: '#245D6B', fontSize: 26 } }}>Final Nos Summary Report</Typography>
            <Typography variant='body2' sx={{ color: '#555', mt: 0.5, '@media print': { color: '#000' } }}>
              {new Date().toLocaleDateString()} | Powered by Kitchen Manager
              {selectedEventDetails && <> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</>}
            </Typography>
          </Box>
          {/* Print: One combined table */}
          <TableContainer sx={{ width: '100%', boxShadow: 'none', '@media print': { width: '100%', overflow: 'visible' } }}>
            <Table stickyHeader sx={{
              border: '1px solid #245D6B',
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              '& th, & td': { border: '1px solid #245D6B' },
              '& tbody td': { borderTop: 0 },
              fontSize: 13,
              '@media print': {
                fontSize: 12,
                borderCollapse: 'collapse',
                borderSpacing: '0 !important',
                '& th, & td': { border: '1px solid #245D6B !important' },
                '& tbody td': { borderRight: '1px solid #245D6B !important' },
                '& thead th': { borderRight: '1px solid #245D6B !important' }
              }
            }}>
              {/* Fixed column widths for print table */}
              <colgroup>
                <col style={{ width: '220px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
              </colgroup>
              <TableHead sx={{
                '& th': {
                  border: headerBorder,
                  backgroundClip: 'padding-box',
                  borderBottom: 0,
                  '@media print': {
                    position: 'static !important',
                    background: '#fff !important',
                    color: '#000 !important',
                    border: '1px solid #245D6B !important',
                    borderRight: '1px solid #245D6B !important',
                    borderBottom: '1px solid #245D6B !important'
                  }
                },
                '@media print': {
                  position: 'static !important',
                  top: 'auto !important'
                },
                // Stronger divider below the grouped header row in print
                '& tr:first-of-type th': {
                  '@media print': {
                    borderBottom: '1.5px solid #245D6B !important'
                  }
                },
                '& .MuiTableCell-head': {
                  borderBottom: '0 !important',
                  '@media print': {
                    borderBottom: '1px solid #245D6B !important'
                  }
                }
              }}>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, borderBottom: 0, verticalAlign: 'middle', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Food Name</TableCell>
                  <TableCell colSpan={3} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', borderRight: headerGroupDivider, border: headerBorder, borderBottom: 0, '@media print': { background: '#fff !important', color: '#000 !important', borderRight: '1px solid #245D6B !important' } }}>Box-wise Annkut</TableCell>
                  <TableCell colSpan={3} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', borderRight: headerGroupDivider, border: headerBorder, borderBottom: 0, '@media print': { background: '#fff !important', color: '#000 !important', borderRight: '1px solid #245D6B !important' } }}>Section-wise Annkut</TableCell>
                  <TableCell colSpan={3} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', borderRight: headerGroupDivider, border: headerBorder, borderBottom: 0, '@media print': { background: '#fff !important', color: '#000 !important', borderRight: '1px solid #245D6B !important' } }}>Extra</TableCell>
                  <TableCell colSpan={3} sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, borderBottom: 0, '@media print': { background: '#fff !important', color: '#000 !important' } }}>Final Summary</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Total Nang</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', borderRight: headerGroupDivider, border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important', borderRight: '1px solid #245D6B !important' } }}>Required Flour (Kg)</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Total Nang</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', borderRight: headerGroupDivider, border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important', borderRight: '1px solid #245D6B !important' } }}>Required Flour (Kg)</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Extra Weight (Kg)</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Extra Nang</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', borderRight: headerGroupDivider, border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important', borderRight: '1px solid #245D6B !important' } }}>Extra Flour (Kg)</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Total Weight (Kg)</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Total Nang</TableCell>
                  <TableCell sx={{ background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center', border: headerBorder, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)', '@media print': { background: '#fff !important', color: '#000 !important' } }}>Required Flour (Kg)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allFoods.map((key, i) => {
                  const a = annkutMap.get(key);
                  const s = sectionMap.get(key);
                  const annkutRow = a?.row;
                  const sectionRow = s?.row;
                  const displayName = s?.name || a?.name || key;

                  // Annkut values
                  let aWeight = annkutRow ? Number(annkutRow.total_weight) || 0 : 0;
                  const aNang = annkutRow ? Number(annkutRow.total_nang) || 0 : 0;
                  const aFlour = annkutRow ? Number(annkutRow.total_flour) || 0 : 0;
                  if ((!aWeight || !isFinite(aWeight)) && aNang > 0) {
                    const gram = weightMap.get(normalizeName(displayName)) || weightMap.get(getBaseName(displayName)) || 0;
                    if (gram > 0) aWeight = (aNang * gram) / 1000;
                  }

                  // Section values
                  let sWeight = sectionRow ? Number(sectionRow.totalWeightKg) || 0 : 0;
                  const sNang = sectionRow ? Number(sectionRow.totalNang) || 0 : 0;
                  const sFlour = sectionRow ? Number(sectionRow.flourRequiredKg) || 0 : 0;
                  if ((!sWeight || !isFinite(sWeight)) && sNang > 0) {
                    const gram = weightMap.get(normalizeName(displayName)) || weightMap.get(getBaseName(displayName)) || 0;
                    if (gram > 0) sWeight = (sNang * gram) / 1000;
                  }

                  // Extra values
                  const extra = extraEntries.get(displayName) || { foodName: displayName, extraWeight: 0, extraNang: 0, extraFlour: 0 };
                  const eWeight = Number(extra.extraWeight) || 0;
                  const eNang = Number(extra.extraNang) || 0;
                  const eFlour = Number(extra.extraFlour) || 0;

                  // Final values (include extra values)
                  let baseWeight: number = 0;
                  let baseNang: number = 0;
                  let baseFlour = Math.max(aFlour, sFlour);
                  if (aFlour >= sFlour) {
                    baseWeight = aWeight;
                    baseNang = aNang;
                  } else {
                    baseWeight = sWeight;
                    baseNang = sNang;
                  }
                  if ((!baseWeight || !isFinite(baseWeight)) && baseNang > 0) {
                    const gram = weightMap.get(normalizeName(displayName)) || weightMap.get(getBaseName(displayName)) || 0;
                    if (gram > 0) baseWeight = (baseNang * gram) / 1000;
                  }

                  const fWeight = baseWeight + eWeight;
                  const fNang = baseNang + eNang;
                  const fFlour = baseFlour + eFlour;

                  const picked = aFlour >= sFlour ? 'annkut' : 'section';
                  const finalBg = picked === 'annkut' ? annkutBg : sectionBg;

                  return (
                    <TableRow key={`print-all-${displayName}-${i}`}>
                      <TableCell sx={{ textAlign: 'center', border: '1px solid #245D6B', borderRight: groupDivider, '@media print': { borderRight: '1px solid #245D6B !important' } }}>{displayName}</TableCell>
                        <TableCell sx={{ textAlign: 'center', border: '1px solid #245D6B', background: annkutBg }}>{fmtKg(aWeight)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600, border: '1px solid #245D6B', background: annkutBg }}>{fmtNos(aNang)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600, border: '1px solid #245D6B', borderRight: groupDivider, '@media print': { borderRight: '1px solid #245D6B !important' }, background: annkutBg }}>{fmtKg(aFlour)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', border: '1px solid #245D6B', background: sectionBg }}>{fmtKg(sWeight)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600, border: '1px solid #245D6B', background: sectionBg }}>{fmtNos(sNang)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600, border: '1px solid #245D6B', borderRight: groupDivider, '@media print': { borderRight: '1px solid #245D6B !important' }, background: sectionBg }}>{fmtKg(sFlour)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', border: '1px solid #245D6B' }}>{eWeight > 0 ? fmtKg(eWeight) : '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600, border: '1px solid #245D6B' }}>{eNang > 0 ? fmtNos(eNang) : '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600, border: '1px solid #245D6B', borderRight: groupDivider, '@media print': { borderRight: '1px solid #245D6B !important' } }}>{eFlour > 0 ? fmtKg(eFlour) : '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'center', border: '1px solid #245D6B', background: finalBg }}>{fmtKg(fWeight)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600, border: '1px solid #245D6B', background: finalBg }}>{fmtNos(fNang)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: '#245D6B', border: '1px solid #245D6B', background: finalBg }}>{fmtKg(fFlour)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2, pt: 1 }}>
          <Button onClick={() => window.print()} variant='contained' size='small' sx={{ bgcolor: '#245D6B', textTransform: 'none', '&:hover': { bgcolor: '#1d4b56' } }}>Print</Button>
          <Button onClick={() => setPrintOpen(false)} size='small' sx={{ color: '#245D6B', textTransform: 'none' }}>Close</Button>
        </Box>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default FinalNosSummary;
