import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem, Checkbox, DialogContentText} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

// Build a Final Ingredient Summary from the saved Final Nos Summary snapshot
// Columns = foods from Final Nos Summary (finalFlour per food)
// Rows = ingredients from recipes; Cell = ingredient.kg (per 1kg flour) * finalFlour

interface RecipeIngredient { ingredientName: string; kg: number }
interface Recipe { id:number; vangiName:string; ingredients: RecipeIngredient[] }
interface FinalNosRow { foodName:string; finalFlour:number }

const FinalIngredientSummary = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [finalRows, setFinalRows] = useState<FinalNosRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  // Print menu & selection dialog states
  const [printAnchorEl, setPrintAnchorEl] = useState<null | HTMLElement>(null);
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [selectedFoodKeys, setSelectedFoodKeys] = useState<string[]>([]);
  const handlePrintClick = (e: React.MouseEvent<HTMLElement>) => setPrintAnchorEl(e.currentTarget);
  const handlePrintClose = () => setPrintAnchorEl(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const handleExportClick = (e: React.MouseEvent<HTMLElement>) => setExportAnchorEl(e.currentTarget);
  const handleExportClose = () => setExportAnchorEl(null);

  const exportToExcel = async () => {
    handleExportClose();
    try {
      // Direct dynamic import - packages are installed (npm install) so Vite will resolve these
      const XLSXmod = await import('xlsx');
      const XLSX = (XLSXmod && (XLSXmod as any).default) || XLSXmod;
      
      // Build Excel data matching print layout (no title rows, just header + data)
      const wsData: any[][] = [];
      
      // Header row
      const header = ['ID', 'Ingredient Name', ...foodColumns.map(c => c.name), 'Total Weight'];
      wsData.push(header);
      
      // Data rows
      const dataRows = ingredientMatrixRows.map(r => [
        r.id, 
        r.ingredientName, 
        ...foodColumns.map(c => r.perFood[c.key] ? r.perFood[c.key] : ''), 
        r.totalKg
      ]);
      wsData.push(...dataRows);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      const colWidths = [
        { wch: 8 },  // ID
        { wch: 35 }, // Ingredient Name
        ...foodColumns.map(() => ({ wch: 18 })), // Food columns
        { wch: 18 }  // Total Weight
      ];
      ws['!cols'] = colWidths;
      
      // Style the worksheet
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Header row (row 1, index 0) - bold white text on colored background, centered middle aligned, borders
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '245D6B' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      }
      
      // Data rows - all cells centered and middle aligned with borders
      for (let row = 1; row <= range.e.r; row++) {
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              alignment: { 
                horizontal: 'center',
                vertical: 'center',
                wrapText: col === 1 // Wrap text for ingredient names only
              },
              border: {
                top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                right: { style: 'thin', color: { rgb: 'CCCCCC' } }
              },
              font: { sz: 10 }
            };
            
            // Format numbers with 3 decimal places
            if (col > 1 && typeof ws[cellAddress].v === 'number') {
              ws[cellAddress].z = '0.000';
            }
            
            // Highlight Total Weight column with bold and brand color
            if (col === range.e.c) {
              ws[cellAddress].s.font = { bold: true, sz: 10, color: { rgb: '245D6B' } };
            }
          }
        }
      }
      
      // Add auto-filter to header row
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };
      
      // Set row heights for consistent appearance
      ws['!rows'] = [
        { hpt: 30 }, // Header row
        ...dataRows.map(() => ({ hpt: 22 })) // Data rows
      ];
      
      // Create workbook and export
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Final Ingredient Summary');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinalIngredientSummary_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel export failed', err);
      alert('Excel export failed (ensure xlsx is installed)');
    }
  };

  const exportToPdf = async () => {
    handleExportClose();
    try {
      // Direct dynamic imports - Vite will resolve these now that packages are installed
      const h2cMod = await import('html2canvas');
      const html2canvas = (h2cMod && (h2cMod as any).default) || h2cMod;
      const jspdfMod = await import('jspdf');
      const jsPDF = (jspdfMod && (jspdfMod as any).jsPDF) || jspdfMod;
      
      // Build the print-styled content with header and table (matching print dialog layout)
      // Use a width suitable for portrait pages so exported PDF matches portrait layout
      const printContent = `
        <div style="background: #fff; padding: 20px; width: 780px;">
          <div style="margin-bottom: 20px; border-bottom: 2px solid #245D6B; padding-bottom: 12px;">
            <h1 style="font-weight: 700; color: #245D6B; letter-spacing: 1px; font-size: 26px; margin: 0 0 8px 0;">Final Ingredient Summary Report</h1>
            <p style="color: #000; margin: 0; font-size: 14px;">
              ${new Date().toLocaleDateString()} | Powered by Kitchen Manager
              ${selectedEventDetails ? `| Event: ${selectedEventDetails.eventName} - ${selectedEventDetails.eventYear}` : ''}
            </p>
          </div>
          <table class="ingredient-print-table" style="border: 1px solid #245D6B; font-size: 13px; table-layout: fixed; width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="background: #245D6B; color: #fff; font-weight: 700; border: 1px solid #245D6B; padding: 4px 6px; text-align: center; white-space: normal;">ID</th>
                <th style="background: #245D6B; color: #fff; font-weight: 700; border: 1px solid #245D6B; padding: 4px 6px; min-width: 140px; white-space: normal;">Ingredient Name</th>
                ${foodColumns.map(col => `<th style="background: #245D6B; color: #fff; font-weight: 700; border: 1px solid #245D6B; padding: 4px 6px; text-align: center; white-space: normal;">${col.name}</th>`).join('')}
                <th style="background: #245D6B; color: #fff; font-weight: 700; border: 1px solid #245D6B; padding: 4px 6px; text-align: center; white-space: normal;">Total Weight</th>
              </tr>
            </thead>
            <tbody>
              ${ingredientMatrixRows.map((row) => {
                return `<tr style="background: #fff;">
                  <td style="border: 1px solid #245D6B; padding: 4px 6px; text-align: center;">${row.id}</td>
                  <td style="border: 1px solid #245D6B; padding: 4px 6px; min-width: 140px; word-wrap: break-word; white-space: normal;">${row.ingredientName}</td>
                  ${foodColumns.map(col => {
                    const val = row.perFood[col.key];
                    return `<td style="border: 1px solid #245D6B; padding: 4px 6px; text-align: center;">${val ? `${val.toFixed(3)} kg` : '-'}</td>`;
                  }).join('')}
                  <td style="border: 1px solid #245D6B; padding: 4px 6px; text-align: center; font-weight: 600; color: #245D6B;">${row.totalKg.toFixed(3)} kg</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      // Create temporary container offscreen with print content
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.background = '#fff';
      container.innerHTML = printContent;
      document.body.appendChild(container);
      
      // Wait for fonts and rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture with html2canvas
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF
  // Create PDF in portrait orientation to match printed pages
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = (pdf as any).getImageProperties(imgData);
      const imgWidth = pageWidth - 40;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
      pdf.save(`FinalIngredientSummary_${new Date().toISOString().slice(0,10)}.pdf`);
      
      // Cleanup
      container.remove();
    } catch (err) {
      console.error('PDF export failed', err);
      alert('PDF export failed (ensure html2canvas and jspdf are installed)');
    }
  };

  // Build printable card HTML for given columns (cards per food)
  const buildCardsHtml = (cols: { key:string; name:string }[]) => {
    const headerHtml = `
      <div class="header">
        <div class="header-left">
          <h1>Final Ingredient Summary</h1>
          <div class="subtitle">${new Date().toLocaleDateString()} &middot; Powered by Kitchen Manager${selectedEventDetails ? ` &middot; ${selectedEventDetails.eventName} ${selectedEventDetails.eventYear}` : ''}</div>
        </div>
        <div class="header-right">Summary</div>
      </div>
    `;

    const cardHtml = cols.map(col => {
      // build rows for this food from ingredientMatrixRows
      const rows = ingredientMatrixRows
        .map(r => ({ ingredientName: r.ingredientName, val: r.perFood[col.key] }))
        .filter(x => x.val && x.val > 0)
        .map(x => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;">${x.ingredientName}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${x.val.toFixed(3)} kg</td></tr>`) 
        .join('');
  // compute total weight for this food (removed - not displayed in card)

      return `
        <div class="card">
          <div class="card-header">
            <div class="card-title">${col.name}</div>
            <div class="card-badge">${rows ? ingredientMatrixRows.filter(r => r.perFood[col.key] && r.perFood[col.key] > 0).length : 0} items</div>
          </div>
          <div class="card-body">
            <table class="card-table">
              <thead>
                <tr>
                  <th class="ing-col">Ingredient</th>
                  <th class="wt-col">Weight</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr class="empty-row"><td class="ing-col" colspan="2">No ingredients</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    const styles = `
      <style>
        :root { 
          --brand: #245D6B; 
          --brand-light: #2d7089;
          --brand-lighter: #e8f2f5;
          --brand-dark: #1a4650;
          --muted: #6b7c7b;
          --text-primary: #1a1a1a;
          --text-secondary: #4a5568;
          --border: #e2e8f0;
          --shadow: rgba(36, 93, 107, 0.08);
        }
        html,body{margin:0;padding:0}
        /* allow printers to try to preserve colors/backgrounds where possible */
        *, html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          color: var(--text-primary); 
          padding: 16px; 
          background: linear-gradient(135deg, #f8fafb 0%, #e8f2f5 100%);
          line-height: 1.6;
        }
        
        /* Header Section */
        .header{
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          padding: 16px 0 18px;
          border-bottom: 3px solid var(--brand);
          margin-bottom: 24px;
          background: linear-gradient(to right, rgba(36,93,107,0.03), transparent);
          padding-left: 12px;
          border-radius: 4px 4px 0 0;
        }
        .header-left h1{
          margin:0;
          font-size:24px;
          font-weight:800;
          color:var(--brand);
          letter-spacing:-0.02em;
          text-transform: uppercase;
        }
        .subtitle{
          font-size:13px;
          color:var(--text-secondary);
          margin-top:6px;
          font-weight:500;
        }
        .header-right{
          font-size:11px;
          color:var(--muted);
          text-transform:uppercase;
          letter-spacing:0.5px;
          font-weight:600;
          background:var(--brand-lighter);
          padding:6px 14px;
          border-radius:20px;
          margin-right:12px;
        }
        
        /* Card Grid: two-column grid where cards in the same row have equal height.
           Each card uses flex-column so its body can grow while table rows stay natural height. */
        .cards{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: stretch;
        }
        .card{
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          margin: 0;
          box-sizing: border-box;
        }
        .card-body{ flex: 1 1 auto; }
        @media (max-width:800px){ .cards{grid-template-columns:1fr} }

        /* Modern Card Design */
        .card{
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px var(--shadow), 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid var(--border);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }
        
        /* Card Header with Brand Color */
        .card-header{
          background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%);
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid var(--brand-dark);
        }
        .card-title{
          font-weight: 700;
          font-size: 17px;
          color: #ffffff;
          letter-spacing: -0.01em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .card-badge{
          background: rgba(255,255,255,0.25);
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.3);
        }
        
        /* Card Body */
        .card-body{
          padding: 0;
          background: #fff;
          /* allow table headers to repeat across page breaks */
          overflow: visible;
        }
        
        /* Modern Table */
        .card-table{
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        /* Ensure the table header repeats when a table is broken across pages/columns */
        .card-table thead{ display: table-header-group; }
        .card-table thead th{
          background: var(--brand-lighter);
          padding: 10px 14px;
          font-weight: 600;
          font-size: 12px;
          color: var(--brand-dark);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid var(--brand);
  }
        .card-table thead th.ing-col{ 
          text-align: left;
        }
        .card-table thead th.wt-col{ 
          text-align: right; 
          width: 110px;
        }
        
        /* Table Body Rows with Hover Effect */
        .card-table tbody tr{
          background: #fff;
          border-bottom: 1px solid var(--border);
          transition: background-color 0.15s ease;
        }
        .card-table tbody tr:last-child{
          border-bottom: none;
        }
        .card-table tbody tr:nth-of-type(even){
          background: rgba(36,93,107,0.02);
        }
        .card-table tbody tr:hover{
          background: var(--brand-lighter);
        }
        
        /* Table Cells */
        .card-table td{
          padding: 11px 14px;
          vertical-align: middle;
        }
        .ing-col{
          word-break: break-word;
          color: var(--text-primary);
          font-weight: 500;
        }
        .wt-col{
          width: 110px;
          text-align: right;
          font-variant-numeric: tabular-nums;
          color: var(--brand);
          font-weight: 600;
          white-space: nowrap;
          font-size: 13px;
        }
        .empty-row td{
          text-align: center;
          color: var(--muted);
          padding: 24px;
          font-style: italic;
        }
        
        /* Print Styles */
        /* Print Styles: use columns for printed pages so vertical flow matches preview */
        @media print {
          body{
            background: #fff;
            padding: 8px;
          }
          .header{
            margin-bottom: 12px;
            padding: 10px 0 12px;
          }
          .cards { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 12px !important; 
            align-items: stretch; 
          }
          .card { 
            display: flex !important; 
            flex-direction: column !important; 
            height: 100% !important; 
            width: 100% !important; 
            margin: 0 !important; 
            box-shadow: none;
            border: 1px solid var(--border);
          }
          .card-body{ flex: 1 1 auto !important; }
          .card-table tbody tr:hover{
            background: rgba(36,93,107,0.02);
          }
          @page{
            size: portrait;
            margin: 8mm;
          }
        }
      </style>
    `;

    return `<!doctype html><html><head><meta charset="utf-8">${styles}</head><body>${headerHtml}<div class="cards">${cardHtml}</div></body></html>`;
  };

  // Note: printing now uses the preview dialog (see handlePreviewPrint)

  const handlePrintAll = () => {
    handlePrintClose();
    if (!foodColumns.length) { alert('No food columns to print'); return; }
    const html = buildCardsHtml(foodColumns);
    // open preview dialog
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handleOpenSelectionDialog = () => {
    handlePrintClose();
    // default to all selected
    setSelectedFoodKeys(foodColumns.map(c => c.key));
    setSelectionDialogOpen(true);
  };

  const toggleFoodKey = (key: string) => {
    setSelectedFoodKeys(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  };

  const selectAllFoods = () => setSelectedFoodKeys(foodColumns.map(c => c.key));
  const deselectAllFoods = () => setSelectedFoodKeys([]);

  const handlePrintSelected = () => {
    const cols = foodColumns.filter(c => selectedFoodKeys.includes(c.key));
    if (!cols.length) { alert('Select at least one food to print'); return; }
    setSelectionDialogOpen(false);
    const html = buildCardsHtml(cols);
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  // Preview dialog state and print helper
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);



  const handlePreviewPrint = () => {
    if (!previewHtml) return;
    try {
      // Try to print from the visible preview iframe (this preserves rendering exactly as the user sees it)
      const visibleIframe = document.querySelector('iframe[title="print-preview"]') as HTMLIFrameElement | null;
      if (visibleIframe && visibleIframe.contentWindow) {
        // give the browser a moment to finish painting the iframe
        setTimeout(() => {
          try {
            visibleIframe.contentWindow!.focus();
            visibleIframe.contentWindow!.print();
          } catch (e) {
            console.error('print from visible iframe failed', e);
            alert('Print failed');
          }
          setPreviewOpen(false);
          setPreviewHtml(null);
        }, 200);
        return;
      }
    } catch (err) {
      console.error('error locating visible preview iframe', err);
    }

    // Fallback: create a temporary srcdoc iframe, wait for it to load, then print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '0';
    iframe.style.top = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    // render but keep it visually invisible so user isn't disrupted
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.srcdoc = previewHtml;
    const cleanup = () => { try { iframe.remove(); } catch {} setPreviewOpen(false); setPreviewHtml(null); };
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow as Window | null;
        if (!win) throw new Error('no iframe window');
        // slight delay to ensure fonts/images are painted
        setTimeout(() => {
          try { win.focus(); win.print(); } catch (e) { console.error('iframe print failed', e); alert('Print failed'); }
          setTimeout(cleanup, 500);
        }, 200);
      } catch (e) {
        console.error('onload print failed', e);
        cleanup();
      }
    };
    document.body.appendChild(iframe);
  };

  useEffect(() => {
    if (!selectedAnnkutEvent) { setRecipes([]); setFinalRows([]); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/recipe`, { credentials:'include', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } }).then(r=> r.ok? r.json(): []),
      fetch(`${API_BASE_URL}/final-nos-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } }).then(r=> r.ok? r.json(): null)
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

  const { ingredientMatrixRows, foodColumns } = useMemo(() => {
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
    const cols = Array.from(byFood.values()).filter(c => (c.finalFlour || 0) > 0)
      .sort((a,b)=> a.name.localeCompare(b.name));

    // If there are multiple Magaj subtypes (names starting with 'મગજ'), aggregate them into a single 'મગજ' column
    const baseNameFn = (s: string) => String(s||'').split('(')[0].trim();
    const isMagaj = (name: string) => baseNameFn(name).toLowerCase().startsWith('મગજ');
    const magajCols = cols.filter(c => isMagaj(c.name));
    let displayCols = cols;
    let magajAggregateKey = '';
    if (magajCols.length > 1) {
      // Create aggregated magaj column
      magajAggregateKey = 'magaj_agg';
      const aggregated = {
        key: magajAggregateKey,
        name: 'મગજ',
        finalFlour: magajCols.reduce((s, x) => s + (Number(x.finalFlour) || 0), 0),
        ingredients: [] as RecipeIngredient[]
      } as any;
      // Build displayCols by replacing the first group of magaj cols with aggregated
      let seenMagaj = false;
      displayCols = [];
      for (const c of cols) {
        if (isMagaj(c.name)) {
          if (!seenMagaj) { displayCols.push(aggregated); seenMagaj = true; }
          // skip other magaj cols
        } else {
          displayCols.push(c);
        }
      }
    }

    // Collect all ingredient names used by any recipe for the selected foods
    const ingSet = new Set<string>();
    cols.forEach(c => c.ingredients.forEach(i => ingSet.add(i.ingredientName)));
    const ingNames = Array.from(ingSet).sort((a,b)=> a.localeCompare(b));

    const rows = ingNames.map((ingName, idx) => {
      let total = 0;
      const perFood: Record<string, number> = {};
      // iterate displayCols (which may include an aggregated magaj column)
      displayCols.forEach(col => {
        if (magajAggregateKey && col.key === magajAggregateKey) {
          // sum across original magajCols for this ingredient
          let kgSum = 0;
          magajCols.forEach(mc => {
            const ing = mc.ingredients.find((i: RecipeIngredient) => i.ingredientName === ingName);
            if (ing && mc.finalFlour > 0) {
              kgSum += (Number(ing.kg) || 0) * (Number(mc.finalFlour) || 0);
            }
          });
          if (kgSum > 0) { perFood[col.key] = kgSum; total += kgSum; }
        } else {
          const ing = col.ingredients.find((i: RecipeIngredient) => i.ingredientName === ingName);
          if (ing && col.finalFlour > 0) {
            const kg = (Number(ing.kg) || 0) * (Number(col.finalFlour) || 0);
            if (kg > 0) { perFood[col.key] = kg; total += kg; }
          }
        }
      });
      return { id: idx+1, ingredientName: ingName, perFood, totalKg: total };
    }).filter(r => r.totalKg > 0);

    return { ingredientMatrixRows: rows, foodColumns: displayCols };
  }, [finalRows, recipes]);

  

  return (
    <Box sx={{ p:{ xs:2, sm:1 }, minHeight:'80vh' }}>
      <Box sx={{ display:'flex', alignItems:'center', mb:3 }}>
        <SummarizeIcon sx={{ color:'#245D6B', fontSize:32, mr:1 }} />
        <Typography variant="h5" sx={{ color:'#245D6B', fontWeight:700 }}>Final Ingredient Summary</Typography>
        {selectedEventDetails && <Typography variant="body1" sx={{ ml:2, color:'#666', fontStyle:'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
        <Box sx={{ ml:'auto', display:'flex', alignItems:'center', gap:1 }}>
          {/* Print menu: offers card-style Print All / Print Selected and keeps the existing Print dialog */}
          <Button variant="outlined" disabled={!selectedAnnkutEvent || !ingredientMatrixRows.length} sx={{ borderColor:'#245D6B', color:'#245D6B' }} onClick={handlePrintClick}>Print</Button>
          <Menu anchorEl={printAnchorEl} open={Boolean(printAnchorEl)} onClose={handlePrintClose}>
            <MenuItem onClick={handlePrintAll} disabled={!ingredientMatrixRows.length}>Print All Recipes</MenuItem>
            <MenuItem onClick={handleOpenSelectionDialog} disabled={!ingredientMatrixRows.length}>Print Selected Recipe</MenuItem>
            <MenuItem onClick={() => { handlePrintClose(); setPrintDialogOpen(true); }} disabled={!ingredientMatrixRows.length}>Print Table</MenuItem>
          </Menu>
          <Button variant='outlined' startIcon={<DownloadIcon />} onClick={handleExportClick} disabled={!selectedAnnkutEvent || !ingredientMatrixRows.length} sx={{ borderColor:'#245D6B', color:'#245D6B', textTransform:'none' }}>Export</Button>
          <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
            <MenuItem onClick={() => { handleExportClose(); exportToExcel(); }} disabled={!ingredientMatrixRows.length}>Export Excel</MenuItem>
            <MenuItem onClick={() => { handleExportClose(); exportToPdf(); }} disabled={!ingredientMatrixRows.length}>Export PDF</MenuItem>
          </Menu>
        </Box>
      </Box>
      <Paper elevation={3} sx={{ p:2, opacity: selectedAnnkutEvent?1:0.5, pointerEvents: selectedAnnkutEvent? 'auto':'none' }}>
        {!selectedAnnkutEvent ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#245D6B' }}>Select an Annkut event first</Box>
        ) : loading ? (
          <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress /></Box>
        ) : ingredientMatrixRows.length === 0 ? (
          <Box sx={{ textAlign:'center', py:6, fontStyle:'italic', color:'#999' }}>No ingredient data (ensure Final Nos Summary is saved).</Box>
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
            <Table className='ingredient-print-table' sx={{ width:'100%' }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff', position:'sticky', left:0, top:0, zIndex:4, minWidth:60, maxWidth:60, textAlign:'center' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight:700, background:'#245D6B', color:'#fff', position:'sticky', left:60, top:0, zIndex:4, minWidth:120, maxWidth:180, whiteSpace:'normal', overflow:'visible', lineHeight:1.2 }}>Ingredient Name</TableCell>
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
                      <TableCell sx={{ position:'sticky', left:60, background:rowBg, zIndex:2, minWidth:120, maxWidth:180, whiteSpace:'normal', overflowWrap:'break-word', lineHeight:1.2 }}>{row.ingredientName}</TableCell>
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

      <Dialog open={printDialogOpen} onClose={()=> setPrintDialogOpen(false)} maxWidth='xl' fullWidth>
        <DialogTitle>Final Ingredient Summary Print</DialogTitle>
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
            @page { size: landscape; margin: 12mm; }
            @media print {
              .ingredient-print-table { font-size: 13px !important; table-layout: fixed; width:100%; }
              .ingredient-print-table th, .ingredient-print-table td { padding: 4px 6px !important; word-wrap: break-word; white-space: normal !important; }
            }
          `}</Box>
          <Box sx={{ mb:3, borderBottom:'2px solid #245D6B', pb:1.5, '@media print': { mb:2, pb:1, borderBottom:'2px solid #245D6B' } }}>
            <Typography variant='h5' sx={{ fontWeight:700, color:'#245D6B', letterSpacing:1, '@media print': { color:'#245D6B', fontSize:26 } }}>Final Ingredient Summary Report</Typography>
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
                  <TableCell sx={{ background:'#245D6B', color:'#fff', fontWeight:700, position:'sticky', left:70, top:0, zIndex:4, minWidth:140, border:'1px solid #245D6B', whiteSpace:'normal', lineHeight:1.2, '@media print': { position:'static', left:'auto', top:'auto', minWidth:'140px', whiteSpace:'normal' } }}>Ingredient Name</TableCell>
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
                      <TableCell sx={{ position:'sticky', left:70, background:rowBg, zIndex:2, border:'1px solid #245D6B', minWidth:140, maxWidth:180, whiteSpace:'normal', overflowWrap:'break-word', lineHeight:1.2, '@media print': { position:'static', left:'auto', background:'#fff', minWidth:'140px' } }}>{row.ingredientName}</TableCell>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button onClick={()=> window.print()} variant='contained' size='small' sx={{ bgcolor:'#245D6B', textTransform:'none', '&:hover':{ bgcolor:'#1d4b56' } }}>Print</Button>
          </Box>
          <Button onClick={()=> setPrintDialogOpen(false)} size='small' sx={{ color:'#245D6B', textTransform:'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Selection dialog for printing chosen foods (modern tile UI) */}
      <Dialog
        open={selectionDialogOpen}
        onClose={()=> setSelectionDialogOpen(false)}
        maxWidth='sm'
        fullWidth
  BackdropProps={{ sx: { backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.56)' } }}
      >
        <DialogTitle sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Select Recipes to Print</span>
          <Box sx={{ display:'flex', alignItems:'center', gap:0 }}> 
            <Typography sx={{ fontSize:13, color:'#245D6B', fontWeight:600, mr:0 }}>Select All</Typography>
            <Checkbox
              checked={selectedFoodKeys.length === foodColumns.length && foodColumns.length > 0}
              onChange={(e) => { e.stopPropagation(); e.target.checked ? selectAllFoods() : deselectAllFoods(); }}
              onClick={(e) => e.stopPropagation()}
              sx={{ color: '#245D6B', '&.Mui-checked': { color: '#245D6B' }, ml: '6px', p:0 }}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb:2 }}>Choose one or more recipes. Selected recipes will be rendered as cards when printing.</DialogContentText>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
            {foodColumns.map(col => {
              const isSelected = selectedFoodKeys.includes(col.key);
              const itemCount = ingredientMatrixRows.filter(r => r.perFood[col.key] && r.perFood[col.key] > 0).length;
              return (
                <Paper
                  key={col.key}
                  onClick={() => toggleFoodKey(col.key)}
                  elevation={isSelected ? 6 : 1}
                  sx={{
                    p:1.25,
                    display:'flex',
                    flexDirection:'column',
                    gap:1,
                    cursor:'pointer',
                    borderRadius:2,
                    border: isSelected ? '2px solid var(--brand)' : '1px solid rgba(0,0,0,0.06)',
                    background: isSelected ? 'linear-gradient(180deg, rgba(36,93,107,0.06), rgba(36,93,107,0.02))' : '#fff'
                  }}
                >
                  <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <Typography sx={{ fontWeight:700, fontSize:14, color: isSelected ? '#163f3a' : '#133f3a' }}>{col.name}</Typography>
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); toggleFoodKey(col.key); }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ p:0, color:'#245D6B', '&.Mui-checked': { color: '#245D6B' } }}
                    />
                  </Box>
                  <Typography variant='body2' sx={{ color:'#4a5568' }}>{itemCount} ingredients</Typography>
                </Paper>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setSelectionDialogOpen(false)} size='small' sx={{ color:'#245D6B', textTransform:'none' }}>Cancel</Button>
          <Button onClick={handlePrintSelected} variant='contained' size='small' sx={{ bgcolor:'#245D6B', textTransform:'none', '&:hover':{ bgcolor:'#1d4b56' } }}>Print Selected</Button>
        </DialogActions>
      </Dialog>
      {/* Preview dialog for card-style print */}
      <Dialog open={previewOpen} onClose={() => { setPreviewOpen(false); setPreviewHtml(null); }} maxWidth='xl' fullWidth>
        <DialogTitle>Print Preview</DialogTitle>
        <DialogContent dividers sx={{ minHeight:400 }}>
          {previewHtml ? (
            // use iframe with srcdoc for reliable rendering
            <iframe title='print-preview' srcDoc={previewHtml} style={{ width:'100%', height: '70vh', border:0 }} />
          ) : (
            <Box sx={{ py:6, textAlign:'center' }}>No preview available</Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPreviewOpen(false); setPreviewHtml(null); }} size='small' sx={{ color:'#245D6B', textTransform:'none' }}>Cancel</Button>
          <Button onClick={handlePreviewPrint} variant='contained' size='small' sx={{ bgcolor:'#245D6B', textTransform:'none', '&:hover':{ bgcolor:'#1d4b56' } }}>Print</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinalIngredientSummary;
