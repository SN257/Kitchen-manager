import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, TableFooter } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
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
  const getTotalNang = (mithai: Mithai): number => {
    return boxRanges.reduce((sum, box) => sum + (Number(pieces[`${mithai.id}_${box.id}`]) || 0), 0);
  };
  const getTotalGram = (mithai: Mithai, boxId: number): number => {
    const piecesCount = Number(pieces[`${mithai.id}_${boxId}`]) || 0;
    return piecesCount * mithai.gram;
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
  
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  const API_BASE_URL = useApiBaseUrl();

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
      console.log('No token found, user not logged in');
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

  const handleSave = async () => {
    if (!selectedAnnkutEvent) {
      setSnackbar({ open: true, message: 'Please select an Annkut event first.', severity: 'error' });
      return;
    }

    const hasEntry = Object.values(pieces).some(val => !!val && Number(val) > 0);
    if (!hasEntry) {
      setSnackbar({ open: true, message: 'Please enter at least one value before saving.', severity: 'error' });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSnackbar({ open: true, message: 'Authentication required. Please login again.', severity: 'error' });
        return;
      }

      const dataToSave = mithais.map(mithai => {
        const boxEntries = boxRanges
          .map(box => ({
            boxRange: box.priceRange,
            pieces: Number(pieces[`${mithai.id}_${box.id}`]) || 0,
            boxId: box.id,
          }))
          .filter(entry => entry.pieces > 0);

        if (boxEntries.length === 0) return null;

        return {
          mithaiId: mithai.id,
          mithaiName: mithai.vangiName,
          totalNang: boxEntries.reduce((sum, entry) => sum + entry.pieces, 0),
          totalGram: boxEntries.reduce((sum, entry) => sum + entry.pieces * mithai.gram, 0),
          boxEntries,
        };
      }).filter(Boolean);

      const response = await fetch(`${API_BASE_URL}/weight-calculation-entries${entryId ? `/${entryId}` : ''}`, {
        method: entryId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          entries: dataToSave,
          eventId: selectedAnnkutEvent 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (!entryId && result.id) setEntryId(result.id);
        setSnackbar({ open: true, message: 'Saved successfully!', severity: 'success' });
        setIsDirty(false);
      } else {
        setSnackbar({ open: true, message: 'Failed to save!', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save!', severity: 'error' });
    }
  };

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

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 5, mt: 1 }}>
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
            maxHeight: 450,
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
                  Gram
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
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    color: '#245D6B',
                    position: 'sticky',
                    right: 0,
                    top: 0,
                    background: '#f5f5f5',
                    zIndex: 3,
                    minWidth: 100,
                  }}
                >
                  Total Nang
                </TableCell>
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
                      {mithai.gram}
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
                    <TableCell
                      align="center"
                      sx={{
                        position: 'sticky',
                        right: 0,
                        background: '#f5f5f5',
                        color: '#245D6B',
                        zIndex: 1,
                        minWidth: 100,
                        fontWeight: 700,
                      }}
                    >
                      {getTotalNang(mithai)}
                    </TableCell>
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
                  Total Gram
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
                    {mithais.reduce((sum, mithai) => sum + getTotalGram(mithai, box.id), 0)}
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
          <Button
            variant="contained"
            sx={{ bgcolor: '#245D6B', fontWeight: 600, minWidth: 160 }}
            onClick={handleSave}
          >
            {entryId ? 'Edit Save' : 'Save'}
          </Button>
          <Button
            variant="outlined"
            sx={{ borderColor: '#245D6B', color: '#245D6B', fontWeight: 600, minWidth: 120 }}
            onClick={() => setPrintPreviewOpen(true)}
          >
            Print Preview
          </Button>
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
            onClick={() => {
              window.print();
              setPrintPreviewOpen(false);
            }}
          >
            Print
          </Button>
        </DialogTitle>
        <DialogContent>
          <div id="print-sections">
            <div style={{
              textAlign: 'left',
              marginBottom: 24,
              borderBottom: '2px solid #245D6B',
              paddingBottom: 12
            }}>
              <h1 style={{
                color: '#245D6B',
                margin: 0,
                fontSize: 32,
                letterSpacing: 2,
                fontWeight: 700
              }}>
                Weight Calculation Report
              </h1>
              <div style={{ color: '#555', fontSize: 16, marginTop: 4 }}>
                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by Kitchen Manager
                {selectedAnnkutEvent && (
                  <span>
                    &nbsp;|&nbsp; Event: {selectedEventDetails?.eventName} - {selectedEventDetails?.eventYear}
                  </span>
                )}
              </div>
            </div>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ background: '#e3f2fd', color: '#245D6B', fontWeight: 700 }}>Gram</TableCell>
                    <TableCell style={{ background: '#e3f2fd', color: '#245D6B', fontWeight: 700 }}>Mithai</TableCell>
                    {boxRanges.map(box => (
                      <TableCell
                        key={box.id}
                        style={{ background: '#e3f2fd', color: '#245D6B', fontWeight: 700 }}
                      >
                        {box.priceRange} <br />({box.gramPerBox}g)
                      </TableCell>
                    ))}
                    <TableCell style={{ background: '#e3f2fd', color: '#245D6B', fontWeight: 700 }}>Total Nang</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mithais
                    .slice()
                    .sort((a, b) => a.id - b.id)
                    .map(mithai => (
                      <TableRow key={mithai.id}>
                        <TableCell>{mithai.gram}</TableCell>
                        <TableCell>{mithai.vangiName}</TableCell>
                        {boxRanges.map(box => (
                          <TableCell key={box.id}>
                            <div>
                              {pieces[`${mithai.id}_${box.id}`] ?? ''}
                              <div style={{ fontSize: 11, color: '#245D6B' }}>
                                {pieces[`${mithai.id}_${box.id}`]
                                  ? `${Number(pieces[`${mithai.id}_${box.id}`]) * mithai.gram}g`
                                  : ''}
                              </div>
                            </div>
                          </TableCell>
                        ))}
                        <TableCell>
                          {boxRanges.reduce((sum, box) => sum + (Number(pieces[`${mithai.id}_${box.id}`]) || 0), 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} style={{
                      fontWeight: 700,
                      color: '#245D6B',
                      background: '#f5f5f5'
                    }}>
                      Total Gram
                    </TableCell>
                    {boxRanges.map(box => (
                      <TableCell
                        key={box.id}
                        style={{
                          fontWeight: 700,
                          color: '#245D6B',
                          background: '#f5f5f5'
                        }}
                      >
                        {mithais.reduce((sum, mithai) => sum + ((Number(pieces[`${mithai.id}_${box.id}`]) || 0) * mithai.gram), 0)}
                      </TableCell>
                    ))}
                    <TableCell style={{ background: '#f5f5f5' }} />
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </div>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default WeightCalculation;
