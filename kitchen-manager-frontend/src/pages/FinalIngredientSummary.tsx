import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem, Checkbox, DialogContentText, Snackbar, Alert } from '@mui/material';
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
  const [foodItems, setFoodItems] = useState<{ id: number; vangiName: string; category: string }[]>([]);
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
  const buildCardsHtml = (cols: { key:string; name:string; category?:string }[]) => {
    const headerHtml = `
      <div class="header">
        <div class="header-left">
          <h1>Final Ingredient Summary</h1>
          <div class="subtitle">${new Date().toLocaleDateString()} &middot; Powered by Kitchen Manager${selectedEventDetails ? ` &middot; ${selectedEventDetails.eventName} ${selectedEventDetails.eventYear}` : ''}</div>
        </div>
        <div class="header-right">Summary</div>
      </div>
    `;

    // Group cols by category for printing
    const categoryGroups: { category: string; cols: typeof cols }[] = [];
    cols.forEach(col => {
      const cat = col.category || 'Uncategorized';
      const group = categoryGroups.find(g => g.category === cat);
      if (group) group.cols.push(col);
      else categoryGroups.push({ category: cat, cols: [col] });
    });

    const cardHtml = categoryGroups.map(group => {
      const categoryHeaderHtml = `
        <div class="category-header">
          <div class="category-title">${group.category}</div>
          <div class="category-count">${group.cols.length} recipe${group.cols.length > 1 ? 's' : ''}</div>
        </div>
      `;
      
      const cardsInCategory = group.cols.map(col => {
        // build rows for this food from ingredientMatrixRows (data rows)
        const dataRows = ingredientMatrixRows
          .map(r => ({ ingredientName: r.ingredientName, val: r.perFood[col.key] }))
          .filter(x => x.val && x.val > 0);

        // If there are no ingredients, render a single empty fragment
        if (!dataRows.length) {
          return `
            <div class="card">
              <div class="card-header">
                <div class="card-title">${col.name}</div>
                <div class="card-badge">0 items</div>
              </div>
              <div class="card-body">
                <table class="card-table">
                  <colgroup>
                    <col style="width:36px" />
                    <col />
                    <col style="width:110px" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th class="num-col">#</th>
                      <th class="ing-col">Ingredient</th>
                      <th class="wt-col">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="empty-row"><td class="ing-col" colspan="3">No ingredients</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }

        // Conservative estimate of rows that fit in a printed card fragment
        // This depends on font-size, paddings and page size; 18 is a safe starting point
        const rowsPerFragment = 18;
        const fragments: string[] = [];
        const totalFragments = Math.max(1, Math.ceil(dataRows.length / rowsPerFragment));

        for (let f = 0; f < totalFragments; f++) {
          const slice = dataRows.slice(f * rowsPerFragment, (f + 1) * rowsPerFragment);
          const rowsHtml = slice.map((x, idx) => {
            const globalIndex = f * rowsPerFragment + idx + 1;
            return `<tr><td class="num-col">${globalIndex}</td><td class="ing-col">${x.ingredientName}</td><td class="wt-col">${x.val.toFixed(3)} kg</td></tr>`;
          }).join('');

          const continuedLabel = totalFragments > 1 && f > 0 ? '<span class="continued-badge">(continued)</span>' : '';
          const footerContinued = totalFragments > 1 && f < totalFragments - 1 ? '<div class="continue-footer">Continued on next page...</div>' : '';

          fragments.push(`
            <div class="card card-fragment">
              <div class="card-header">
                <div class="card-title">${col.name} ${continuedLabel}</div>
                <div class="card-badge">${dataRows.length} items</div>
              </div>
              <div class="card-body">
                <table class="card-table">
                  <colgroup>
                    <col style="width:36px" />
                    <col />
                    <col style="width:110px" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th class="num-col">#</th>
                      <th class="ing-col">Ingredient</th>
                      <th class="wt-col">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
              ${footerContinued}
            </div>
          `);
        }

        return fragments.join('');
      }).join('');

      return categoryHeaderHtml + `<div class="cards">${cardsInCategory}</div>`;
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
          font-weight:600;
          color:var(--brand);
          letter-spacing:-0.02em;
          text-transform: none;
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
        
        /* Category Header for grouped sections */
        .category-header{
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, rgba(36,93,107,0.08) 0%, rgba(36,93,107,0.04) 100%);
          border-left: 4px solid var(--brand);
          padding: 12px 18px;
          margin-top: 24px;
          margin-bottom: 16px;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .category-header:first-of-type{
          margin-top: 0;
        }
        .category-title{
          font-size: 18px;
          font-weight: 700;
          color: var(--brand);
          letter-spacing: -0.01em;
        }
        .category-count{
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          background: rgba(255,255,255,0.8);
          padding: 4px 10px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        /* Card Grid: two-column grid where cards in the same row have equal height.
           Each card uses flex-column so its body can grow while table rows stay natural height. */
        .cards{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: stretch;
          margin-bottom: 16px;
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
          padding: 10px 12px;
          font-weight: 600;
          font-size: 12px;
          color: var(--brand-dark);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid var(--brand);
          box-sizing: border-box;
        }
        .card-table thead th.ing-col{ 
          text-align: left;
        }
        .card-table thead th.wt-col{ 
          text-align: right; 
          width: 110px;
        }

        /* Number column */
        .num-col{
          width: 36px;
          text-align: center;
          font-weight: 700;
          color: var(--brand-dark);
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
          padding: 10px 12px;
          vertical-align: middle;
          box-sizing: border-box;
        }
        .ing-col{
          word-break: break-word;
          color: var(--text-primary);
          font-weight: 500;
          text-align: left;
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

        /* Continuation indicators when a card is split across pages */
        .continued-badge{
          display:inline-block;
          font-size:12px;
          color: rgba(255,255,255,0.9);
          background: rgba(0,0,0,0.12);
          padding: 2px 8px;
          border-radius: 10px;
          margin-left: 8px;
          font-weight:600;
          vertical-align: middle;
        }
        .continue-footer{
          font-size:12px;
          color: var(--muted);
          padding: 8px 14px;
          text-align: right;
          border-top: 1px dashed var(--border);
          margin-top: 8px;
        }

        /* Footer for preview showing current page / total pages */
        .print-footer{
          position: fixed;
          right: 18px;
          bottom: 18px;
          background: rgba(255,255,255,0.95);
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
          font-size: 12px;
          color: var(--muted);
          z-index: 9999;
        }
        
        /* Print Styles */
        /* Print Styles: use columns for printed pages so vertical flow matches preview */
        @media print {
          body{
            background: #fff;
            padding: 8px;
            /* ensure printable content doesn't get overlapped by the footer */
            padding-bottom: 20mm !important;
          }
          .header{
            margin-bottom: 12px;
            padding: 10px 0 12px;
          }
          .category-header{
            margin-top: 16px;
            margin-bottom: 12px;
            page-break-after: avoid;
          }
          .category-header:first-of-type{
            margin-top: 0;
          }
          .cards { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 12px !important; 
            align-items: stretch;
            margin-bottom: 12px;
          }
          .card { 
            display: flex !important; 
            flex-direction: column !important; 
            height: 100% !important; 
            width: 100% !important; 
            margin: 0 !important; 
            box-shadow: none;
            border: 1px solid var(--border);
            /* allow card fragments to break across pages; individual fragments should avoid internal breaks */
            page-break-inside: auto;
          }
          .card-fragment{ page-break-inside: avoid; }
          .card-body{ flex: 1 1 auto !important; }
          .card-table tbody tr:hover{
            background: rgba(36,93,107,0.02);
          }
          /* Allow the two-column grid of cards to break across pages.
             This ensures rows like [5,6] can split so part of card 5/6
             can appear on the previous page and the remainder continues
             on the next page. Individual card fragments should not be
             split internally. */
          .cards{
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
            align-items: start;
            /* allow the grid to be broken across pages */
            page-break-inside: auto;
            break-inside: auto;
            -webkit-column-break-inside: auto;
          }
          /* ensure each fragment stays whole (no internal breaks) */
          .cards > .card-fragment{ page-break-inside: avoid; break-inside: avoid; }
          /* Ensure table headers behave as header group so columns align with data when printing */
          .card-table thead { display: table-header-group !important; }
          @page{
            size: portrait;
            /* smaller bottom margin while keeping space for footer */
            margin: 3mm 3mm 3mm 3mm;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: ""; }
            @bottom-center { content: ""; }
            @bottom-right { content: ""; }
          }
          /* Give the body a bit of padding so content doesn't run into the footer area */
          body { padding-bottom: 3mm !important; }
          /* In printed output, show footers with page numbers */
          .print-footer{
            display: block !important;
            position: fixed !important;
            right: 2mm !important;
            bottom: 2mm !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            color: #6b7c7b !important;
            font-size: 12px !important;
            z-index: 9999 !important;
          }
          /* Additional page footers positioned at specific heights */
          .print-footer-page{
            position: absolute !important;
            right: 2mm !important;
            bottom: 2mm !important;
          }
          /* Server-side / headless print: use CSS counters to reliably render "Page X of Y" */
          .paged-footer{ display: none; }
          @media print {
            /* Hide JS preview footers when performing actual print so CSS paged footer is used */
            .print-footer, .print-footer-page { display: none !important; }
            .paged-footer{ display:block; position: fixed; right: 2mm; bottom: 2mm; color: #6b7c7b; font-size: 12px; }
            /* Use CSS counters for page/pagination — supported by headless browsers like Puppeteer */
            .paged-footer::after{ content: "Page " counter(page) " of " counter(pages); }
            html { counter-reset: page; }
            @page { size: A4; counter-increment: page; }
          }
        }
      </style>
    `;

  // Footer HTML and JS to compute page numbers for both preview and print
    const footerAndScript = `
      <div style="height:18px;">&nbsp;</div>
  <div class="print-footer" id="print-footer-main">Page <span class="page-current">1</span> of <span class="page-total">1</span></div>
  <div class="paged-footer" aria-hidden="true"></div>
      <script>
        (function(){
          try{
            // Convert millimeters to CSS pixels (assuming 96dpi for preview measurement)
            const mmToPx = mm => mm * (96/25.4);
            // A4 portrait height (mm) minus @page vertical margins (8mm top + 14mm bottom as in styles)
            const contentHeightMm = 297 - 22; // 8mm top + 14mm bottom
            // Prefer the iframe viewport height when available (this matches preview pages)
            const pageHeightPx = (window && window.innerHeight) ? window.innerHeight : Math.max(200, Math.round(mmToPx(contentHeightMm)));

            const updateTotals = () => {
              const total = Math.max(1, Math.ceil(document.body.scrollHeight / pageHeightPx));
              document.querySelectorAll('.page-total').forEach(el => el.textContent = String(total));
              // update current page based on scroll position for the preview iframe
              const current = Math.min(total, Math.max(1, Math.ceil((window.scrollY + 1) / pageHeightPx)));
              document.querySelectorAll('.page-current').forEach(el => el.textContent = String(current));
            };

            // Run once after rendering
            setTimeout(updateTotals, 120);
            // Update on resize/scroll to reflect preview navigation
            window.addEventListener('resize', updateTotals);
            window.addEventListener('scroll', updateTotals);

            // Page numbers are now injected directly in handlePreviewPrint before printing
          } catch(e) { console.error('page numbering script error', e); }
        })();
      </script>
    `;

    return `<!doctype html><html><head><meta charset="utf-8">${styles}</head><body>${headerHtml}<div>${cardHtml}</div>${footerAndScript}</body></html>`;
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
    if (!cols.length) {
      // show snackbar error
      setSnack({ open: true, message: 'Please select at least one recipe', severity: 'error' });
      return;
    }
    setSelectionDialogOpen(false);
    const html = buildCardsHtml(cols);
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  // Preview dialog state and print helper
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'error'|'info'|'success'|'warning' }>({ open:false, message:'', severity:'info' });



  const handlePreviewPrint = () => {
    if (!previewHtml) return;
    try {
      // Try to print from the visible preview iframe (this preserves rendering exactly as the user sees it)
      const visibleIframe = document.querySelector('iframe[title="print-preview"]') as HTMLIFrameElement | null;
      if (visibleIframe && visibleIframe.contentWindow) {
        // give the browser a moment to finish painting the iframe
        setTimeout(() => {
          try {
            // Compute page numbers and inject footers before printing
            const win = visibleIframe.contentWindow as Window;
            const doc = win.document;
            const mmToPx = (mm: number) => mm * (96/25.4);
            const contentHeightMm = 297 - 22; // A4 height minus margins
            // Prefer the iframe viewport height if available for accurate counts
            const iframeHeight = win.innerHeight || win.document.documentElement.clientHeight || 0;
            const pageHeightPx = iframeHeight || Math.max(200, Math.round(mmToPx(contentHeightMm)));
            const total = Math.max(1, Math.ceil(doc.body.scrollHeight / pageHeightPx));

            // Clear existing page footers
            doc.querySelectorAll('.print-footer-page').forEach(el => el.remove());
            
            // Update main footer for page 1
            const mainFooter = doc.getElementById('print-footer-main');
            if (mainFooter) {
              mainFooter.innerHTML = `Page <span class=\"page-current\">1</span> of <span class=\"page-total\">${total}</span>`;
            }

            // Create footers for pages 2 through total
            for (let i = 2; i <= total; i++) {
              const footer = doc.createElement('div');
              footer.className = 'print-footer print-footer-page';
              footer.textContent = `Page ${i} of ${total}`;
              footer.style.position = 'absolute';
              footer.style.right = '2mm';
              footer.style.bottom = '2mm';
              footer.style.marginTop = `${(i - 1) * pageHeightPx}px`;
              footer.style.color = '#6b7c7b';
              footer.style.fontSize = '12px';
              doc.body.appendChild(footer);
            }

            // Small delay to ensure footers are rendered before print
            setTimeout(() => {
              if (visibleIframe.contentWindow) {
                try {
                  // Add afterprint listener to close preview dialog when print dialog closes
                  const handleAfterPrint = () => {
                    // Clean up page footers
                    doc.querySelectorAll('.print-footer-page').forEach(el => el.remove());
                    if (mainFooter) {
                      mainFooter.innerHTML = `Page <span class="page-current">1</span> of <span class="page-total">${total}</span>`;
                    }
                    // Close the preview dialog
                    setPreviewOpen(false);
                    setPreviewHtml(null);
                    // Remove the event listener
                    visibleIframe.contentWindow?.removeEventListener('afterprint', handleAfterPrint);
                  };
                  
                  visibleIframe.contentWindow.addEventListener('afterprint', handleAfterPrint);
                  visibleIframe.contentWindow.focus();
                  visibleIframe.contentWindow.print();
                } catch (focusErr) {
                  console.warn('Focus/print failed, trying without focus', focusErr);
                  try {
                    visibleIframe.contentWindow.print();
                  } catch (printErr) {
                    console.error('Print failed', printErr);
                  }
                }
              }
            }, 100);
          } catch (e) {
            console.error('print from visible iframe failed', e);
            alert('Print failed');
          }
          // Don't close the preview dialog - let user close it manually after printing
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
          try {
            // Compute and inject page footers
            const doc = win.document;
            const mmToPx = (mm: number) => mm * (96/25.4);
            const contentHeightMm = 297 - 22;
            // Prefer the iframe viewport height when available for more accurate page calculations
            const iframeHeight = win.innerHeight || win.document.documentElement.clientHeight || 0;
            const pageHeightPx = iframeHeight || Math.max(200, Math.round(mmToPx(contentHeightMm)));
            const total = Math.max(1, Math.ceil(doc.body.scrollHeight / pageHeightPx));

            const mainFooter = doc.getElementById('print-footer-main');
            if (mainFooter) {
              mainFooter.innerHTML = `Page <span class=\"page-current\">1</span> of <span class=\"page-total\">${total}</span>`;
            }

            for (let i = 2; i <= total; i++) {
              const footer = doc.createElement('div');
              footer.className = 'print-footer print-footer-page';
              footer.textContent = `Page ${i} of ${total}`;
              footer.style.position = 'absolute';
              footer.style.right = '2mm';
              footer.style.bottom = '2mm';
              footer.style.marginTop = `${(i - 1) * pageHeightPx}px`;
              footer.style.color = '#6b7c7b';
              footer.style.fontSize = '12px';
              doc.body.appendChild(footer);
            }

            setTimeout(() => {
              try {
                if (win) {
                  win.focus();
                  win.print();
                }
              } catch (err) {
                console.warn('Focus failed, trying print without focus', err);
                if (win) {
                  try {
                    win.print();
                  } catch (printErr) {
                    console.error('Print failed', printErr);
                  }
                }
              }
            }, 100);
          } catch (e) { console.error('iframe print failed', e); alert('Print failed'); }
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
      fetch(`${API_BASE_URL}/final-nos-summary/latest?eventId=${selectedAnnkutEvent}`, { credentials:'include', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } }).then(r=> r.ok? r.json(): null),
      fetch(`${API_BASE_URL}/food-item`, { credentials:'include', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } }).then(r=> r.ok? r.json(): [])
    ]).then(([recipesData, finalData, foodItemsData]) => {
      setRecipes(Array.isArray(recipesData)? recipesData: []);
      setFoodItems(Array.isArray(foodItemsData) ? foodItemsData : []);
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

  const { ingredientMatrixRows, foodColumns, groupedColumns } = useMemo(() => {
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

    // We'll attach category information from foodItems (if available) after displayCols is determined

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

    // Attach category info to the actual displayCols so headers align with rendered columns
    const foodItemMap = new Map((foodItems || []).map((f:any) => [normalize(f.vangiName), f]));
    const displayColsWithCategory = displayCols.map((c:any) => {
      if (c.key === magajAggregateKey) {
        // aggregated magaj column - try to derive category from first magajCols entry
        const first = magajCols[0];
        let cat = 'Uncategorized';
        if (first) {
          const item = foodItemMap.get(normalize(first.name)) || foodItemMap.get(normalize(baseName(first.name)));
          cat = item ? (item.category || 'Uncategorized') : 'Uncategorized';
        }
        return { ...c, category: cat };
      }
      const n = normalize(c.name);
      let item = foodItemMap.get(n);
      if (!item) item = foodItemMap.get(normalize(baseName(c.name)));
      const category = item ? (item.category || 'Uncategorized') : 'Uncategorized';
      return { ...c, category };
    });

    const grouped: { category: string; cols: typeof displayColsWithCategory }[] = [];
    displayColsWithCategory.forEach((c:any) => {
      const g = grouped.find(x => x.category === c.category);
      if (g) g.cols.push(c);
      else grouped.push({ category: c.category || 'Uncategorized', cols: [c] });
    });

    return { ingredientMatrixRows: rows, foodColumns: displayColsWithCategory, groupedColumns: grouped };
  }, [finalRows, recipes, foodItems]);

  // Compute a reasonable minimum table width so many food columns force horizontal scroll
  const tableMinWidth = Math.max(900, (foodColumns.length * 140) + 60 + 260 + 120);

  

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
            <Table className='ingredient-print-table' stickyHeader sx={{ border: '1px solid #245D6B', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', '& th, & td': { border: '0.5px solid #245D6B' }, '& tbody td': { borderTop: 0 }, minWidth: `${tableMinWidth}px` }}>
              <colgroup>
                <col style={{ width: '60px' }} />
                <col style={{ width: '260px' }} />
                {foodColumns.map(() => (<col style={{ width: '140px' }} />))}
                <col style={{ width: '120px' }} />
              </colgroup>
              <TableHead sx={{
                position: 'sticky',
                top: 0,
                zIndex: 3,
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
                '& th': {
                  border: '0 !important',
                  backgroundClip: 'padding-box',
                  boxShadow: 'inset -1px 0 rgba(255,255,255,0.6)'
                },
                '& tr:first-of-type th': {
                  boxShadow: 'inset -1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.7)'
                },
                '& .MuiTableCell-head': { borderBottom: '0 !important' }
              }}>
                <TableRow>
          <TableCell rowSpan={2} sx={{ fontWeight:700, background:'#245D6B', color:'#fff', position:'sticky', left:0, top:0, zIndex:5, width:60, textAlign:'center' }}>ID</TableCell>
          <TableCell rowSpan={2} sx={{ fontWeight:700, background:'#245D6B', color:'#fff', position:'sticky', left:60, top:0, zIndex:5, width:260, whiteSpace:'normal', overflow:'visible', lineHeight:1.2 }}>Ingredient Name</TableCell>
                  {groupedColumns && groupedColumns.map(group => (
                    <TableCell key={`g-${group.category}`} colSpan={group.cols.length} sx={{ fontWeight:700, background:'#245D6B', color:'#fff', textAlign:'center' }}>{group.category}</TableCell>
                  ))}
                  <TableCell rowSpan={2} sx={{ fontWeight:700, background:'#245D6B', color:'#fff', textAlign:'center', whiteSpace:'nowrap' }}>Total Weight</TableCell>
                </TableRow>
                <TableRow>
                  {groupedColumns && groupedColumns.map(group => (
                    group.cols.map(col => (
                      <TableCell key={`c-${col.key}`} sx={{ fontWeight:700, background:'#245D6B', color:'#fff', whiteSpace:'nowrap', textAlign:'center' }}>{col.name}</TableCell>
                    ))
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {ingredientMatrixRows.map((row, idx) => {
                  const rowBg = idx % 2 === 0 ? '#f7fbfc' : '#eaf3f6';
                  return (
                    <TableRow key={row.id} sx={{ backgroundColor: rowBg }}>
                      <TableCell sx={{ position:'sticky', left:0, background:rowBg, textAlign:'center', zIndex:2, width:60 }}>{row.id}</TableCell>
                      <TableCell sx={{ position:'sticky', left:60, background:rowBg, zIndex:2, width:260, whiteSpace:'normal', overflowWrap:'break-word', lineHeight:1.2 }}>{row.ingredientName}</TableCell>
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
            <Table className='ingredient-print-table' stickyHeader sx={{ border: '1px solid #245D6B', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', fontSize:13, '& th, & td': { border: '0.5px solid #245D6B' }, '& tbody td': { borderTop: 0 }, '@media print': { tableLayout:'fixed', width:'100%', fontSize:13 }, minWidth: `${tableMinWidth}px` }}>
              <colgroup>
                <col style={{ width: '70px' }} />
                <col style={{ width: '260px' }} />
                {foodColumns.map(() => (<col style={{ width: '140px' }} />))}
                <col style={{ width: '140px' }} />
              </colgroup>
              <TableHead sx={{
                position: 'sticky',
                top: 0,
                zIndex: 3,
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
                '& th': {
                  border: '0 !important',
                  backgroundClip: 'padding-box',
                  boxShadow: 'inset -1px 0 rgba(255,255,255,0.6)'
                },
                '& tr:first-of-type th': {
                  boxShadow: 'inset -1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.7)'
                },
                '& .MuiTableCell-head': { borderBottom: '0 !important' }
              }}>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ background:'#245D6B', color:'#fff', fontWeight:700, position:'sticky', left:0, top:0, zIndex:5, width:70, border:'1px solid #245D6B', textAlign:'center', whiteSpace:'nowrap', '@media print': { position:'static', left:'auto', top:'auto' } }}>ID</TableCell>
                  <TableCell rowSpan={2} sx={{ background:'#245D6B', color:'#fff', fontWeight:700, position:'sticky', left:70, top:0, zIndex:5, width:260, border:'1px solid #245D6B', whiteSpace:'normal', lineHeight:1.2, '@media print': { position:'static', left:'auto', top:'auto', minWidth:'140px', whiteSpace:'normal' } }}>Ingredient Name</TableCell>
                  {groupedColumns && groupedColumns.map(group => (
                    <TableCell key={`gprint-${group.category}`} colSpan={group.cols.length} sx={{ background:'#245D6B', color:'#fff', fontWeight:700, border:'1px solid #245D6B', textAlign:'center', '@media print': { whiteSpace:'normal' } }}>{group.category}</TableCell>
                  ))}
                  <TableCell rowSpan={2} sx={{ background:'#245D6B', color:'#fff', fontWeight:700, border:'1px solid #245D6B', whiteSpace:'nowrap', textAlign:'center', top:0, '@media print': { whiteSpace:'normal' } }}>Total Weight</TableCell>
                </TableRow>
                <TableRow>
                  {groupedColumns && groupedColumns.map(group => (
                    group.cols.map(col => (
                      <TableCell key={`cprint-${col.key}`} sx={{ background:'#245D6B', color:'#fff', fontWeight:700, border:'1px solid #245D6B', whiteSpace:'nowrap', textAlign:'center', top:0, '@media print': { whiteSpace:'normal' } }}>{col.name}</TableCell>
                    ))
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {ingredientMatrixRows.map((row, idx) => {
                  const rowBg = idx % 2 === 0 ? '#f7fbfc' : '#eaf3f6';
                  return (
                    <TableRow key={row.id} sx={{ backgroundColor: rowBg, '@media print': { backgroundColor: '#fff' } }}>
                      <TableCell sx={{ position:'sticky', left:0, background:rowBg, zIndex:2, border:'1px solid #245D6B', textAlign:'center', width:70, '@media print': { position:'static', left:'auto', background:'#fff' } }}>{row.id}</TableCell>
                      <TableCell sx={{ position:'sticky', left:70, background:rowBg, zIndex:2, border:'1px solid #245D6B', width:260, whiteSpace:'normal', overflowWrap:'break-word', lineHeight:1.2, '@media print': { position:'static', left:'auto', background:'#fff', minWidth:'140px' } }}>{row.ingredientName}</TableCell>
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

          {/* Group foods by category */}
          {(() => {
            // Create a map of category to foods
            const categoryMap = new Map<string, typeof foodColumns>();
            foodColumns.forEach(col => {
              const cat = col.category || 'Other';
              if (!categoryMap.has(cat)) categoryMap.set(cat, []);
              categoryMap.get(cat)!.push(col);
            });

            // Render each category group
            return Array.from(categoryMap.entries()).map(([category, cols]) => (
              <Box key={category} sx={{ mb: 3 }}>
                {/* Category Header */}
                <Typography 
                  sx={{ 
                    fontSize: 16, 
                    fontWeight: 700, 
                    color: '#245D6B',
                    mb: 1.5,
                    pb: 0.5,
                    borderBottom: '2px solid #245D6B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {category}
                </Typography>

                {/* Food Items Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
                  {cols.map(col => {
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
              </Box>
            ));
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setSelectionDialogOpen(false)} size='small' sx={{ color:'#245D6B', textTransform:'none' }}>Cancel</Button>
          <Button onClick={handlePrintSelected} variant='contained' size='small' sx={{ bgcolor:'#245D6B', textTransform:'none', '&:hover':{ bgcolor:'#1d4b56' } }}>Print Selected</Button>
        </DialogActions>
      </Dialog>
      {/* Preview dialog for card-style print */}
      <Dialog 
        open={previewOpen} 
        onClose={() => { setPreviewOpen(false); setPreviewHtml(null); }} 
        maxWidth='xl' 
        fullWidth
        disableEnforceFocus
        disableRestoreFocus
      >
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
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open:false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnack(s => ({ ...s, open:false }))} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FinalIngredientSummary;
