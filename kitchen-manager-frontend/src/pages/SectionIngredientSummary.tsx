import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Dialog, DialogTitle, DialogContent } from '@mui/material';
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
    const cols = sectionSummaryRows
      .filter(r => r.flourRequiredKg > 0)
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
    }).filter(r => r.totalKg > 0);

    return { ingredientMatrixRows: rows, foodColumns: cols };
  }, [sectionSummaryRows, recipes]);

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
        ) : ingredientMatrixRows.length === 0 ? (
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
                  <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff', position:'sticky', left:60, top:0, zIndex:4, minWidth:160, maxWidth:200, whiteSpace:'nowrap' }}>Ingredient Name</TableCell>
                  {foodColumns.map(col => (
                    <TableCell key={col.key} sx={{ fontWeight:700, background:'#245D6B', color:'#fff', whiteSpace:'nowrap', textAlign:'center', top:0 }}>{col.vasanName} ({col.name})</TableCell>
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
                      <TableCell sx={{ position:'sticky', left:60, background:rowBg, zIndex:2 }}>{row.ingredientName}</TableCell>
                      {foodColumns.map(col => {
                        const val = row.perFood[col.key];
                        return <TableCell key={col.key} align='center'>{val ? `${val.toFixed(3)} kg` : '-'}</TableCell>;
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
  {/* Removed duplicate bottom Print button (header Print retained) */}

      <Dialog open={printDialogOpen} onClose={()=> setPrintDialogOpen(false)} maxWidth='xl' fullWidth>
        <DialogTitle>
          Print Preview
          <Button variant='contained' sx={{ float:'right', bgcolor:'#245D6B', ml:2 }} onClick={()=> window.print()}>Print</Button>
        </DialogTitle>
        <DialogContent>
          <Box>
            <div style={{ textAlign:'left', marginBottom:24, borderBottom:'2px solid #245D6B', paddingBottom:12 }}>
              <h1 style={{ color:'#245D6B', margin:0, fontSize:32, letterSpacing:2, fontWeight:700 }}>Section Ingredient Summary</h1>
              <div style={{ color:'#555', fontSize:14, marginTop:4 }}>
                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by Kitchen Manager
              </div>
            </div>
            <TableContainer sx={{ width:'100%', overflowX:'auto' }}>
              <Table sx={{ width:'100%' }} stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight:700, color:'#fff', background:'#245D6B', whiteSpace:'nowrap', position:'sticky', left:0, top:0, zIndex:4, minWidth:80 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight:700, color:'#fff', background:'#245D6B', whiteSpace:'nowrap', position:'sticky', left:80, top:0, zIndex:4, minWidth:140 }}>Ingredient Name</TableCell>
                    {foodColumns.map(col => (
                      <TableCell key={col.key} sx={{ fontWeight:700, color:'#fff', background:'#245D6B', whiteSpace:'nowrap', textAlign:'center', top:0 }}>{col.vasanName} ({col.name})</TableCell>
                    ))}
                    <TableCell sx={{ fontWeight:700, color:'#fff', background:'#245D6B', whiteSpace:'nowrap', textAlign:'center', top:0 }}>Total Weight</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ingredientMatrixRows.map((row, idx) => {
                    const rowBg = idx % 2 === 0 ? '#f7fbfc' : '#eaf3f6';
                    return (
                      <TableRow key={row.id} sx={{ backgroundColor: rowBg }}>
                        <TableCell sx={{ position:'sticky', left:0, background:rowBg, zIndex:2 }}>{row.id}</TableCell>
                        <TableCell sx={{ position:'sticky', left:80, background:rowBg, zIndex:2 }}>{row.ingredientName}</TableCell>
                        {foodColumns.map(col => {
                          const val = row.perFood[col.key];
                          return <TableCell key={col.key} align='center'>{val ? `${val.toFixed(3)} kg` : '-'}</TableCell>;
                        })}
                        <TableCell align='center' sx={{ fontWeight:600, color:'#245D6B' }}>{row.totalKg.toFixed(3)} kg</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SectionIngredientSummary;
