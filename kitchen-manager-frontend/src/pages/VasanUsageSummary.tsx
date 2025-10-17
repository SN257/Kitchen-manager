import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DownloadIcon from '@mui/icons-material/Download';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';
import { useApiBaseUrl } from '../config/config';

interface VasanUsageRow {
  vasanId: number;
  vasanName: string;
  totalUsed: number;
}

const VasanUsageSummary: React.FC = () => {
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();

  const [vasans, setVasans] = useState<{ id: number; vasanName: string }[]>([]);
  const [savedEntries, setSavedEntries] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!selectedAnnkutEvent) {
      setVasans([]);
      setSavedEntries(null);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE_URL}/vasans?eventId=${selectedAnnkutEvent}`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/vasan-nos-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null)
    ])
      .then(([vasansData, latest]) => {
        setVasans(Array.isArray(vasansData) ? vasansData : []);
        // latest may be { id, entries }
        if (latest && Array.isArray((latest as any).entries)) setSavedEntries((latest as any).entries);
        else setSavedEntries(null);
      })
      .catch(err => {
        console.error('Error loading vasan usage data', err);
        setVasans([]);
        setSavedEntries(null);
      })
      .finally(() => setLoading(false));
  }, [selectedAnnkutEvent, API_BASE_URL]);

  const usageRows: VasanUsageRow[] = useMemo(() => {
    const map = new Map<number, number>();
    // Initialize map with known vasans to keep ordering and names
    vasans.forEach(v => map.set(v.id, 0));

    if (savedEntries && Array.isArray(savedEntries)) {
      savedEntries.forEach(entry => {
        const vasanId = Number(entry.vasanId || entry.vasan_id || 0);
        if (!vasanId) return;
        let total = 0;
        if (entry.totalVasan !== undefined && entry.totalVasan !== null) total = Number(entry.totalVasan) || 0;
        else if (Array.isArray(entry.sectionEntries)) {
          total = entry.sectionEntries.reduce((s: number, se: any) => s + (Number(se.count) || 0), 0);
        }
        const prev = map.get(vasanId) || 0;
        map.set(vasanId, prev + total);
      });
    }

    // Build rows in the same order as vasans list
    return vasans.map(v => ({ vasanId: v.id, vasanName: v.vasanName || `Vasan ${v.id}`, totalUsed: map.get(v.id) || 0 }));
  }, [vasans, savedEntries]);

  const handleExportClick = (e: React.MouseEvent<HTMLElement>) => setExportAnchorEl(e.currentTarget);
  const handleExportClose = () => setExportAnchorEl(null);

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = usageRows.map(r => ({ 'Vasan': r.vasanName, 'Total Used': r.totalUsed }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 40 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vasan Usage');
      XLSX.writeFile(wb, `vasan-usage-${selectedAnnkutEvent || 'all'}.xlsx`);
      handleExportClose();
    } catch (err) {
      console.error('Export excel failed', err);
      setSnackbar({ open: true, message: 'Export to Excel failed', severity: 'error' });
      handleExportClose();
    }
  };

  const exportToPdf = async () => {
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const el = document.getElementById('vasan-usage-print');
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const imgProps = (pdf as any).getImageProperties ? (pdf as any).getImageProperties(imgData) : { width: canvas.width, height: canvas.height };
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`vasan-usage-${selectedAnnkutEvent || 'all'}.pdf`);
      handleExportClose();
    } catch (err) {
      console.error('Export pdf failed', err);
      setSnackbar({ open: true, message: 'Export to PDF failed', severity: 'error' });
      handleExportClose();
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '60vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ListAltIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
        <Typography variant='h5' sx={{ color: '#245D6B', fontWeight: 700 }}>Vasan Usage Summary</Typography>
        {selectedEventDetails && <Typography variant='body1' sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}</Typography>}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant='outlined' startIcon={<DownloadIcon />} sx={{ borderColor: '#245D6B', color: '#245D6B', fontWeight: 600 }} onClick={handleExportClick}>Export</Button>
          <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
            <MenuItem onClick={() => { handleExportClose(); exportToExcel(); }} disabled={!usageRows.length}>Export Excel</MenuItem>
            <MenuItem onClick={() => { handleExportClose(); exportToPdf(); }} disabled={!usageRows.length}>Export PDF</MenuItem>
          </Menu>
          <Button variant='outlined' sx={{ borderColor: '#245D6B', color: '#245D6B' }} onClick={() => setPrintOpen(true)}>Print</Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p: 2, opacity: selectedAnnkutEvent ? 1 : 0.5, pointerEvents: selectedAnnkutEvent ? 'auto' : 'none' }}>
        {!selectedAnnkutEvent ? (
          <Box sx={{ textAlign: 'center', py: 6, fontStyle: 'italic', color: '#245D6B' }}>Select an Annkut event first</Box>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : usageRows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, fontStyle: 'italic', color: '#999' }}>No data available</Box>
        ) : (
          <TableContainer sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Vasan Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#245D6B', textAlign: 'center' }}>Total Used</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usageRows.map((r, i) => (
                  <TableRow key={`${r.vasanId}-${i}`}>
                    <TableCell>{r.vasanName}</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 700, color: '#245D6B' }}>{r.totalUsed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>Vasan Usage Report</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3, borderBottom: '2px solid #245D6B', pb: 1.5 }}>
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#245D6B' }}>Vasan Usage Summary</Typography>
            <Typography variant='body2' sx={{ color: '#555', mt: 0.5 }}>{new Date().toLocaleDateString()} | Powered by Kitchen Manager{selectedEventDetails && <> | Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}</>}</Typography>
          </Box>
          <Box id='vasan-usage-print'>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Vasan Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#245D6B', textAlign: 'center' }}>Total Used</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usageRows.map((r, i) => (
                    <TableRow key={`print-${r.vasanId}-${i}`}>
                      <TableCell>{r.vasanName}</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700 }}>{r.totalUsed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
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

export default VasanUsageSummary;
