import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import DownloadIcon from '@mui/icons-material/Download';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

// This page reuses the Final Ingredient Summary's data but displays only ingredient totals (total weight)

interface RecipeIngredient { ingredientName: string; kg: number }
interface Recipe { id:number; vangiName:string; ingredients: RecipeIngredient[] }
interface FinalNosRow { foodName:string; finalFlour:number }

const FinalOrderSummary = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [finalRows, setFinalRows] = useState<FinalNosRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!selectedAnnkutEvent) { setRecipes([]); setFinalRows([]); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/recipe`, { credentials:'include', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } }).then(r=> r.ok? r.json(): []),
      fetch(`${API_BASE_URL}/final-nos-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } })
        .then(async (r) => {
          if (!r.ok) return null;
          try {
            const text = await r.text();
            if (!text) return null;
            return JSON.parse(text);
          } catch (err) {
            return null;
          }
        })
        .catch(() => null)
    ]).then(([recipesData, finalData]) => {
      setRecipes(Array.isArray(recipesData)? recipesData: []);
      if (finalData && Array.isArray(finalData.rows)) {
        const rows: FinalNosRow[] = finalData.rows.map((r:any) => ({
          foodName: String(r.foodName || ''),
          finalFlour: Number(r.finalFlour) || 0
        }));
        setFinalRows(rows);
      } else {
        setFinalRows([]);
      }
    }).finally(()=> setLoading(false));
  }, [API_BASE_URL, selectedAnnkutEvent]);

  const ingredientTotals = useMemo(() => {
    const normalize = (s:string) => String(s||'').trim().toLowerCase();
    const baseName = (s:string) => String(s||'').split('(')[0].trim();
    const recipeMap = new Map(recipes.map(r => [normalize(r.vangiName), r]));

    // Build columns from finalRows, dedupe by normalized food name, keep max flour
    const byFood = new Map<string, { key:string; name:string; finalFlour:number; ingredients: RecipeIngredient[] }>();
    finalRows.forEach(fr => {
      if (!fr || !fr.foodName) return;
      const n = normalize(fr.foodName);
      const existing = byFood.get(n);
      const flour = Number(fr.finalFlour) || 0;
      // locate recipe: exact food, else base name
      let recipe = recipeMap.get(n);
      if (!recipe) {
        const base = normalize(baseName(fr.foodName));
        recipe = recipeMap.get(base) || null as any;
      }
      const entry = { key: n, name: fr.foodName, finalFlour: flour, ingredients: recipe?.ingredients || [] };
      if (!existing || flour > existing.finalFlour) byFood.set(n, entry);
    });
    const cols = Array.from(byFood.values()).filter(c => (c.finalFlour || 0) > 0);

    // Sum ingredient totals across all selected foods
    const totalsMap = new Map<string, number>();
    cols.forEach(col => {
      col.ingredients.forEach(ing => {
        const kgPerUnit = Number(ing.kg) || 0; // kg per 1kg flour
        if (kgPerUnit <= 0) return;
        const additional = kgPerUnit * (Number(col.finalFlour) || 0);
        const prev = totalsMap.get(ing.ingredientName) || 0;
        totalsMap.set(ing.ingredientName, prev + additional);
      });
    });

    const rows = Array.from(totalsMap.entries()).map(([ingredientName, totalKg], idx) => ({ id: idx+1, ingredientName, totalKg }));
    rows.sort((a,b) => a.ingredientName.localeCompare(b.ingredientName));
    return rows;
  }, [recipes, finalRows]);

  const handleExportClick = (e: React.MouseEvent<HTMLElement>) => setExportAnchorEl(e.currentTarget);
  const handleExportClose = () => setExportAnchorEl(null);

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rowsData = ingredientTotals.map((r: any, idx: number) => ({
        ID: idx + 1,
        'Ingredient Name': r.ingredientName,
        'Total Weight (Kg)': Number(r.totalKg) || 0,
      }));
      const ws = XLSX.utils.json_to_sheet(rowsData);
      ws['!cols'] = [{ wch: 6 }, { wch: 50 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Final Order Summary');
      XLSX.writeFile(wb, `final-order-summary-${selectedAnnkutEvent || 'all'}.xlsx`);
      handleExportClose();
    } catch (err) {
      console.error('Export excel failed', err);
      handleExportClose();
    }
  };

  const exportToPdf = async () => {
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const el = document.getElementById('final-order-summary-print');
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'pt', 'a4');
      const imgProps = (pdf as any).getImageProperties ? (pdf as any).getImageProperties(imgData) : { width: canvas.width, height: canvas.height };
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`final-order-summary-${selectedAnnkutEvent || 'all'}.pdf`);
      handleExportClose();
    } catch (err) {
      console.error('Export pdf failed', err);
      handleExportClose();
    }
  };

  return (
    <Box sx={{ p:{ xs:2, sm:1 }, minHeight:'80vh' }}>
      <Box sx={{ display:'flex', alignItems:'center', mb:3 }}>
        <SummarizeIcon sx={{ color:'#245D6B', fontSize:32, mr:1 }} />
        <Typography variant="h5" sx={{ color:'#245D6B', fontWeight:700 }}>Final Order Summary</Typography>
        {selectedEventDetails && <Typography variant="body1" sx={{ ml:2, color:'#666', fontStyle:'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
        <Box sx={{ ml:'auto' }}>
          <>
            <Button variant="outlined" startIcon={<DownloadIcon />} disabled={!selectedAnnkutEvent || !ingredientTotals.length} sx={{ borderColor:'#245D6B', color:'#245D6B', mr:1 }} onClick={handleExportClick}>Export</Button>
            <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
              <MenuItem onClick={() => { handleExportClose(); exportToExcel(); }} disabled={!selectedAnnkutEvent || !ingredientTotals.length}>Export Excel</MenuItem>
              <MenuItem onClick={() => { handleExportClose(); exportToPdf(); }} disabled={!selectedAnnkutEvent || !ingredientTotals.length}>Export PDF</MenuItem>
            </Menu>
            <Button variant="outlined" disabled={!selectedAnnkutEvent || !ingredientTotals.length} sx={{ borderColor:'#245D6B', color:'#245D6B' }} onClick={()=> setPrintDialogOpen(true)}>Print</Button>
          </>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p:2, opacity: selectedAnnkutEvent?1:0.5, pointerEvents: selectedAnnkutEvent? 'auto':'none' }}>
        {!selectedAnnkutEvent ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#245D6B' }}>Select an Annkut event first</Box>
        ) : loading ? (
          <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress /></Box>
        ) : ingredientTotals.length === 0 ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#999' }}>No ingredient data (ensure Final Nos Summary is saved).</Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            {/* Two-column responsive view for on-screen display */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {(() => {
                const mid = Math.ceil(ingredientTotals.length / 2);
                const left = ingredientTotals.slice(0, mid);
                const right = ingredientTotals.slice(mid);
                return [left, right].map((col, colIndex) => (
                  <TableContainer key={colIndex} sx={{ flex: '1 1 48%', maxHeight: '70vh', overflow: 'auto', '&::-webkit-scrollbar': { width:8, height:8 }, '&::-webkit-scrollbar-thumb': { background:'rgba(36,93,107,0.5)', borderRadius:4 }, '&::-webkit-scrollbar-track': { background:'rgba(0,0,0,0.08)' } }}>
                    <Table stickyHeader size='small' sx={{ width: '100%' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff', textAlign:'center', width:56 }}>ID</TableCell>
                          <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff' }}>Ingredient Name</TableCell>
                          <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff', textAlign:'center', whiteSpace:'nowrap', width:120 }}>Total Weight</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {col.map((row, i) => {
                          const globalIndex = colIndex === 0 ? i : mid + i;
                          const displayedId = colIndex === 0 ? i + 1 : mid + i + 1;
                          const rowBg = globalIndex % 2 === 0 ? '#f7fbfc' : '#eaf3f6';
                          return (
                            <TableRow key={`${colIndex}-${row.ingredientName}`} sx={{ backgroundColor: rowBg }}>
                              <TableCell sx={{ textAlign:'center' }}>{displayedId}</TableCell>
                              <TableCell sx={{ whiteSpace:'normal', overflowWrap:'break-word' }}>{row.ingredientName}</TableCell>
                              <TableCell align='center' sx={{ fontWeight:600, color:'#245D6B' }}>{row.totalKg.toFixed(3)} kg</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ));
              })()}
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog open={printDialogOpen} onClose={()=> setPrintDialogOpen(false)} maxWidth='xl' fullWidth>
        <DialogTitle>Final Order Summary Print</DialogTitle>
        <DialogContent
          dividers
          sx={{
            '@media print': {
              bgcolor: '#fff',
              p: 2,
            }
          }}
        >
          <Box component="style">{`
            /* Dialog preview (screen) styles */
            .ingredient-print-table { font-size: 12px; table-layout: fixed; width:100%; }
            .ingredient-print-table th, .ingredient-print-table td { padding: 2px 4px; word-wrap: break-word; white-space: normal; text-align: center; vertical-align: middle; }

            @page { size: landscape; margin: 12mm; }
            @media print {
              /* Stronger rules for actual print output */
              .ingredient-print-table { font-size: 12px !important; table-layout: fixed; width:100%; }
              .ingredient-print-table th, .ingredient-print-table td { padding: 2px 4px !important; word-wrap: break-word; white-space: normal !important; text-align: center !important; }
              .ingredient-print-table td { vertical-align: middle !important; }
            }
          `}</Box>
          <Box id="final-order-summary-print" sx={{ mb:2, borderBottom:'2px solid #245D6B', pb:1.5, '@media print': { mb:2, pb:1, borderBottom:'2px solid #245D6B' } }}>
            <Typography variant='h5' sx={{ fontWeight:700, color:'#245D6B', letterSpacing:1, '@media print': { color:'#245D6B', fontSize:20 } }}>Final Order Summary Report</Typography>
            <Typography variant='body2' sx={{ color:'#555', mt:0.5, '@media print': { color:'#000' } }}>
              {new Date().toLocaleDateString()} | Powered by Kitchen Manager
              {selectedEventDetails && <> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</>}
            </Typography>
          </Box>

          {/* Two-column print layout using same print table styling as FinalIngredientSummary */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {(() => {
              const mid = Math.ceil(ingredientTotals.length / 2);
              const left = ingredientTotals.slice(0, mid);
              const right = ingredientTotals.slice(mid);
              return [left, right].map((col, colIndex) => (
                <TableContainer key={colIndex} sx={{ flex: '1 1 48%', boxShadow: 'none', '@media print': { width: '48%' } }}>
                  <Table className='ingredient-print-table' stickyHeader sx={{ border:'1px solid #245D6B', fontSize:13, tableLayout:'auto' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, border:'1px solid #245D6B', textAlign:'center', whiteSpace:'nowrap' }}>ID</TableCell>
                        <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, border:'1px solid #245D6B', whiteSpace:'normal' }}>Ingredient Name</TableCell>
                        <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, border:'1px solid #245D6B', whiteSpace:'nowrap', textAlign:'right' }}>Total Weight</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {col.map((r, i) => {
                        const displayedId = colIndex === 0 ? i + 1 : mid + i + 1;
                        return (
                          <TableRow key={`${colIndex}-${r.ingredientName}`}>
                            <TableCell sx={{ border:'1px solid #245D6B' }}>{displayedId}</TableCell>
                            <TableCell sx={{ border:'1px solid #245D6B' }}>{r.ingredientName}</TableCell>
                            <TableCell align='right' sx={{ border:'1px solid #245D6B' }}>{r.totalKg.toFixed(3)} kg</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ));
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> window.print()} variant='contained' size='small' sx={{ bgcolor:'#245D6B', textTransform:'none', '&:hover':{ bgcolor:'#1d4b56' } }}>Print</Button>
          <Button onClick={()=> setPrintDialogOpen(false)} size='small' sx={{ color:'#245D6B', textTransform:'none' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FinalOrderSummary;
