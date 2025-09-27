import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

/*
 Section Ingredient Summary
 Now driven by saved Section Vasan Summary snapshot:
 1. Load latest /section-vasan-summary/latest (rows with flourRequiredKg per food/vasan)
 2. Load recipes (each recipe defines ingredients with kg per 1 kg flour)
 3. Ingredient total kg = flourRequiredKg * ingredient.kg
*/

interface RecipeIngredient { ingredientName: string; kg: number; }
interface Recipe { id:number; vangiName:string; ingredients: RecipeIngredient[]; }
interface SectionVasanSummaryRow { vasanId:number; vasanName:string; foodName:string; flourRequiredKg:number; }

const SectionIngredientSummary = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sectionSummaryRows, setSectionSummaryRows] = useState<SectionVasanSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  useEffect(() => {
    if (!selectedAnnkutEvent) { setRecipes([]); setSectionSummaryRows([]); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/recipe`, { credentials:'include', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): []),
      fetch(`${API_BASE_URL}/section-vasan-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): null)
    ]).then(([recipesData, summaryData]) => {
      if (debugMode) console.debug('SectionIngredientSummary fetched', { recipesData, summaryData });
      setRecipes(Array.isArray(recipesData)? recipesData: []);
  if (summaryData && Array.isArray(summaryData.rows)) {
        // Normalize row properties we rely on
        const normalized = summaryData.rows.map((r:any) => ({
          vasanId: r.vasanId,
            vasanName: r.vasanName,
            foodName: r.foodName,
            flourRequiredKg: Number(r.flourRequiredKg) || 0
        }));
        setSectionSummaryRows(normalized);
      } else {
        setSectionSummaryRows([]);
      }
    }).finally(()=> setLoading(false));
  }, [API_BASE_URL, selectedAnnkutEvent]);

  // Build matrix similar to AnnkutIngredientSummary: columns = foods, rows = ingredients, cell = kg used
  const { ingredientMatrixRows, foodColumns } = useMemo(() => {
    const recipeMap = new Map(recipes.map(r => [r.vangiName.trim().toLowerCase(), r]));
    // Build columns: one per vasan + food combination
    // include foods even when flourRequiredKg is 0 so the table shows columns (values may be zero)
    const cols = sectionSummaryRows
      .map(r => {
        const recipe = recipeMap.get(r.foodName?.trim().toLowerCase());
        const compositeKey = `${r.vasanId}::${r.foodName?.trim().toLowerCase()}`;
        return {
            key: compositeKey,
            vasanId: r.vasanId,
            name: r.foodName,
            vasanName: r.vasanName,
            flourRequiredKg: r.flourRequiredKg,
            ingredients: recipe?.ingredients || []
        };
      })
      // dedupe by composite key (should already be unique) keeping max flour if duplicates appear
      .reduce((acc:any[], curr) => {
        const idx = acc.findIndex(c => c.key === curr.key);
        if (idx === -1) acc.push(curr); else if (curr.flourRequiredKg > acc[idx].flourRequiredKg) acc[idx] = curr;
        return acc;
      }, [])
      .sort((a,b) => a.vasanId - b.vasanId || a.name.localeCompare(b.name));

    // Collect ingredient names
    const ingredientSet = new Set<string>();
    cols.forEach(c => c.ingredients.forEach((ing:any) => ingredientSet.add(ing.ingredientName)));
    const ingredientNames = Array.from(ingredientSet).sort((a,b)=> a.localeCompare(b));

    const rows = ingredientNames.map((ingName, idx) => {
      let total = 0;
      const perFood: Record<string, number> = {};
      cols.forEach(col => {
        const ing = col.ingredients.find((i:any) => i.ingredientName === ingName);
        if (ing && col.flourRequiredKg > 0) {
          const kg = ing.kg * col.flourRequiredKg;
          perFood[col.key] = kg;
          total += kg;
        }
      });
      return { id: idx+1, ingredientName: ingName, perFood, totalKg: total };
    });

    // keep rows even if totalKg is 0 so the table can show ingredient rows (will show 0s)
    // if you prefer to hide zero rows, apply a filter here

    return { ingredientMatrixRows: rows, foodColumns: cols };
  }, [sectionSummaryRows, recipes]);

  // Keep consistent font size in print (no dynamic shrinking) and allow wrapping

  return (
    <Box sx={{ p:{ xs:2, sm:1 }, minHeight:'80vh' }}>
      <Box sx={{ display:'flex', alignItems:'center', mb:3 }}>
        <SummarizeIcon sx={{ color:'#245D6B', fontSize:32, mr:1 }} />
        <Typography variant="h5" sx={{ color:'#245D6B', fontWeight:700 }}>Section Ingredient Summary</Typography>
        {selectedEventDetails && <Typography variant="body1" sx={{ ml:2, color:'#666', fontStyle:'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
        <Box sx={{ ml:'auto' }}>
          <Button variant="outlined" disabled={!selectedAnnkutEvent || !ingredientMatrixRows.length} sx={{ borderColor:'#245D6B', color:'#245D6B' }} onClick={()=> setPrintDialogOpen(true)}>Print</Button>
        </Box>
      </Box>
      <Paper elevation={3} sx={{ p:2, opacity: selectedAnnkutEvent?1:0.5, pointerEvents: selectedAnnkutEvent? 'auto':'none' }}>
        {!selectedAnnkutEvent ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#245D6B' }}>Select an Annkut event first</Box>
        ) : loading ? (
          <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress /></Box>
        ) : foodColumns.length === 0 ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#999' }}>No ingredient data (ensure Section Nos Summary saved).</Box>
        ) : (
          <TableContainer 
            sx={{ 
              width:'100%',
              overflowX:'auto',
              maxHeight:'70vh',
              '&::-webkit-scrollbar': { width:8, height:8 },
              '&::-webkit-scrollbar-thumb': { background:'rgba(36,93,107,0.5)', borderRadius:4 },
              '&::-webkit-scrollbar-track': { background:'rgba(0,0,0,0.08)' }
            }}
          >
            <Table sx={{ width:'100%' }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff', position:'sticky', left:0, top:0, zIndex:4, minWidth:60, maxWidth:60, textAlign:'center' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff', position:'sticky', left:60, top:0, zIndex:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:180, maxWidth:180, lineHeight:1.2 }}>Ingredient Name</TableCell>
                  {foodColumns.map(col => (
                    <TableCell key={col.key} sx={{ fontWeight:700, background:'#245D6B', color:'#fff', whiteSpace:'nowrap', textAlign:'center', top:0 }}>{col.name}</TableCell>
                  ))}
                  <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff', textAlign:'center', whiteSpace:'nowrap' }}>Total Weight</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                  {ingredientMatrixRows.map((row, idx) => {
                  const rowBg = idx % 2 === 0 ? '#f7fbfc' : '#eaf3f6';
                  return (
                    <TableRow key={row.id} sx={{ backgroundColor: rowBg }}>
                      <TableCell sx={{ position:'sticky', left:0, background:rowBg, textAlign:'center', zIndex:2 }}>{row.id}</TableCell>
                      <TableCell sx={{ position:'sticky', left:60, background:rowBg, zIndex:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:180, maxWidth:180, lineHeight:1.2 }}>{row.ingredientName}</TableCell>
                      {foodColumns.map(col => {
                        const val = row.perFood[col.key] || 0;
                        return <TableCell key={col.key} align='center'>{val ? `${val.toFixed(3)} kg` : '0.000 kg'}</TableCell>;
                      })}
                      <TableCell align='center' sx={{ fontWeight:600, color:'#245D6B' }}>{row.totalKg.toFixed(3)} kg</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
        {debugMode && (
          <Box sx={{ mt:2, p:1, border:'1px dashed #ccc', borderRadius:1, background:'#fafafa', fontSize:12 }}>
            <Typography variant="subtitle2" sx={{ mb:1, color:'#333' }}>Debug (visible only with ?debug=1)</Typography>
            <pre style={{ maxHeight:360, overflow:'auto', whiteSpace:'pre-wrap' }}>{JSON.stringify({ recipes, sectionSummaryRows, ingredientMatrixRows, foodColumns }, null, 2)}</pre>
          </Box>
        )}
  {/* Removed duplicate bottom Print button (header Print retained) */}

      <Dialog open={printDialogOpen} onClose={()=> setPrintDialogOpen(false)} maxWidth='xl' fullWidth>
        <DialogTitle>Section Ingredient Summary Print</DialogTitle>
        <DialogContent
          dividers
          sx={{
            '@media print': {
              bgcolor: '#fff',
              p: 2,
            }
          }}
        >
          {/* Print specific global styles */}
          <Box component="style">{`
            @page { size: landscape; margin: 12mm; }
            @media print {
              .ingredient-print-table { font-size: 13px !important; table-layout: fixed; width:100%; }
              .ingredient-print-table th, .ingredient-print-table td { padding: 4px 6px !important; word-wrap: break-word; white-space: normal !important; }
            }
          `}</Box>
          <Box sx={{ mb:3, borderBottom:'2px solid #245D6B', pb:1.5, '@media print': { mb:2, pb:1, borderBottom:'2px solid #245D6B' } }}>
            <Typography variant='h5' sx={{ fontWeight:700, color:'#245D6B', letterSpacing:1, '@media print': { color:'#245D6B', fontSize:26 } }}>Section Ingredient Summary Report</Typography>
            <Typography variant='body2' sx={{ color:'#555', mt:0.5, '@media print': { color:'#000' } }}>
              {new Date().toLocaleDateString()} | Powered by Kitchen Manager
              {selectedEventDetails && <> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</>}
            </Typography>
          </Box>
          <TableContainer sx={{ width:'100%', boxShadow:'none', '@media print': { width:'100%', overflow:'visible' } }}>
            <Table className='ingredient-print-table' stickyHeader sx={{ border:'1px solid #245D6B', fontSize:13, tableLayout:'auto', '@media print': { tableLayout:'fixed', width:'100%', fontSize:13 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, position:'sticky', left:0, top:0, zIndex:4, minWidth:70, border:'1px solid #245D6B', textAlign:'center', whiteSpace:'nowrap', '@media print': { position:'static', left:'auto', top:'auto' } }}>ID</TableCell>
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, position:'sticky', left:70, top:0, zIndex:4, border:'1px solid #245D6B', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:200, maxWidth:200, lineHeight:1.2, '@media print': { position:'static', left:'auto', top:'auto', whiteSpace:'nowrap', width:'200px', maxWidth:'200px' } }}>Ingredient Name</TableCell>
                  {foodColumns.map(col => (
                    <TableCell key={col.key} sx={{ background:'#245D6B', color:'#fff', fontWeight:700, border:'1px solid #245D6B', whiteSpace:'nowrap', textAlign:'center', top:0, '@media print': { whiteSpace:'normal' } }}>{col.name}</TableCell>
                  ))}
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, border:'1px solid #245D6B', whiteSpace:'nowrap', textAlign:'center', top:0, '@media print': { whiteSpace:'normal' } }}>Total Weight</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ingredientMatrixRows.map((row, idx) => {
                  const rowBg = idx % 2 === 0 ? '#f7fbfc' : '#eaf3f6';
                  return (
                    <TableRow key={row.id} sx={{ backgroundColor: rowBg, '@media print': { backgroundColor: '#fff' } }}>
                      <TableCell sx={{ position:'sticky', left:0, background:rowBg, zIndex:2, border:'1px solid #245D6B', textAlign:'center', '@media print': { position:'static', left:'auto', background:'#fff' } }}>{row.id}</TableCell>
                      <TableCell sx={{ position:'sticky', left:70, background:rowBg, zIndex:2, border:'1px solid #245D6B', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:200, maxWidth:200, lineHeight:1.2, '@media print': { position:'static', left:'auto', background:'#fff', width:'200px', maxWidth:'200px' } }}>{row.ingredientName}</TableCell>
                      {foodColumns.map(col => {
                        const val = row.perFood[col.key];
                        return <TableCell key={col.key} align='center' sx={{ border:'1px solid #245D6B' }}>{val ? `${val.toFixed(3)} kg` : '-'}</TableCell>;
                      })}
                      <TableCell align='center' sx={{ fontWeight:600, color:'#245D6B', border:'1px solid #245D6B' }}>{row.totalKg.toFixed(3)} kg</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> window.print()} variant='contained' size='small' sx={{ bgcolor:'#245D6B', textTransform:'none', '&:hover':{ bgcolor:'#1d4b56' } }}>Print</Button>
          <Button onClick={()=> setPrintDialogOpen(false)} size='small' sx={{ color:'#245D6B', textTransform:'none' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SectionIngredientSummary;
