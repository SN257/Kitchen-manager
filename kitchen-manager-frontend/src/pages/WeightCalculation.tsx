import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, DialogActions, Menu, MenuItem } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import '../App.css'; 

interface Mithai {
  id: number;
  vangiName: string;
  gram: number;
}

interface BoxRange {
  id: number;
  priceRange: string;
  gramPerBox: number;
}

const WeightCalculation: React.FC = () => {
  
  const getTotalGram = (mithai: Mithai, boxId: number): number => {
    const piecesCount = Number(pieces[`${mithai.id}_${boxId}`]) || 0;
    return piecesCount * mithai.gram;
  };

  // Recompute Annkut Nos Summary and persist rows by calling the annkut-sidhu-saman endpoint.
  // This mirrors the server-side recompute done for vasan entries; here we perform
  // the same aggregation client-side after weight autosave so the AnnkutNosSummary
  // page will reflect changes without an explicit visit.
  const recomputeAndSaveAnnkutSummary = async () => {
    if (!selectedAnnkutEvent) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Fetch box totals (box-weight-entries)
      const boxRes = await fetch(`${API_BASE_URL}/box-weight-entries?eventId=${selectedAnnkutEvent}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const boxData = await boxRes.json().catch(() => []);
      const boxTotals: { [priceRange: string]: number } = {};
      (Array.isArray(boxData) ? boxData : []).forEach((b: any) => {
        boxTotals[b.priceRange] = Number(b.totalBoxes) || 0;
      });

      // Fetch recipes
      const recipesRes = await fetch(`${API_BASE_URL}/recipe`, {
        credentials: 'include',
        headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : {},
      });
      const recipes = await recipesRes.json().catch(() => []);

      // Compute totals per mithai using current pieces and boxTotals
      for (const mithai of mithais) {
        const totalNang = boxRanges.reduce((sum, box) => {
          const nang = Number(pieces[`${mithai.id}_${box.id}`]) || 0;
          const totalBoxes = boxTotals[box.priceRange] || 0;
          return sum + nang * totalBoxes;
        }, 0);

        // find recipe by base name
        const baseName = (name: string) => name.split('(')[0].trim().toLowerCase();
        const mithaiBase = baseName(mithai.vangiName || '');
        const recipeEntry = (recipes || []).find((r: any) => r.vangiName && baseName(r.vangiName) === mithaiBase);

        let itemPerKg = null;
        if (recipeEntry && recipeEntry.items_per_kg !== undefined && recipeEntry.items_per_kg !== null && String(recipeEntry.items_per_kg).trim() !== '') {
          itemPerKg = Number(String(recipeEntry.items_per_kg).replace(',', '.').replace(/[^0-9.]/g, ''));
        }

        const nosFromItemPerKg = (mithai.gram && itemPerKg && itemPerKg > 0)
          ? Math.floor((itemPerKg * 1000) / mithai.gram)
          : null;

        const flourKg = (typeof nosFromItemPerKg === 'number' && nosFromItemPerKg > 0)
          ? Number((totalNang / nosFromItemPerKg).toFixed(2))
          : null;

        // Only POST if we have meaningful totals
        if (totalNang > 0 && flourKg !== null && !isNaN(flourKg)) {
          try {
            await fetch(`${API_BASE_URL}/annkut-sidhu-saman`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                mithai_id: Number(mithai.id),
                mithai_name: String(mithai.vangiName),
                total_nang: Number(totalNang),
                total_flour: Number(flourKg),
                nos_per_kg: Number(nosFromItemPerKg || 0),
                eventId: Number(selectedAnnkutEvent),
              }),
            });
          } catch (err) {
            console.warn('Failed to save annkut row for', mithai.vangiName, err);
          }
        }
      }
    } catch (err) {
      console.warn('Recompute annkut failed', err);
    }
  };
  const handlePieceChange = (mithaiId: number, boxId: number, value: string) => {
    setPieces(prevPieces => ({
      ...prevPieces,
      [`${mithaiId}_${boxId}`]: value,
    }));
    setIsDirty(true);
  };
  const [mithais, setMithais] = useState<Mithai[]>([]);
  const [boxRanges, setBoxRanges] = useState<BoxRange[]>([]);
  const [pieces, setPieces] = useState<{ [key: string]: string }>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [, setIsDirty] = useState(false);
  const [entryId, setEntryId] = useState<number | null>(null);
  const [gramWarnings, setGramWarnings] = useState<string[]>([]);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const saveTimeoutRef = React.useRef<number | null>(null);
  const inFlightSaveRef = React.useRef<string>('');
  const [lastSavedSignature, setLastSavedSignature] = React.useState<string>('');
  
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const exportToExcel = async () => {
    handleExportClose();
    try {
      const XLSX = await import('xlsx');
      const rows = mithais.slice().map((m) => {
        const obj: any = { 'Food Name': m.vangiName, '1 Piece Weight (g)': m.gram };
        boxRanges.forEach((b) => {
          obj[b.priceRange] = pieces[`${m.id}_${b.id}`] || 0;
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ width: 30 }, { width: 18 }, ...boxRanges.map(() => ({ width: 12 }))];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Weight Calculation');
      XLSX.writeFile(wb, `Weight_Calculation_${selectedEventDetails?.eventName || 'Export'}.xlsx`);
    } catch (err) {
      console.error('Export to Excel failed', err);
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    }
  };

  const exportToPdf = async () => {
    handleExportClose();
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const printSection = document.querySelector('#weight-calculation-print');
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.innerHTML = printSection ? printSection.innerHTML : '<div>No data</div>';
      document.body.appendChild(tempDiv);
      const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: '#ffffff', logging: false });
      document.body.removeChild(tempDiv);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Weight_Calculation_${selectedEventDetails?.eventName || 'Export'}.pdf`);
    } catch (err) {
      console.error('Export to PDF failed', err);
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    }
  };

  // Refresh data when event is selected
  useEffect(() => {
    if (selectedAnnkutEvent) {
      fetchData();
    } else {
      // Clear data when no event is selected
      setMithais([]);
      setBoxRanges([]);
      setEntryId(null);
      setPieces({});
    }
  }, [selectedAnnkutEvent]);

  const fetchData = () => {
    if (!selectedAnnkutEvent) {
      setMithais([]);
      setBoxRanges([]);
      setEntryId(null);
      setPieces({});
      return;
    }

      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

    fetch(`${API_BASE_URL}/weight-entries?eventId=${selectedAnnkutEvent}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setMithais(data || []));
    
    fetch(`${API_BASE_URL}/box-ranges?eventId=${selectedAnnkutEvent}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setBoxRanges(data || []));
    
    fetch(`${API_BASE_URL}/weight-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.id && data.entries) {
          setEntryId(data.id);
          const newPieces: { [key: string]: string } = {};
          data.entries.forEach((mithai: any) => {
            mithai.boxEntries.forEach((boxEntry: any) => {
              newPieces[`${mithai.mithaiId}_${boxEntry.boxId}`] = String(boxEntry.pieces);
            });
          });
          setPieces(newPieces);
        } else {
          setEntryId(null);
          setPieces({});
        }
      });
  };

  // Manual save removed — pieces now autosave on change (debounced)

  // Add useEffect to calculate gram warnings
  useEffect(() => {
    if (!selectedAnnkutEvent || mithais.length === 0 || boxRanges.length === 0) {
      setGramWarnings([]);
      return;
    }

    const warnings: string[] = [];

    // Check each box range for gram warnings
    boxRanges.forEach(box => {
      const totalGramForBox = mithais.reduce((sum, mithai) => {
        const piecesCount = Number(pieces[`${mithai.id}_${box.id}`]) || 0;
        return sum + (piecesCount * mithai.gram);
      }, 0);

      // Only show warning if total gram exceeds box capacity
      if (totalGramForBox > box.gramPerBox) {
        warnings.push(
          `${box.priceRange}: Total weight (${totalGramForBox}g) exceeds box capacity (${box.gramPerBox}g) by ${totalGramForBox - box.gramPerBox}g`
        );
      }
    });

    setGramWarnings(warnings);
  }, [mithais, boxRanges, pieces, selectedAnnkutEvent]);

  // Debounced autosave: save pieces to backend when changed and there are no gram warnings
  React.useEffect(() => {
    const signature = JSON.stringify(pieces);
  if (signature === lastSavedSignature) return;
  // Note: do NOT block autosave when gramWarnings exist. Warnings should be shown
  // but not prevent saving to the database. This allows operators to persist data
  // while still being notified of capacity issues.

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
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
        const dataToSave = mithais.map(mithai => {
          const boxEntries = boxRanges
            .map(box => ({ boxId: box.id, pieces: Number(pieces[`${mithai.id}_${box.id}`]) || 0 }))
            .filter(be => be.pieces > 0);
          if (boxEntries.length === 0) return null;
          return { mithaiId: mithai.id, mithaiName: mithai.vangiName, boxEntries, totalNang: boxEntries.reduce((s, b) => s + b.pieces, 0), totalGram: boxEntries.reduce((s, b) => s + b.pieces * mithai.gram, 0) };
        }).filter(Boolean);

        if ((!dataToSave || dataToSave.length === 0) && !entryId) {
          setLastSavedSignature(signature);
          setAutoSaving(false);
          inFlightSaveRef.current = '';
          return;
        }

        const res = await fetch(`${API_BASE_URL}/weight-calculation-entries${entryId ? `/${entryId}` : ''}`, {
          method: entryId ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ entries: dataToSave, eventId: selectedAnnkutEvent })
        });

        if (res.ok) {
          const result = await res.json().catch(() => null);
          if (!entryId && result && result.id) setEntryId(result.id);
          setLastSavedSignature(signature);
          // Recompute and save Annkut Nos Summary on server so summary pages reflect changes
          // without requiring the user to visit the AnnkutNosSummary page.
          try {
            await recomputeAndSaveAnnkutSummary();
          } catch (err) {
            // Do not fail the save if recompute fails; just log for debugging
            console.warn('Recompute Annkut summary failed', err);
          }
        } else {
          console.warn('Weight autosave failed');
          setSnackbar({ open: true, message: 'Auto-save failed', severity: 'error' });
        }
      } catch (e) {
        console.error('Weight autosave error', e);
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
  }, [pieces, gramWarnings, mithais, boxRanges, selectedAnnkutEvent, API_BASE_URL, entryId, lastSavedSignature]);

  return (
    <Box sx={{ p: { xs: 2, sm: 1 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CalculateIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
          <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
            Weight Calculation
          </Typography>
          {selectedEventDetails && (
            <Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>
              - {selectedEventDetails.eventName} {selectedEventDetails.eventYear}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {autoSaving && <Typography variant='caption' sx={{ color: '#245D6B' }}>Auto-saving...</Typography>}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportClick}
            sx={{ borderColor: '#245D6B', color: '#245D6B', fontWeight: 600, minWidth: 120, textTransform: 'none' }}
          >
            Export
          </Button>
          <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
            <MenuItem onClick={exportToExcel}>Export Excel</MenuItem>
            <MenuItem onClick={exportToPdf}>Export PDF</MenuItem>
          </Menu>
          <Button
            variant="outlined"
            sx={{ borderColor: '#245D6B', color: '#245D6B', fontWeight: 600, minWidth: 120 }}
            onClick={() => setPrintPreviewOpen(true)}
          >
            Print
          </Button>
        </Box>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 2,
          mx: 'auto',
          opacity: selectedAnnkutEvent ? 1 : 0.5,
          pointerEvents: selectedAnnkutEvent ? 'auto' : 'none',
          position: 'relative',
        }}
      >
        {!selectedAnnkutEvent && (
          <Box sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            textAlign: 'center',
            color: '#245D6B',
            fontWeight: 600
          }}>
          </Box>
        )}

        <TableContainer
          sx={{
            overflowY: 'auto',
            overflowX: 'auto',
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: '#245D6B',
                    position: 'sticky',
                    left: 0,
                    top: 0,
                    background: '#fff',
                    zIndex: 3,
                    minWidth: 100,
                  }}
                >
                  Gram (g)
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: '#245D6B',
                    position: 'sticky',
                    left: 100,
                    top: 0,
                    background: '#fff',
                    zIndex: 3,
                    minWidth: 120,
                  }}
                >
                  Mithai
                </TableCell>
                {boxRanges.map(box => (
                  <TableCell
                    key={box.id}
                    align="center"
                    sx={{
                      fontWeight: 700,
                      color: '#245D6B',
                      position: 'sticky',
                      top: 0,
                      background: '#fff',
                      zIndex: 2,
                    }}
                  >
                    {box.priceRange}
                    <br />
                    <span style={{ fontWeight: 400, fontSize: 12 }}>({box.gramPerBox}g)</span>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {mithais
                .slice()
                .sort((a, b) => a.id - b.id)
                .map((mithai, mithaiIdx) => (
                  <TableRow key={mithai.id}>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        background: '#fff',
                        zIndex: 1,
                        minWidth: 100,
                      }}
                    >
                      {mithai.gram} g
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 100,
                        background: '#fff',
                        zIndex: 1,
                        minWidth: 120,
                      }}
                    >
                      {mithai.vangiName}
                    </TableCell>
                    {boxRanges.map((box, boxIdx) => (
                      <TableCell key={box.id} align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={pieces[`${mithai.id}_${box.id}`] ?? ''}
                          onChange={e => handlePieceChange(mithai.id, box.id, e.target.value)}
                          inputProps={{
                            min: 0,
                            style: { width: 60, textAlign: 'center' },
                            tabIndex: 0,
                            'data-row': mithaiIdx,
                            'data-col': boxIdx,
                            id: `cell-${mithaiIdx}-${boxIdx}`,
                          }}
                          sx={{
                            mb: 1,
                            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#245D6B',
                            },
                          }}
                          onKeyDown={e => {
                            const row = mithaiIdx;
                            const col = boxIdx;
                            let nextRow = row;
                            let nextCol = col;

                            if (e.key === 'ArrowRight') nextCol = col + 1;
                            if (e.key === 'ArrowLeft') nextCol = col - 1;
                            if (e.key === 'ArrowDown') nextRow = row + 1;
                            if (e.key === 'ArrowUp') nextRow = row - 1;
                            if (e.key === 'Enter') nextRow = row + 1;

                            // Clamp values
                            nextRow = Math.max(0, Math.min(mithais.length - 1, nextRow));
                            nextCol = Math.max(0, Math.min(boxRanges.length - 1, nextCol));

                            // Only move if changed
                            if (nextRow !== row || nextCol !== col) {
                              const nextId = `cell-${nextRow}-${nextCol}`;
                              const nextInput = document.getElementById(nextId);
                              if (nextInput) {
                                (nextInput as HTMLInputElement).focus();
                                e.preventDefault();
                              }
                            }
                          }}
                        />
                        <div style={{ fontSize: 12, color: '#245D6B' }}>
                          {getTotalGram(mithai, box.id)} g
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              <TableRow
                sx={{
                  position: 'sticky',
                  bottom: 0,
                  background: '#f5f5f5',
                  zIndex: 2,
                }}
              >
                <TableCell
                  colSpan={2}
                  sx={{
                    fontWeight: 700,
                    color: '#245D6B',
                    background: '#f5f5f5',
                    position: 'sticky',
                    left: 0,
                    bottom: 0,
                    zIndex: 3,
                  }}
                >
                  Total Gram (g)
                </TableCell>
                {boxRanges.map(box => (
                  <TableCell
                    key={box.id}
                    align="center"
                    sx={{
                      fontWeight: 700,
                      color: '#245D6B',
                      background: '#f5f5f5',
                      position: 'sticky',
                      bottom: 0,
                      zIndex: 2,
                    }}
                  >
                    {`${mithais.reduce((sum, mithai) => sum + getTotalGram(mithai, box.id), 0)} g`}
                  </TableCell>
                ))}
                <TableCell sx={{ background: '#f5f5f5', position: 'sticky', bottom: 0, right: 0, zIndex: 2 }} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        {(gramWarnings.length > 0) && (
          <Box sx={{ mt: 2 }}>
            {[...gramWarnings].map((msg, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', color: '#d32f2f', mb: 0.5 }}>
                <WarningAmberIcon fontSize="small" sx={{ mr: 1 }} color="warning" />
                <Typography variant="body2">{msg}</Typography>
              </Box>
            ))}
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
        </Box>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
      {/* Print Preview Dialog */}
      <Dialog
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          Print Preview
          <Button
            variant="contained"
            sx={{ float: 'right', bgcolor: '#245D6B', ml: 2 }}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </DialogTitle>
        <DialogContent>
          <Box id="weight-calculation-print">
            <div
              style={{
                textAlign: "left",
                marginBottom: 24,
                borderBottom: "2px solid #245D6B",
                paddingBottom: 12,
              }}
            >
              <h1
                style={{
                  color: "#245D6B",
                  margin: 0,
                  fontSize: 32,
                  letterSpacing: 2,
                  fontWeight: 700,
                }}
              >
                Weight Calculation Report
              </h1>
              <div style={{ color: "#555", fontSize: 16, marginTop: 4 }}>
                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by Kitchen Manager
                {selectedAnnkutEvent && (
                  <span>
                    &nbsp;|&nbsp; Event: {selectedEventDetails?.eventName} - {selectedEventDetails?.eventYear}
                  </span>
                )}
              </div>
            </div>

            {mithais.length > 0 ? (
              <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 20 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                        background: "#245D6B",
                        color: "#fff",
                        fontWeight: 700,
                        textAlign: "left",
                      }}
                    >
                      Gram (g)
                    </th>
                    <th
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                        background: "#245D6B",
                        color: "#fff",
                        fontWeight: 700,
                        textAlign: "left",
                      }}
                    >
                      Mithai
                    </th>
                    {boxRanges.map(box => (
                      <th
                        key={box.id}
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          background: "#245D6B",
                          color: "#fff",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        {box.priceRange}
                        <br />
                        ({box.gramPerBox}g)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mithais
                    .slice()
                    .sort((a, b) => a.id - b.id)
                    .map(mithai => (
                      <tr key={mithai.id}>
                        <td style={{ border: '1px solid #ccc', padding: 8 }}>{mithai.gram} g</td>
                        <td style={{ border: '1px solid #ccc', padding: 8 }}>{mithai.vangiName}</td>
                        {boxRanges.map(box => (
                          <td key={box.id} style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>
                            {pieces[`${mithai.id}_${box.id}`] || '0'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  <tr>
                    <td colSpan={2} style={{
                      border: '1px solid #ccc',
                      padding: 8,
                      fontWeight: 700,
                      color: '#245D6B',
                      background: '#f5f5f5'
                    }}>
                      Total Gram (g)
                    </td>
                    {boxRanges.map(box => (
                      <td
                        key={box.id}
                        style={{
                          border: '1px solid #ccc',
                          padding: 8,
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#245D6B',
                          background: '#f5f5f5'
                        }}
                      >
                        {`${mithais.reduce((sum, mithai) => sum + ((Number(pieces[`${mithai.id}_${box.id}`]) || 0) * mithai.gram), 0)} g`}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#999",
                  fontStyle: "italic",
                  padding: "40px",
                  fontSize: "16px",
                }}
              >
                No weight calculation data available for printing.
              </div>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintPreviewOpen(false)} sx={{ color: '#245D6B', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeightCalculation;
