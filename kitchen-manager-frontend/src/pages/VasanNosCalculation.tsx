import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import CalculateIcon from '@mui/icons-material/Calculate';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import { useApiBaseUrl } from '../config/config';

interface Vasan { id: number; vasanName: string; totalVasan: number; totalWeight: number; }
interface FoodPlan { foodName: string; fillWeightKg: number; }
interface VasanFillPlan { id:number; vasanId:number; foodPlans: FoodPlan[]; }
interface Section { id: number; sectionName: string; rows: number; columns: number; }

const VasanNosCalculation: React.FC = () => {
    const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
    const API_BASE_URL = useApiBaseUrl();
    const [vasans, setVasans] = useState<Vasan[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [fillPlans, setFillPlans] = useState<VasanFillPlan[]>([]);
    // counts map key: rowKey_sectionId where rowKey identifies specific vasan-food combination
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [entryId, setEntryId] = useState<number | null>(null);
    const [autoSaving, setAutoSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
    const [rawSavedEntries, setRawSavedEntries] = useState<any[] | null>(null); // store raw for remapping when fillPlans arrive
    // Enable a small on-page debug panel when ?debug=1 is present in the URL
    const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

    // Row key builder (unique for vasan + food) placed early so it can be reused in loaders
    const buildRowKey = (vasanId:number, foodName:string) => `${vasanId}::${(foodName || '').toLowerCase()}`;

    useEffect(() => {
        if (!selectedAnnkutEvent) { setVasans([]); setSections([]); setCounts({}); setEntryId(null); return; }
        const token = localStorage.getItem('token');
        if (!token) return;
        fetch(`${API_BASE_URL}/vasans?eventId=${selectedAnnkutEvent}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
            .then(r => r.json()).then(d => {
                if (debugMode) console.debug('fetch /vasans ->', d);
                setVasans(Array.isArray(d) ? d : []);
            });
        fetch(`${API_BASE_URL}/vasan-fill-plans?eventId=${selectedAnnkutEvent}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
            .then(r => r.json()).then(d => {
                if (debugMode) console.debug('fetch /vasan-fill-plans ->', d);
                setFillPlans(Array.isArray(d)? d: []);
            });
        fetch(`${API_BASE_URL}/api/sections?eventId=${selectedAnnkutEvent}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
            .then(r => r.json()).then(d => {
                if (debugMode) console.debug('fetch /api/sections ->', d);
                setSections(Array.isArray(d) ? d : []);
            });
        fetch(`${API_BASE_URL}/vasan-nos-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
            .then(r => r.json()).then(data => {
                if (debugMode) console.debug('fetch /vasan-nos-calculation-entries/latest ->', data);
                if (data && data.id && data.entries) {
                    setEntryId(data.id);
                    setRawSavedEntries(data.entries);
                } else { setEntryId(null); setCounts({}); }
            });
    }, [selectedAnnkutEvent, API_BASE_URL]);

    // When fillPlans (and potentially rawSavedEntries) are available, map saved counts to new keys.
    useEffect(() => {
        if (!rawSavedEntries || !fillPlans.length) {
            if (debugMode) console.debug('Skipping mapping: rawSavedEntries or fillPlans missing', { rawSavedEntries, fillPlansLength: fillPlans.length });
            return;
        }
        const map: Record<string, string> = {};
        if (debugMode) console.debug('Starting mapping rawSavedEntries -> counts', { rawSavedEntries, fillPlans });
        
        rawSavedEntries.forEach((v: any, idx: number) => {
            if (debugMode) console.debug(`Mapping entry #${idx}`, v);
            const savedFoodName = v.foodName; // may be undefined on legacy data or comma-separated for grouped entries
            
            if (savedFoodName) {
                if (savedFoodName.includes(',')) {
                    const savedFoods = savedFoodName.split(',').map((f: string) => f.trim());
                    if (debugMode) console.debug('Detected grouped savedFoodName', savedFoods);
                    const matchingFillPlan = fillPlans.find(fp => {
                        if (fp.vasanId !== v.vasanId) return false;
                        const fpFoods = fp.foodPlans.map((plan: any) => (plan.foodName || '').trim());
                        // Compare ignoring case/whitespace
                        return fpFoods.length === savedFoods.length && 
                               savedFoods.every((food: string) => fpFoods.some((p: string) => p.toLowerCase() === food.toLowerCase()));
                    });
                    if (debugMode) console.debug('matchingFillPlan for grouped', matchingFillPlan);
                    if (matchingFillPlan) {
                        v.sectionEntries?.forEach((s: any) => {
                            const key = `fillplan_${matchingFillPlan.id}_grouped_${s.sectionId}`;
                            map[key] = String(s.count);
                            if (debugMode) console.debug('Mapped grouped key', key, '->', s.count);
                        });
                    }
                } else {
                    v.sectionEntries?.forEach((s: any) => {
                        const key = `${buildRowKey(v.vasanId, savedFoodName)}_${s.sectionId}`;
                        map[key] = String(s.count);
                        if (debugMode) console.debug('Mapped single key', key, '->', s.count);
                    });
                }
            } else {
                // Legacy fallback: find matching fill plan for this vasan
                const relatedPlans = fillPlans.filter(fp => fp.vasanId === v.vasanId);
                if (debugMode) console.debug('Legacy fallback relatedPlans', relatedPlans.map(rp => ({ id: rp.id, foods: rp.foodPlans })), 'for vasanId', v.vasanId);
                if (relatedPlans.length === 1) {
                    const fp = relatedPlans[0];
                    if (fp.foodPlans.length === 1) {
                        v.sectionEntries?.forEach((s: any) => {
                            const key = `${buildRowKey(v.vasanId, fp.foodPlans[0].foodName)}_${s.sectionId}`;
                            map[key] = String(s.count);
                            if (debugMode) console.debug('Mapped legacy single key', key, '->', s.count);
                        });
                    } else if (fp.foodPlans.length > 1) {
                        v.sectionEntries?.forEach((s: any) => {
                            const key = `fillplan_${fp.id}_grouped_${s.sectionId}`;
                            map[key] = String(s.count);
                            if (debugMode) console.debug('Mapped legacy grouped key', key, '->', s.count);
                        });
                    }
                }
            }
        });
        if (debugMode) console.debug('Final mapped counts', map);
        setCounts({ ...map });
    }, [rawSavedEntries, fillPlans]);

    // Legacy alias for clarity in rest of component
    const rowKey = buildRowKey;

    const handleChange = (rowKeyStr: string, sectionId: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        setCounts(prev => ({ ...prev, [`${rowKeyStr}_${sectionId}`]: value }));
    };

    // Build row models - group by fill plan ID, multiple foods per fill plan show grouped
    const rows = React.useMemo(() => {
        const vasanMap = new Map(vasans.map(v => [v.id, v]));
        const result: any[] = [];
        
        // Create rows based on each fill plan
        fillPlans.forEach(fp => {
            const base = vasanMap.get(fp.vasanId);
            const vasanName = base?.vasanName || `Vasan ${fp.vasanId}`;
            const capacity = base?.totalVasan || 0;
            const foods = fp.foodPlans.map(plan => plan.foodName).filter(Boolean);
            
            if (foods.length === 1) {
                // Single food in this fill plan - create separate row
                result.push({
                    key: rowKey(fp.vasanId, foods[0]),
                    vasanId: fp.vasanId,
                    vasanName: vasanName,
                    foodName: foods[0],
                    capacity: capacity,
                    fillPlanId: fp.id,
                });
            } else if (foods.length > 1) {
                // Multiple foods in this fill plan - create grouped row
                const foodDisplay = foods.join(', ');
                result.push({
                    key: `fillplan_${fp.id}_grouped`,
                    vasanId: fp.vasanId,
                    vasanName: vasanName,
                    foodName: foodDisplay,
                    capacity: capacity,
                    fillPlanId: fp.id,
                    isGrouped: true,
                });
            }
        });
        
        return result;
    }, [fillPlans, vasans]);

    const buildPayload = () => {
        return rows.map(r => {
            const sectionEntries = sections.map(s => ({ sectionId: s.id, sectionName: s.sectionName, count: Number(counts[`${r.key}_${s.id}`]) || 0 })).filter(se => se.count > 0);
            const totalVasan = sectionEntries.reduce((sum, se) => sum + se.count, 0);
            if (sectionEntries.length === 0) return null;
            // For grouped entries, save the actual food names (comma-separated), for single entries save the actual food name
            const foodNameToSave = r.foodName || '';
            return { vasanId: r.vasanId, vasanName: r.vasanName, foodName: foodNameToSave, totalVasan, sectionEntries };
        }).filter(Boolean);
    };

    const saveTimeoutRef = React.useRef<number | null>(null);
    const inFlightSaveRef = React.useRef<string>('');
    const [lastSavedSignature, setLastSavedSignature] = React.useState<string>('');

    const getTotalForSection = (sectionId: number) => rows.reduce((sum, r) => sum + ((Number(counts[`${r.key}_${sectionId}`]) || 0)), 0);
    const getRowTotal = (rowKeyStr:string) => sections.reduce((sum, s) => sum + (Number(counts[`${rowKeyStr}_${s.id}`]) || 0), 0);

    // Validation calculations
    // Treat capacity 0 as "unlimited/unspecified" to avoid noisy warnings
    const rowOverages = rows.filter(r => r.capacity > 0 && getRowTotal(r.key) > r.capacity);
    const grandTotalEntered = rows.reduce((sum, r) => sum + getRowTotal(r.key), 0);
    const grandTotalAllowed = rows.filter(r => r.capacity > 0).reduce((sum, r) => sum + r.capacity, 0); // only count defined capacities
    // Per-section capacity based on rows * columns set in Section Master
    const sectionCapacities: Record<number, number> = sections.reduce((acc, s) => { acc[s.id] = (s.rows || 0) * (s.columns || 0); return acc; }, {} as Record<number, number>);
    const sectionOverages = sections.filter(s => getTotalForSection(s.id) > sectionCapacities[s.id]);
    const totalStructuralCapacity = Object.values(sectionCapacities).reduce((a, b) => a + b, 0);
    const hasGrandTotalOver = grandTotalAllowed > 0 && grandTotalEntered > grandTotalAllowed;
    const hasStructuralOver = grandTotalEntered > totalStructuralCapacity; // grand total exceeds sum of per-section capacities
    const validationWarnings: string[] = [];
    if (rowOverages.length) {
        rowOverages.forEach(r => {
            validationWarnings.push(`${r.vasanName}${r.foodName ? ` (${r.foodName.trim()})` : ''} exceeds total vasan (${getRowTotal(r.key)}/${r.capacity})`);
        });
    }
    if (sectionOverages.length) {
        sectionOverages.forEach(s => {
            validationWarnings.push(`Section ${s.sectionName} total ${getTotalForSection(s.id)} exceeds capacity ${sectionCapacities[s.id]} (rows ${s.rows} * columns ${s.columns})`);
        });
    }

    const uniqueWarnings = Array.from(new Set(validationWarnings));

    // Debounced autosave: watches counts and saves when they change and there are no validation warnings
    React.useEffect(() => {
        const signature = JSON.stringify(counts);
        if (signature === lastSavedSignature) return; // nothing new
        if (uniqueWarnings.length > 0) return; // don't autosave while there are warnings

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        saveTimeoutRef.current = window.setTimeout(async () => {
            // prevent duplicate saves
            if (inFlightSaveRef.current === signature) return;
            inFlightSaveRef.current = signature;
            setAutoSaving(true);

            const token = localStorage.getItem('token');
            if (!token || !selectedAnnkutEvent) {
                setAutoSaving(false);
                inFlightSaveRef.current = '';
                return;
            }

            try {
                const entries = buildPayload();
                if ((!entries || entries.length === 0) && !entryId) {
                    setLastSavedSignature(signature);
                    setAutoSaving(false);
                    inFlightSaveRef.current = '';
                    return;
                }

                const res = await fetch(`${API_BASE_URL}/vasan-nos-calculation-entries${entryId ? `/${entryId}` : ''}`, {
                    method: entryId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    credentials: 'include',
                    body: JSON.stringify({ entries, eventId: selectedAnnkutEvent })
                });

                if (res.ok) {
                    const data = await res.json().catch(() => null);
                    if (!entryId && data && data.id) setEntryId(data.id);
                    setLastSavedSignature(signature);
                } else {
                    console.warn('Autosave failed');
                    setSnackbar({ open: true, message: 'Auto-save failed', severity: 'error' });
                }
            } catch (e) {
                console.error('Autosave error', e);
                setSnackbar({ open: true, message: 'Auto-save error', severity: 'error' });
            } finally {
                setAutoSaving(false);
                inFlightSaveRef.current = '';
            }
        }, 800);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [counts, uniqueWarnings, selectedAnnkutEvent, API_BASE_URL, entryId, lastSavedSignature]);

    return (
        <Box sx={{ p: { xs: 2, sm: 1 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalculateIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
                    <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>Vasan Nos Calculation</Typography>
                    {selectedEventDetails && <Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {autoSaving && <Typography variant='caption' sx={{ color: '#245D6B' }}>Auto-saving...</Typography>}
                    <Button variant="outlined" sx={{ borderColor: '#245D6B', color: '#245D6B', fontWeight: 600, minWidth: 120 }} onClick={() => setPrintPreviewOpen(true)}>Print</Button>
                </Box>
            </Box>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, mx: 'auto', opacity: selectedAnnkutEvent ? 1 : 0.5, pointerEvents: selectedAnnkutEvent ? 'auto' : 'none', position: 'relative' }}>
                <TableContainer sx={{ overflowY: 'auto', overflowX: 'auto' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#245D6B', position: 'sticky', left: 0, top: 0, background: '#fff', zIndex: 3, minWidth: 200 }}>Vasan (Food)</TableCell>
                                {sections.map(section => (
                                    <TableCell key={section.id} align="center" sx={{ fontWeight: 700, color: '#245D6B', top: 0, background: '#fff', zIndex: 2 }}>{section.sectionName}</TableCell>
                                ))}
                                <TableCell align="center" sx={{ fontWeight: 700, color: '#245D6B', top: 0, background: '#fff', zIndex: 2 }}>Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map(r => {
                                const rowTotal = getRowTotal(r.key);
                                const over = r.capacity > 0 && rowTotal > r.capacity; // ignore highlight if capacity unspecified (0)
                                return (
                                    <TableRow key={r.key} sx={over ? { backgroundColor: '#ffeaea' } : undefined}>
                                        <TableCell sx={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                                            {r.vasanName}{r.foodName ? ` (${r.foodName.trim()})` : ''}
                                        </TableCell>
                                        {sections.map(section => {
                                            const key = `${r.key}_${section.id}`;
                                            return (
                                                <TableCell key={key} align="center">
                                                    <TextField type="number" size="small" value={counts[key] || ''} onChange={e => handleChange(r.key, section.id, e.target.value)} inputProps={{ min: 0, style: { width: 60, textAlign: 'center' } }} sx={{ mb: 0.5, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#245D6B' } }} />
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell align="center" sx={{ fontWeight: 600, color: over ? '#B71C1C' : '#245D6B' }}>{rowTotal}</TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow sx={{ position: 'sticky', bottom: 0, background: '#f5f5f5', zIndex: 2 }}>
                                <TableCell colSpan={1} sx={{ fontWeight: 700, color: '#245D6B', background: '#f5f5f5', position: 'sticky', left: 0, zIndex: 3 }}>Total Nos</TableCell>
                                {sections.map(section => {
                                    const secTotal = getTotalForSection(section.id);
                                    const overSec = secTotal > sectionCapacities[section.id];
                                    return (
                                        <TableCell key={section.id} align="center" sx={{ fontWeight: 700, color: overSec ? '#B71C1C' : '#245D6B', background: '#f5f5f5' }}>{secTotal}</TableCell>
                                    );
                                })}
                                <TableCell align="center" sx={{ fontWeight: 700, color: (hasGrandTotalOver || hasStructuralOver) ? '#B71C1C' : '#245D6B', background: '#f5f5f5' }}>{rows.reduce((sum, r) => sum + getRowTotal(r.key), 0)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
                {uniqueWarnings.length > 0 && (
                    <Box sx={{ mt: 2, p: 1.5, border: '1px solid #B71C1C', borderRadius: 1, background: '#fff5f5', color: '#B71C1C', fontSize: 14 }}>
                        <strong>Warnings:</strong>
                        <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                            {uniqueWarnings.map((w, i) => (<li key={i}>{w}</li>))}
                        </ul>
                        Fix the above before saving.
                    </Box>
                )}
            </Paper>
            {debugMode && (
                <Box sx={{ mt: 2, p: 1, border: '1px dashed #ccc', borderRadius: 1, background: '#fafafa', fontSize: 12 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#333' }}>Debug (visible only with ?debug=1)</Typography>
                    <pre style={{ maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify({ rawSavedEntries, fillPlans, counts }, null, 2)}</pre>
                </Box>
            )}
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <MuiAlert elevation={6} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</MuiAlert>
            </Snackbar>
            <Dialog open={printPreviewOpen} onClose={() => setPrintPreviewOpen(false)} maxWidth="xl" fullWidth>
                <DialogTitle>
                    Print Preview
                    <Button variant="contained" sx={{ float: 'right', bgcolor: '#245D6B', ml: 2 }} onClick={() => window.print()}>Print</Button>
                </DialogTitle>
                <DialogContent>
                    <Box id="vasan-nos-calculation-print">
                        <div style={{ textAlign: 'left', marginBottom: 24, borderBottom: '2px solid #245D6B', paddingBottom: 12 }}>
                            <h1 style={{ color: '#245D6B', margin: 0, fontSize: 32, letterSpacing: 2, fontWeight: 700 }}>Vasan Nos Calculation Report</h1>
                            <div style={{ color: '#555', fontSize: 16, marginTop: 4 }}>
                                {new Date().toLocaleDateString()} | Powered by Kitchen Manager
                                {selectedEventDetails && <span> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</span>}
                            </div>
                        </div>
                        {vasans.length === 0 || sections.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic', padding: 40, fontSize: 16 }}>No data available for printing.</div>
                        ) : (
                            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 20 }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: '1px solid #ccc', padding: 8, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Vasan (Food)</th>
                                        {sections.map(s => (
                                            <th key={s.id} style={{ border: '1px solid #ccc', padding: 8, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>{s.sectionName}</th>
                                        ))}
                                        <th style={{ border: '1px solid #ccc', padding: 8, background: '#245D6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(r => (
                                        <tr key={r.key}>
                                            <td style={{ border: '1px solid #ccc', padding: 8 }}>{r.vasanName}{r.foodName ? ` (${r.foodName.trim()})` : ''}</td>
                                            {sections.map(s => (
                                                <td key={s.id} style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{counts[`${r.key}_${s.id}`] || '0'}</td>
                                            ))}
                                            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center', fontWeight: 600, color: '#245D6B' }}>{getRowTotal(r.key)}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: 8, fontWeight: 700, color: '#245D6B', background: '#f5f5f5' }}>Total Nos</td>
                                        {sections.map(s => (
                                            <td key={s.id} style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center', fontWeight: 700, color: '#245D6B', background: '#f5f5f5' }}>{getTotalForSection(s.id)}</td>
                                        ))}
                                        <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center', fontWeight: 700, color: '#245D6B', background: '#f5f5f5' }}>{rows.reduce((sum, r) => sum + getRowTotal(r.key), 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPrintPreviewOpen(false)} sx={{ color: '#245D6B', fontWeight: 600 }}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default VasanNosCalculation;
