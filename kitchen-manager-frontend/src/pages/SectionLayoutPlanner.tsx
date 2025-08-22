import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, IconButton, Divider, FormControl, InputLabel, Select, MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress } from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import { useApiBaseUrl } from '../config/config';

interface VasanOption { fillPlanId:number; vasanId:number; vasanName:string; foodName?:string; }
interface CellData { id:string; vasanId?:number; }
interface Section { id:number; sectionName:string; rows:number; columns:number; }

const SectionLayoutPlanner: React.FC = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | ''>('');
  const [rows, setRows] = useState<number>(0);
  const [cols, setCols] = useState<number>(0);
  const [vasanOptions, setVasanOptions] = useState<VasanOption[]>([]); // now one per fill plan
  const [layout, setLayout] = useState<CellData[]>([]);
  const [dragVasan, setDragVasan] = useState<VasanOption | null>(null);
  const [dragSourceCellIndex, setDragSourceCellIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [printAllLayouts, setPrintAllLayouts] = useState<{ section: Section; cells: CellData[] }[]>([]);
  const [snackbar, setSnackbar] = useState<{open:boolean; message:string; severity:'success'|'error'}>({open:false,message:'',severity:'success'});
  // allowed counts from Vasan Nos Calculation (by section -> vasanId::foodName -> count)
  const [allowedBySection, setAllowedBySection] = useState<Record<number, Record<string, number>>>({});
  const [resetOpen, setResetOpen] = useState(false);

  // fetch vasans & sections for event
  useEffect(() => {
    if (!selectedAnnkutEvent) { setVasanOptions([]); setSections([]); setSelectedSectionId(''); setRows(0); setCols(0); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    // fetch base vasans
    let vasansResp: any[] = [];
    fetch(`${API_BASE_URL}/vasans?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
      .then(r=> r.ok? r.json(): [])
      .then(data => { vasansResp = Array.isArray(data)? data: []; })
      .finally(()=>{ /* wait for fill plans fetch below to build options */ });
    fetch(`${API_BASE_URL}/vasan-fill-plans?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
      .then(r=> r.ok? r.json(): [])
      .then(data => {
        const fpList: any[] = Array.isArray(data)? data: [];
        const vasansById = new Map(vasansResp.map(v => [v.id, v]));
        const optionList: VasanOption[] = fpList.map(fp => ({
          fillPlanId: fp.id,
          vasanId: fp.vasanId,
          vasanName: vasansById.get(fp.vasanId)?.vasanName || `Vasan ${fp.vasanId}`,
          foodName: fp.foodName,
        }));
        setVasanOptions(optionList);
      });
    // fetch allowed counts from latest vasan nos calculation entry
    fetch(`${API_BASE_URL}/vasan-nos-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const map: Record<number, Record<string, number>> = {};
        if (data && Array.isArray(data.entries)) {
          data.entries.forEach((e: any) => {
            const key = `${e.vasanId}::${(e.foodName || '').toString().trim().toLowerCase()}`;
            if (Array.isArray(e.sectionEntries)) {
              e.sectionEntries.forEach((se: any) => {
                const sId = Number(se.sectionId);
                const count = Number(se.count) || 0;
                if (!map[sId]) map[sId] = {};
                map[sId][key] = (map[sId][key] || 0) + count;
              });
            }
          });
        }
        setAllowedBySection(map);
      })
      .catch(() => { /* ignore missing calc; treat as unlimited */ });
    fetch(`${API_BASE_URL}/api/sections?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
      .then(r=> r.ok? r.json(): [])
      .then(data => {
        const list = Array.isArray(data)? data: [];
        setSections(list);
        // restore last selected section for this event if available
        const storageKey = `sectionLayoutLastSection:${selectedAnnkutEvent}`;
        const stored = localStorage.getItem(storageKey);
        const storedNum = stored ? Number(stored) : NaN;
        let targetSection = list.find(s => !isNaN(storedNum) && s.id === storedNum);
        if (!targetSection && list.length > 0) targetSection = list[0];
        if (targetSection) {
          setSelectedSectionId(targetSection.id);
          setRows(targetSection.rows || 0);
          setCols(targetSection.columns || 0);
        }
      });
  }, [API_BASE_URL, selectedAnnkutEvent]);

  // load saved layout when section changes
  useEffect(() => {
    const section = sections.find(s => s.id === selectedSectionId);
    if (section) {
      const newRows = section.rows || 0;
      const newCols = section.columns || 0;
      setRows(newRows);
      setCols(newCols);
      const token = localStorage.getItem('token');
      if (!token || !selectedAnnkutEvent) {
        setLayout(Array.from({ length: newRows * newCols }, (_, i) => ({ id: `cell-${i}` })));
      } else {
        // show an empty grid immediately while fetching saved layout
        const initialBase = Array.from({ length: newRows * newCols }, (_, i) => ({ id:`cell-${i}` }));
        setLayout(initialBase);
        fetch(`${API_BASE_URL}/section-layout/latest?eventId=${selectedAnnkutEvent}&sectionId=${section.id}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }})
          .then(r=> r.ok? r.json(): null)
          .then(saved => {
            if (!saved) return; // keep initial grid if none saved
            if (Array.isArray(saved.cells)) {
              setLayout(prev => {
                const base = [...prev];
                saved.cells.forEach((c:any) => {
                  if (c && typeof c.index === 'number' && c.index >=0 && c.index < base.length) {
                    base[c.index] = { id:`cell-${c.index}`, vasanId:c.vasanId, fillPlanId:c.fillPlanId } as any;
                  }
                });
                return base;
              });
            }
          })
          .catch(()=>{/* ignore load errors, keep empty grid */});
      }
    } else {
      setRows(0); setCols(0); setLayout([]);
    }
  }, [selectedSectionId, sections, API_BASE_URL, selectedAnnkutEvent]);

  const persist = (next:CellData[]) => {
    if (!selectedAnnkutEvent || selectedSectionId === '') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    const cellsPayload = next.map((c, idx) => ({ index: idx, fillPlanId: (c as any).fillPlanId, vasanId: (c as any).vasanId })).filter(c => c.fillPlanId);
    fetch(`${API_BASE_URL}/section-layout`, {
      method:'POST',
      credentials:'include',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ eventId: selectedAnnkutEvent, sectionId: selectedSectionId, cells: cellsPayload })
    }).then(r => { if (!r.ok) throw new Error('save failed'); })
      .catch(()=> setSnackbar({ open:true, message:'Layout auto-save failed', severity:'error' }))
      .finally(()=> setSaving(false));
  };

  const handleDrop = (cellIndex:number) => {
    if (!dragVasan) return;
    const food = (dragVasan.foodName || '').trim().toLowerCase();
    const key = `${dragVasan.vasanId}::${food}`;

    // If dragging from another cell, perform move/swap without altering allowed totals
    if (dragSourceCellIndex !== null) {
      const srcIndex = dragSourceCellIndex;
      if (srcIndex === cellIndex) { setDragSourceCellIndex(null); setDragVasan(null); return; }
      setLayout(prev => {
        const next = prev.map((c) => ({ ...c }));
        const src = (next[srcIndex] as any);
        const tgt = (next[cellIndex] as any);
        const srcContent = src && src.fillPlanId ? { vasanId: src.vasanId, fillPlanId: src.fillPlanId } : null;
        const tgtContent = tgt && tgt.fillPlanId ? { vasanId: tgt.vasanId, fillPlanId: tgt.fillPlanId } : null;
        // move/swap
        if (srcContent) {
          next[cellIndex] = { id: (next[cellIndex] as any).id, ...srcContent } as any;
        } else {
          next[cellIndex] = { id: (next[cellIndex] as any).id } as any;
        }
        if (tgtContent) {
          next[srcIndex] = { id: (next[srcIndex] as any).id, ...tgtContent } as any;
        } else {
          next[srcIndex] = { id: (next[srcIndex] as any).id } as any;
        }
        persist(next as any);
        return next;
      });
      setDragSourceCellIndex(null);
      setDragVasan(null);
      return;
    }

    // From chip to cell: enforce per-section allowed counts
    const allowed = allowedForCurrentSection[key];
    if (typeof allowed === 'number') {
      const currentCell = layout[cellIndex] as any;
      const currentFpId = currentCell?.fillPlanId as number | undefined;
      let currentKeyAtCell: string | undefined;
      if (currentFpId) {
        const v = fillPlanLookup.get(currentFpId);
        if (v) currentKeyAtCell = `${v.vasanId}::${(v.foodName || '').trim().toLowerCase()}`;
      }
      const increment = currentKeyAtCell === key ? 0 : 1;
      const currentPlaced = placedByKey[key] || 0;
      if (currentPlaced + increment > allowed) {
        setSnackbar({ open:true, message:'Limit reached for this item in this section', severity:'error' });
        return;
      }
    }
    setLayout(prev => {
      const next = prev.map((c, idx) => idx === cellIndex ? { ...c, vasanId: dragVasan.vasanId, fillPlanId: dragVasan.fillPlanId } : c);
      persist(next);
      return next;
    });
  };

  const removeCellVasan = (cellIndex:number) => {
    setLayout(prev => {
      const next = prev.map((c, idx) => idx === cellIndex ? { id:c.id } : c);
      persist(next);
      return next;
    });
  };

  const assignedCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    layout.forEach(c => { if ((c as any).fillPlanId) counts[(c as any).fillPlanId] = (counts[(c as any).fillPlanId]||0)+1; });
    return counts;
  }, [layout]);

  const fillPlanLookup = useMemo(() => new Map(vasanOptions.map(v => [v.fillPlanId, v])), [vasanOptions]);

  // placed count per vasanId::foodName key within the current section layout
  const placedByKey = useMemo(() => {
    const map: Record<string, number> = {};
    layout.forEach(c => {
      const fpId = (c as any).fillPlanId as number | undefined;
      if (!fpId) return;
      const v = fillPlanLookup.get(fpId);
      if (!v) return;
      const key = `${v.vasanId}::${(v.foodName || '').trim().toLowerCase()}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [layout, fillPlanLookup]);

  const allowedForCurrentSection = useMemo(() => {
    const sId = typeof selectedSectionId === 'number' ? selectedSectionId : -1;
    return allowedBySection[sId] || {};
  }, [allowedBySection, selectedSectionId]);

  // Unique color per unique food (case-insensitive). Same food across vasans shares color.
  const foodColorMap = useMemo(() => {
    const palette = [
      '#245D6B', '#8E44AD', '#D35400', '#16A085', '#2C3E50', '#C0392B', '#7F8C8D', '#9C27B0', '#607D8B', '#795548', '#3F51B5', '#388E3C'
    ];
    const foods = Array.from(new Set(vasanOptions.map(v => (v.foodName || '').trim().toLowerCase()).filter(Boolean)));
    const map: Record<string,string> = {};
    foods.forEach((f, idx) => { map[f] = palette[idx % palette.length]; });
    return map;
  }, [vasanOptions]);

  const getFoodColor = (foodName?:string) => {
    if (!foodName) return '#245D6B';
    const key = foodName.trim().toLowerCase();
    return foodColorMap[key] || '#245D6B';
  };

  const getContrast = (hex:string) => {
    // simple luminance formula to decide text color
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    const luminance = (0.299*r + 0.587*g + 0.114*b)/255;
    return luminance > 0.6 ? '#1b1b1b' : '#fff';
  };


  const preparePrintAll = async () => {
    if (!selectedAnnkutEvent || sections.length === 0) return;
    setPrintLoading(true);
    const token = localStorage.getItem('token');
    const results: { section: Section; cells: CellData[] }[] = [];
    for (const s of sections) {
      const newRows = s.rows || 0;
      const newCols = s.columns || 0;
      const base = Array.from({ length: newRows * newCols }, (_, i) => ({ id:`cell-${i}` }));
      if (token) {
        try {
          const r = await fetch(`${API_BASE_URL}/section-layout/latest?eventId=${selectedAnnkutEvent}&sectionId=${s.id}`, { credentials:'include', headers:{ Authorization:`Bearer ${token}` }});
          if (r.ok) {
            const saved = await r.json();
            if (saved && Array.isArray(saved.cells)) {
              saved.cells.forEach((c:any) => {
                if (c && typeof c.index === 'number' && c.index >=0 && c.index < base.length) {
                  base[c.index] = { id:`cell-${c.index}`, vasanId:c.vasanId, fillPlanId:c.fillPlanId } as any;
                }
              });
            }
          }
        } catch { /* ignore per-section errors */ }
      }
      results.push({ section: s, cells: base });
    }
    setPrintAllLayouts(results);
    setPrintLoading(false);
    setPrintOpen(true);
  };

  return (
    <Box sx={{ p:{ xs:2, sm:1 }, minHeight:'80vh', display:'flex', flexDirection:'column', gap:2 }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:1 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <ViewModuleIcon sx={{ color:'#245D6B', fontSize:32 }} />
          <Typography variant='h5' sx={{ color:'#245D6B', fontWeight:700 }}>Section Layout Planner</Typography>
          {selectedEventDetails && <Typography variant='body2' sx={{ color:'#555' }}> - {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
            <Button variant='outlined' size='small' color='error'
              onClick={()=> setResetOpen(true)}
              disabled={!sections.length || selectedSectionId === '' || rows*cols === 0 || saving}
              sx={{ textTransform:'none' }}
            >Reset Section</Button>
          <Button variant='contained' size='small' onClick={preparePrintAll} disabled={!sections.length} sx={{ bgcolor:'#245D6B', textTransform:'none', '&:hover':{ bgcolor:'#1d4b56' }}}>Print All Sections</Button>
          {saving && <Typography variant='caption' sx={{ color:'#245D6B' }}>Saving...</Typography>}
        </Box>
      </Box>
      <Paper sx={{ p:2, display:'flex', gap:3, flexWrap:'wrap', alignItems:'flex-start' }}>
        <Box sx={{ display:'flex', flexDirection:'column', gap:1, minWidth:220 }}>
          <Typography variant='subtitle2' sx={{ fontWeight:700, color:'#245D6B' }}>Section</Typography>
          {sections.length > 1 ? (
            <FormControl size='small' fullWidth>
              <InputLabel id='section-select-label'>Select Section</InputLabel>
              <Select
                labelId='section-select-label'
                label='Select Section'
                value={selectedSectionId === '' ? '' : String(selectedSectionId)}
                onChange={e => {
                  const val = e.target.value as string;
                  const newVal = val === '' ? '' : Number(val);
                  setSelectedSectionId(newVal);
                  if (newVal !== '') {
                    localStorage.setItem(`sectionLayoutLastSection:${selectedAnnkutEvent}`, String(newVal));
                  }
                }}
              >
                {sections.map(s => (
                  <MenuItem key={s.id} value={String(s.id)}>{s.sectionName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Typography variant='body2' sx={{ color: sections.length? '#245D6B':'#999' }}>
              {sections.length === 0 ? 'No sections for event' : sections[0].sectionName}
            </Typography>
          )}
          <Typography variant='body2' sx={{ color: rows && cols ? '#245D6B':'#999', mt:0.5 }}>{rows && cols ? `${rows} rows x ${cols} columns` : 'Select section to view grid'}</Typography>
        </Box>
        <Divider flexItem orientation='vertical' />
        <Box sx={{ flex:1, minWidth:260 }}>
          <Typography variant='subtitle2' sx={{ fontWeight:700, color:'#245D6B', mb:1 }}>Available Vasans (drag to grid)</Typography>
          <Box sx={{ display:'flex', flexWrap:'wrap', gap:1 }}>
            {vasanOptions.map(v => {
              const food = (v.foodName && v.foodName.trim()) || '';
              const color = getFoodColor(food);
              const textColor = getContrast(color);
              const key = `${v.vasanId}::${food.toLowerCase()}`;
              const allowed = allowedForCurrentSection[key];
              const placed = placedByKey[key] || 0;
              const remaining = typeof allowed === 'number' ? Math.max(allowed - placed, 0) : undefined;
              if (typeof allowed === 'number' && remaining === 0) {
                return null; // hide when fully used in this section
              }
              return (
                <Box key={v.fillPlanId}
                  draggable
                  onDragStart={()=> setDragVasan(v)}
                  onDragEnd={()=> setDragVasan(null)}
                  sx={{ px:1, py:0.5, border:`1px solid ${color}`, borderRadius:1, fontSize:12, cursor:'grab', background:color, color:textColor, userSelect:'none', boxShadow:'0 0 0 1px rgba(255,255,255,0.3)' }}>
                  {v.vasanName}{food ? ` (${food})` : ''}
                  {typeof remaining === 'number' ? ` (${remaining} left)` : (assignedCounts[v.fillPlanId] ? ` (${assignedCounts[v.fillPlanId]})` : '')}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>
  <Paper sx={{ p:2, position:'relative' }}>
        {!selectedAnnkutEvent ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#245D6B' }}>Select an Annkut event first</Box>
        ) : selectedSectionId === '' ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#245D6B' }}>Select a Section to begin layout</Box>
        ) : rows * cols === 0 ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#245D6B' }}>Section has no grid size defined</Box>
        ) : (
          <Box
            sx={{
              display:'grid',
              gridTemplateColumns:`repeat(${cols}, 1fr)`,
              gap:1,
            }}
          >
            {layout.map((cell, idx) => {
              const vasan = (cell as any).fillPlanId ? fillPlanLookup.get((cell as any).fillPlanId) : undefined;
              const cellFood = vasan?.foodName?.trim();
              const bgColor = vasan ? getFoodColor(cellFood) : '#fafafa';
              const txtColor = vasan ? getContrast(bgColor) : '#777';
              return (
        <Box
                  key={cell.id}
                  onDragOver={e=> e.preventDefault()}
                  onDrop={()=> handleDrop(idx)}
                  draggable={Boolean(vasan)}
                  onDragStart={() => {
                    if (vasan) {
                      setDragSourceCellIndex(idx);
                      setDragVasan({
                        fillPlanId: (cell as any).fillPlanId,
                        vasanId: vasan.vasanId,
                        vasanName: vasan.vasanName,
                        foodName: vasan.foodName,
                      });
                    }
                  }}
                  onDragEnd={() => {
                    setDragSourceCellIndex(null);
                    setDragVasan(null);
                  }}
                  sx={{
                    height:90,
                    border:'2px dashed #bbb',
                    borderRadius:2,
                    position:'relative',
                    background: bgColor,
                    color: txtColor,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    fontSize:12,
                    fontWeight:600,
                    textAlign:'center',
                    p:1,
                    transition:'background .2s',
                    cursor: vasan ? (dragSourceCellIndex === idx ? 'grabbing' : 'grab') : 'default',
                    userSelect:'none',
          zIndex:1,
                  }}
                >
                  {vasan ? (
                    <>
                      <Typography variant='caption' sx={{ lineHeight:1.1 }}>
                        {vasan.vasanName}{vasan.foodName ? ` (${vasan.foodName.trim()})` : ''}
                      </Typography>
                      <IconButton size='small' onClick={()=> removeCellVasan(idx)} sx={{ position:'absolute', top:2, right:2, color:txtColor }}><DeleteIcon fontSize='inherit' /></IconButton>
                    </>
                  ) : 'Drop here'}
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mt:1 }}>
        {Object.entries(foodColorMap).map(([foodKey, color]) => (
          <Box key={foodKey} sx={{ display:'flex', alignItems:'center', gap:0.5, px:1, py:0.3, borderRadius:1, background:color, color:getContrast(color), fontSize:11 }}>
            {vasanOptions.find(v=> v.foodName && v.foodName.trim().toLowerCase() === foodKey)?.foodName || foodKey}
          </Box>
        ))}
      </Box>
      <Typography variant='caption' sx={{ color:'#666', fontStyle:'italic' }}>Drag a vasan (food) chip into a cell. Layout auto-saves. Use Print for a snapshot.</Typography>
      <Dialog open={printOpen} onClose={()=> setPrintOpen(false)} maxWidth='xl' fullWidth>
        <DialogTitle>All Sections Layout Print</DialogTitle>
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
            <Typography variant='h5' sx={{ fontWeight:700, color:'#245D6B', letterSpacing:1, '@media print': { color:'#245D6B', fontSize:26 } }}>Section Layout Report</Typography>
            <Typography variant='body2' sx={{ color:'#555', mt:0.5, '@media print': { color:'#000' } }}>
              {new Date().toLocaleDateString()} | Powered by Kitchen Manager
              {selectedEventDetails && <> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</>}
            </Typography>
          </Box>
          {printLoading && (
            <Box sx={{ py:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CircularProgress size={40} sx={{ color:'#245D6B' }} />
            </Box>
          )}
          {!printLoading && printAllLayouts.map((item, idx) => (
            <Box key={item.section.id} sx={{ mb:6, pageBreakInside:'avoid', breakInside:'avoid', '@media print': { mb:5 } }}>
              <Typography sx={{ fontWeight:700, fontSize:18, color:'#245D6B', mb:1, '@media print': { fontSize:16 } }}>
                {item.section.sectionName} (Grid: {item.section.rows} x {item.section.columns})
              </Typography>
              <Box
                sx={{
                  display:'grid',
                  gridTemplateColumns:`repeat(${item.section.columns}, 1fr)`,
                  gap:1,
                  width:'100%',
                  '@media print': { gap:0.6, width:'100%', maxWidth:'100%' }
                }}
              >
                {item.cells.map((cell, cIdx) => {
                  const vasan = (cell as any)?.fillPlanId ? fillPlanLookup.get((cell as any).fillPlanId) : undefined;
                  const cellFood = vasan?.foodName?.trim();
                  const bgColor = vasan ? getFoodColor(cellFood) : '#fafafa';
                  const txtColor = vasan ? getContrast(bgColor) : '#245D6B';
                  return (
                    <Box
                      key={cIdx}
                      sx={{
                        height:90,
                        border:'2px dashed #bbb',
                        borderRadius:2,
                        background:bgColor,
                        color:txtColor,
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        fontSize:12,
                        fontWeight:600,
                        textAlign:'center',
                        p:1,
                        boxSizing:'border-box',
                        '@media print': {
                          WebkitPrintColorAdjust:'exact',
                          printColorAdjust:'exact'
                        }
                      }}
                    >
                      {vasan ? `${vasan.vasanName}${vasan.foodName?` (${vasan.foodName})`:''}` : ''}
                    </Box>
                  );
                })}
              </Box>
              {idx < printAllLayouts.length-1 && (
                <Box sx={{ mt:4, borderBottom:'1px dashed #ccc', '@media print': { borderBottom:'1px solid #245D6B' } }} />
              )}
            </Box>
          ))}
          {!printLoading && (
            <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mt:3, '@media print': { mt:2 } }}>
              {Object.entries(foodColorMap).map(([foodKey, color]) => {
                const contrast = getContrast(color);
                return (
                  <Box key={foodKey} sx={{ display:'flex', alignItems:'center', gap:0.5, px:1, py:0.3, borderRadius:1, background:color, color:contrast, fontSize:11, border:'1px solid rgba(0,0,0,0.15)', '@media print': { WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' } }}>
                    {vasanOptions.find(v=> v.foodName && v.foodName.trim().toLowerCase() === foodKey)?.foodName || foodKey}
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> window.print()} variant='contained' sx={{ bgcolor:'#245D6B' }}>Print</Button>
          <Button onClick={()=> setPrintOpen(false)} sx={{ color:'#245D6B' }}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={resetOpen} onClose={()=> setResetOpen(false)}>
        <DialogTitle>Reset Section Layout</DialogTitle>
        <DialogContent dividers>
          <Typography variant='body2'>This will clear all placements for the current section. Are you sure?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setResetOpen(false)} sx={{ color:'#245D6B' }}>Cancel</Button>
          <Button
            onClick={() => {
              setResetOpen(false);
              const total = rows * cols;
              const cleared = Array.from({ length: total }, (_, i) => ({ id:`cell-${i}` }));
              setLayout(cleared);
              persist(cleared);
            }}
            color='error'
            variant='contained'
          >Reset</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={()=> setSnackbar({...snackbar, open:false})} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert onClose={()=> setSnackbar({...snackbar, open:false})} severity={snackbar.severity} sx={{ width:'100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SectionLayoutPlanner;
