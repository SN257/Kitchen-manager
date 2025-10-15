import React, { useEffect, useState } from "react";
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
  CircularProgress,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
} from "@mui/material";
import SummarizeIcon from "@mui/icons-material/Summarize";
import DownloadIcon from '@mui/icons-material/Download';
import { useApiBaseUrl } from "../config/config";
import "../App.css";
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const AnnkutNosSummary: React.FC = () => {
  const [mithais, setMithais] = useState<any[]>([]);
  const [boxRanges, setBoxRanges] = useState<any[]>([]);
  const [pieces, setPieces] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [boxTotals, setBoxTotals] = useState<{ [priceRange: string]: number }>({});
  const [weightEntries, setWeightEntries] = useState<
    { id: number; vangiName: string; gram: number }[]
  >([]);
  const [recipes, setRecipes] = useState<
    { vangiName: string; items_per_kg: number }[]
  >([]);
  const [, setPrinting] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [calculatedData, setCalculatedData] = useState<{
    [mithaiId: number]: {
      total_nang: number;
      total_flour: number;
      nos_per_kg: number;
    }
  }>({});
  // Rows fetched from DB (source of truth for display)
  const [savedRows, setSavedRows] = useState<any[]>([]);
  
  // Add snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Use context instead of local state
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  
  const API_BASE_URL = useApiBaseUrl();

  // Prune DB rows in annkut-sidhu-saman that no longer exist in latest calculation for this event
  const pruneRemovedSavedRows = async (currentMithaiIds: number[]) => {
    try {
      if (!selectedAnnkutEvent) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      // Get saved rows for this event
      const res = await fetch(`${API_BASE_URL}/annkut-sidhu-saman?eventId=${selectedAnnkutEvent}`, {
        credentials: 'include',
        headers,
      });
      if (!res.ok) return;
      const saved = await res.json();
      const toDelete = (Array.isArray(saved) ? saved : [])
        .filter((row: any) => !currentMithaiIds.includes(Number(row.mithai_id)));
      for (const row of toDelete) {
        try {
          if (row?.id) {
            await fetch(`${API_BASE_URL}/annkut-sidhu-saman/${row.id}`, {
              method: 'DELETE',
              credentials: 'include',
              headers,
            });
          }
        } catch {}
      }
      // Refresh saved rows after pruning
      fetchCalculatedData();
    } catch {}
  };

  // Use DB rows if available; else fallback to live entries list
  const displayedRows = savedRows.length > 0 ? savedRows : mithais.map((m: any) => ({
    mithai_id: m.id,
    mithai_name: m.vangiName,
    total_nang: undefined,
    total_flour: undefined,
    nos_per_kg: undefined,
  }));

  // Debug logging
  console.log('displayedRows:', displayedRows);
  console.log('savedRows:', savedRows);
  console.log('mithais:', mithais);
  console.log('boxRanges:', boxRanges);
  console.log('boxTotals:', boxTotals);

  useEffect(() => {
    if (!selectedAnnkutEvent) {
      setMithais([]);
      setBoxRanges([]);
      setPieces({});
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Fetch both weight calculation entries and box ranges
    Promise.all([
      fetch(`${API_BASE_URL}/weight-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }).then(res => res.json()),
      fetch(`${API_BASE_URL}/box-ranges?eventId=${selectedAnnkutEvent}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }).then(res => res.json())
    ])
      .then(([weightData, boxRangesData]) => {
        console.log('Weight calculation data:', weightData); // Debug log
        console.log('Box ranges data:', boxRangesData); // Debug log
        
        // Process weight calculation data
        if (weightData && weightData.entries && weightData.entries.length > 0) {
          const sortedMithais = weightData.entries
            .map((entry: any) => ({
              id: entry.mithaiId,
              vangiName: entry.mithaiName,
              nang: entry.totalNang,
              boxEntries: entry.boxEntries,
            }))
            .sort((a: any, b: any) => a.id - b.id);
          
          setMithais(sortedMithais);

          // Prune any saved rows not present in the latest entries
          const currentIds = sortedMithais.map((m: any) => Number(m.id));
          pruneRemovedSavedRows(currentIds);

          // Build pieces map
          const newPieces: { [key: string]: number } = {};
          weightData.entries.forEach((mithai: any) => {
            mithai.boxEntries.forEach((boxEntry: any) => {
              newPieces[`${mithai.mithaiId}_${boxEntry.boxId}`] =
                boxEntry.pieces;
            });
          });
          
          console.log('Pieces map:', newPieces); // Debug log
          setPieces(newPieces);
        } else {
          setMithais([]);
          setPieces({});
          // All removed -> prune all saved rows for this event
          pruneRemovedSavedRows([]);
        }

        // Process box ranges data
        if (boxRangesData && Array.isArray(boxRangesData) && boxRangesData.length > 0) {
          const sortedBoxRanges = boxRangesData
            .map((box: any) => ({
              id: box.id,
              priceRange: box.priceRange,
            boxTypeDisplay: Array.isArray(box.boxType) ? (box.boxType.join(',') || '') : (box.boxType || ''),
            }))
            .sort((a: any, b: any) => a.id - b.id);
          
          console.log('Sorted box ranges:', sortedBoxRanges); // Debug log
          setBoxRanges(sortedBoxRanges);
        } else {
          console.log('No box ranges data or empty array'); // Debug log
          setBoxRanges([]);
        }
      })
      .catch((error) => { 
        console.error('Error fetching data:', error); // Debug log
        setMithais([]); 
        setBoxRanges([]); 
        setPieces({}); 
      })
      .finally(() => setLoading(false));
  }, [API_BASE_URL, selectedAnnkutEvent]);

  useEffect(() => {
    // Remove the automatic save logic - now handled by manual save button
  }, [mithais, weightEntries, recipes, boxTotals, pieces]);

  useEffect(() => {
    if (!selectedAnnkutEvent) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    
    fetch(`${API_BASE_URL}/box-weight-entries?eventId=${selectedAnnkutEvent}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Box weight entries data:', data); // Debug log
        
        const filteredData = data.filter((box: any) => {
          const boxEventId = box.eventId?.toString();
          const selectedEventId = selectedAnnkutEvent.toString();
          return boxEventId === selectedEventId;
        });
        
        console.log('Filtered box weight entries:', filteredData); // Debug log
        
        const totals: { [priceRange: string]: number } = {};
        filteredData.forEach((box: any) => {
          totals[box.priceRange] = Number(box.totalBoxes) || 0;
        });
        
        console.log('Box totals calculated:', totals); // Debug log
        setBoxTotals(totals);
      })
      .catch((error) => {
        console.error('Error fetching box weight entries:', error);
      });
  }, [API_BASE_URL, selectedAnnkutEvent]);

  useEffect(() => {
    if (!selectedAnnkutEvent) return;
    
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
      .then((res) => res.json())
      .then((data) => setWeightEntries(data || []));
  }, [API_BASE_URL, selectedAnnkutEvent]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/recipe`, {
      credentials: "include",
      headers: token
        ? {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          }
        : {},
    })
      .then(async (res) => {
        try {
          const data = res.ok ? await res.json() : [];
          setRecipes(Array.isArray(data) ? data : []);
        } catch {
          setRecipes([]);
        }
      })
      .catch(() => setRecipes([]));
  }, [API_BASE_URL]);

  // Listen for print events to update printing state
  useEffect(() => {
    const mediaQueryList = window.matchMedia("print");
    const handleChange = (e: MediaQueryListEvent) => setPrinting(e.matches);

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleChange);
    } else {
      mediaQueryList.addListener(handleChange);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, []);

  const getTotalNang = (mithai: any) => {
    console.log('getTotalNang called for mithai:', mithai); // Debug log
    console.log('Current boxRanges:', boxRanges); // Debug log
    console.log('Current pieces:', pieces); // Debug log
    console.log('Current boxTotals:', boxTotals); // Debug log
    
    const total = boxRanges.reduce((sum: number, box: any) => {
      const nang = pieces[`${mithai.id}_${box.id}`] || 0;
      const totalBoxes = boxTotals[box.priceRange] || 0;
      console.log(`Box ${box.id} (${box.priceRange}): nang=${nang}, totalBoxes=${totalBoxes}, contribution=${nang * totalBoxes}`); // Debug log
      return sum + nang * totalBoxes;
    }, 0);
    
    console.log('Total nang calculated:', total); // Debug log
    return total;
  };

  function baseName(name: string) {
    return name.split("(")[0].trim().toLowerCase();
  }

  const handlePrint = () => {
    setPrintDialogOpen(true);
  };

  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

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
      if (!mithais || mithais.length === 0) {
        setSnackbar({ open: true, message: 'No data to export', severity: 'error' });
        return;
      }

      const rows = mithais.map((m: any, idx: number) => {
        const row: any = {};
        row['Id'] = idx + 1;
        row['1 Piece weight (g)'] = m.gram || '';
        row['Mithai'] = m.vangiName || '';
        boxRanges.forEach((b: any) => {
          const nang = pieces[`${m.id}_${b.id}`] || 0;
          const totalBoxes = boxTotals[b.priceRange] || 0;
          row[b.priceRange] = nang * totalBoxes;
        });
        const totalNang = getTotalNang(m);
        row['Total Nang'] = totalNang;
        const gramEntry = weightEntries.find(w => w.vangiName && w.vangiName.trim() === m.vangiName.trim());
        const gram = gramEntry ? Number(gramEntry.gram) : null;
        const recipeEntry = recipes.find((r: any) => r.vangiName && r.vangiName.split('(')[0].trim().toLowerCase() === (m.vangiName || '').split('(')[0].trim().toLowerCase());
        let itemPerKg = null;
        if (recipeEntry && recipeEntry.items_per_kg !== undefined && recipeEntry.items_per_kg !== null && String(recipeEntry.items_per_kg).trim() !== '') {
          itemPerKg = Number(String(recipeEntry.items_per_kg).replace(',', '.').replace(/[^0-9.]/g, ''));
        }
        const nosFromItemPerKg = (gram && itemPerKg && itemPerKg > 0) ? Math.floor((itemPerKg * 1000) / gram) : null;
        row['Nos per kg'] = nosFromItemPerKg || '';
        const flourKg = (typeof nosFromItemPerKg === 'number' && nosFromItemPerKg > 0) ? Number((totalNang / nosFromItemPerKg).toFixed(2)) : '';
        row['Total Flour (kg)'] = flourKg;
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ width: 8 }, { width: 12 }, { width: 30 }, ...boxRanges.map(() => ({ width: 12 })), { width: 12 }, { width: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Annkut Nos Summary');
      XLSX.writeFile(wb, `Annkut_Nos_Summary_${selectedEventDetails?.eventName || 'Export'}.xlsx`);
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
      const printSection = document.querySelector('#annkut-print-title');
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
      pdf.save(`Annkut_Nos_Summary_${selectedEventDetails?.eventName || 'Export'}.pdf`);
    } catch (err) {
      console.error('Export to PDF failed', err);
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    }
  };

  

  // Check for existing saved entries when data loads
  

  // Auto-save calculated data when dependencies change
  useEffect(() => {
    if (!selectedAnnkutEvent || !mithais.length || !weightEntries.length || !recipes.length) {
      return;
    }

    const saveCalculatedData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      for (const mithai of mithais) {
        const totalNang = getTotalNang(mithai);
        const gramEntry = weightEntries.find(
          (w) => w.vangiName && w.vangiName.trim() === mithai.vangiName.trim()
        );
        const gram = gramEntry ? Number(gramEntry.gram) : null;

        const mithaiBase = baseName(mithai.vangiName || "");
        const recipeEntry = recipes.find(
          (r) => r.vangiName && baseName(r.vangiName) === mithaiBase
        );

        let itemPerKg = null;
        if (
          recipeEntry &&
          recipeEntry.items_per_kg !== undefined &&
          recipeEntry.items_per_kg !== null &&
          String(recipeEntry.items_per_kg).trim() !== ""
        ) {
          itemPerKg = Number(
            String(recipeEntry.items_per_kg)
              .replace(",", ".")
              .replace(/[^0-9.]/g, "")
          );
        }

        const nosFromItemPerKg =
          gram !== null &&
          !isNaN(gram) &&
          itemPerKg !== null &&
          !isNaN(itemPerKg) &&
          gram > 0
            ? Math.floor((itemPerKg * 1000) / gram)
            : null;

        const flourKg =
          typeof nosFromItemPerKg === "number" && nosFromItemPerKg > 0
            ? Number((totalNang / nosFromItemPerKg).toFixed(2))
            : null;

        if (
          flourKg !== null &&
          !isNaN(flourKg) &&
          totalNang !== null &&
          !isNaN(totalNang) &&
          totalNang > 0
        ) {
          try {
            await fetch(`${API_BASE_URL}/annkut-sidhu-saman`, {
              method: "POST",
              credentials: 'include',
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                mithai_id: Number(mithai.id),
                mithai_name: String(mithai.vangiName),
                total_nang: Number(totalNang),
                total_flour: Number(flourKg),
                nos_per_kg: Number(nosFromItemPerKg),
                eventId: Number(selectedAnnkutEvent),
              }),
            });
          } catch (err) {
          }
        }
      }
      
      // Fetch updated data after saving
      fetchCalculatedData();
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveCalculatedData, 1000);
    return () => clearTimeout(timeoutId);
  }, [mithais, boxTotals, pieces, weightEntries, recipes, selectedAnnkutEvent]);

  // Fetch calculated data from database
  const fetchCalculatedData = async () => {
    if (!selectedAnnkutEvent) {
      setCalculatedData({});
      setSavedRows([]);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/annkut-sidhu-saman?eventId=${selectedAnnkutEvent}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const calculatedMap: { [mithaiId: number]: { total_nang: number; total_flour: number; nos_per_kg: number } } = {};
        data.forEach((entry: any) => {
          calculatedMap[entry.mithai_id] = {
            total_nang: Number(entry.total_nang),
            total_flour: Number(entry.total_flour),
            nos_per_kg: Number(entry.nos_per_kg || 0),
          };
        });
        setCalculatedData(calculatedMap);
        setSavedRows(Array.isArray(data) ? data : []);
      } else {
        setSavedRows([]);
      }
    } catch (error) {
    }
  };

  // Fetch calculated data when event changes
  useEffect(() => {
    fetchCalculatedData();
  }, [selectedAnnkutEvent]);

  return (
    <>
      <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: "80vh" }}>
        <Box sx={{ position: "relative", mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SummarizeIcon sx={{ color: "#245D6B", fontSize: 32, mr: 1 }} />
            <Typography variant="h5" sx={{ color: "#245D6B", fontWeight: 700 }}>
              Annkut Nos Summary
            </Typography>
            {selectedEventDetails && (
              <Typography variant="body1" sx={{ ml: 2, color: "#666", fontStyle: "italic" }}>
                - {selectedEventDetails.eventName} {selectedEventDetails.eventYear}
              </Typography>
            )}
            <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportClick}
                sx={{ color: '#245D6B', borderColor: '#245D6B', fontWeight: 600, textTransform: 'none' }}
              >
                Export
              </Button>
              <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
                <MenuItem onClick={exportToExcel}>Export Excel</MenuItem>
                <MenuItem onClick={exportToPdf}>Export PDF</MenuItem>
              </Menu>
              <Button
                variant="outlined"
                sx={{ color: '#245D6B', borderColor: '#245D6B', fontWeight: 600 }}
                onClick={handlePrint}
              >
                Print
              </Button>
            </Box>
          </Box>
        </Box>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, opacity: selectedAnnkutEvent ? 1 : 0.5, pointerEvents: selectedAnnkutEvent ? 'auto' : 'none' }}>
          {!selectedAnnkutEvent ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <Typography variant="h6" sx={{ color: "#245D6B", fontStyle: "italic" }}>
                Please select an Annkut event from the menu bar
              </Typography>
            </Box>
          ) : loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : mithais.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <Typography variant="h6" sx={{ color: "#999", fontStyle: "italic" }}>
                No data available for the selected event
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer 
                sx={{ 
                  width: "100%", 
                  overflowX: "auto",
                  maxHeight: "70vh", // Set maximum height
                  overflowY: "auto", // Enable vertical scrolling
                  "&::-webkit-scrollbar": {
                    width: "8px",
                    height: "8px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(36, 93, 107, 0.5)",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                  },
                }}
              >
                <Table sx={{ minWidth: 1000, width: "100%" }} stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#fff",
                          background: "#245D6B",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          position: "sticky",
                          left: 0,
                          top: 0,
                          zIndex: 4,
                          width: 100,
                          minWidth: 100,
                          maxWidth: 100,
                        }}
                      >
                        1 Piece weight (g)
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#fff",
                          background: "#245D6B",
                          whiteSpace: "nowrap",
                          position: "sticky",
                          left: 100,
                          top: 0,
                          zIndex: 4,
                          width: 100,
                          minWidth: 100,
                          maxWidth: 100,
                        }}
                      >
                        Mithai
                      </TableCell>
                      {boxRanges.map((box: any) => (
                        <TableCell
                          key={box.id}
                          sx={{
                            fontWeight: 700,
                            color: "#fff",
                            background: "#245D6B",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                            position: "sticky",
                            top: 0,
                            zIndex: 3,
                          }}
                        >
                          <div>{box.priceRange}</div>
                          <div style={{ fontSize: '0.8em', fontWeight: 400 }}>
                            ({box.boxTypeDisplay ? `${box.boxTypeDisplay} - ` : ''}{boxTotals[box.priceRange] || 0} g)
                          </div>
                          <div style={{ fontSize: '0.7em', fontWeight: 300, fontStyle: 'italic' }}>
                            {box.gramPerBox ? `${box.gramPerBox}g/box` : ''}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#fff",
                          background: "#245D6B",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                          position: "sticky",
                          top: 0,
                          zIndex: 3,
                        }}
                      >
                        Total Nang
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#fff",
                          background: "#245D6B",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                          position: "sticky",
                          top: 0,
                          zIndex: 3,
                        }}
                      >
                        Nos per 1 Kg
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#fff",
                          background: "#245D6B",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                          position: "sticky",
                          top: 0,
                          zIndex: 3,
                        }}
                      >
                        Flour (kg)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedRows.map((row: any, idx: number) => {
                      const savedData = calculatedData[row.mithai_id];
                      // Exact match for gram using saved name
                      const gramEntry = weightEntries.find(
                        (w) => w.vangiName && w.vangiName.trim() === String(row.mithai_name || '').trim()
                      );
                      const gram = gramEntry ? Number(gramEntry.gram) : null;

                      // Recipe by base name
                      const mithaiBase = baseName(String(row.mithai_name) || "");
                      const recipeEntry = recipes.find(
                        (r) => r.vangiName && baseName(r.vangiName) === mithaiBase
                      );
                      let itemPerKg = null;
                      if (
                        recipeEntry &&
                        recipeEntry.items_per_kg !== undefined &&
                        recipeEntry.items_per_kg !== null &&
                        String(recipeEntry.items_per_kg).trim() !== ""
                      ) {
                        itemPerKg = Number(
                          String(recipeEntry.items_per_kg)
                            .replace(",", ".")
                            .replace(/[^0-9.]/g, "")
                        );
                      }

                      const totalNang = (savedData && savedData.total_nang > 0)
                        ? savedData.total_nang
                        : getTotalNang({ id: row.mithai_id, vangiName: row.mithai_name });

                      const nosFromItemPerKg = (savedData && savedData.nos_per_kg > 0)
                        ? savedData.nos_per_kg
                        : (
                          gram !== null && !isNaN(gram) && itemPerKg !== null && !isNaN(itemPerKg) && gram > 0
                            ? Math.floor((itemPerKg * 1000) / gram)
                            : null
                        );

                      const flourKg = (savedData && savedData.total_flour > 0)
                        ? savedData.total_flour
                        : (
                          typeof nosFromItemPerKg === "number" && nosFromItemPerKg > 0
                            ? Number((totalNang / nosFromItemPerKg).toFixed(2))
                            : null
                        );

                      const rowBg = idx % 2 === 0 ? "#f7fbfc" : "#eaf3f6";

                      return (
                        <TableRow key={row.mithai_id} sx={{ backgroundColor: rowBg }}>
                          <TableCell
                            sx={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              position: "sticky",
                              left: 0,
                              background: rowBg,
                              zIndex: 2,
                              width: 100,
                              minWidth: 100,
                              maxWidth: 100,
                            }}
                          >
                            {gram ? `${gram}g` : '-'}
                          </TableCell>
                          <TableCell
                            sx={{
                              whiteSpace: "nowrap",
                              position: "sticky",
                              left: 100,
                              background: rowBg,
                              zIndex: 2,
                              width: 100,
                              minWidth: 100,
                              maxWidth: 100,
                            }}
                          >
                            {row.mithai_name}
                          </TableCell>
                          {boxRanges.map((box: any) => {
                            const nang = pieces[`${row.mithai_id}_${box.id}`] || 0;
                            const totalBoxes = boxTotals[box.priceRange] || 0;
                            return (
                              <TableCell key={box.id} sx={{ whiteSpace: "nowrap", textAlign: "center", background: rowBg }}>
                                {nang * totalBoxes} nos
                              </TableCell>
                            );
                          })}
                          <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 700, background: "#fdf6e3", color: "#245D6B", textAlign: "center" }}>
                            {totalNang} nos
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", textAlign: "center", background: "#fdf6e3", fontWeight: 700, color: "#245D6B" }}>
                            {nosFromItemPerKg && nosFromItemPerKg > 0 ? `${nosFromItemPerKg} nos` : "-"}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", textAlign: "center", background: "#fdf6e3", fontWeight: 700, color: "#245D6B" }}>
                            {flourKg && flourKg > 0 ? `${flourKg} kg` : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {/* Pagination below the table, centered, like BoxWeightEntry */}
              </>
            )}
          </Paper>
        {/* Remove the entire pagination section */}
      </Box>
      <Dialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          Print Preview
          <Button
            variant="contained"
            sx={{ float: "right", bgcolor: "#245D6B", ml: 2 }}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </DialogTitle>
        <DialogContent>
          <Box id="annkut-print-title">
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
                Annkut NOS Summary Report
              </h1>
              <div style={{ color: "#555", fontSize: 16, marginTop: 4 }}>
                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by
                Kitchen Manager
              </div>
            </div>
            <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
              <Table sx={{ minWidth: 1000, width: "100%" }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        background: "#245D6B",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        position: "sticky",
                        left: 0,
                        zIndex: 3,
                        width: 100,
                        minWidth: 100,
                        maxWidth: 100,
                      }}
                    >
                      1 Piece weight (g)
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        background: "#245D6B",
                        whiteSpace: "nowrap",
                        position: "sticky",
                        left: 100,
                        zIndex: 3,
                        width: 100,
                        minWidth: 100,
                        maxWidth: 100,
                      }}
                    >
                      Mithai
                    </TableCell>
                                        {boxRanges.map((box: any) => (
                      <TableCell
                        key={box.id}
                        sx={{
                          fontWeight: 700,
                          color: "#fff",
                          background: "#245D6B",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                        }}
                      >
                        <div>{box.priceRange}</div>
                        <div style={{ fontSize: '0.8em', fontWeight: 400 }}>
                          ({box.boxTypeDisplay ? `${box.boxTypeDisplay} - ` : ''}{boxTotals[box.priceRange] || 0} g)
                        </div>
                      </TableCell>
                    ))}
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        background: "#245D6B",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      }}
                    >
                      Total Nang
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        background: "#245D6B",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      }}
                    >
                      Nos per 1 Kg
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        background: "#245D6B",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      }}
                    >
                      Flour (kg)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedRows.map((row: any, idx: number) => {
                    // Exact match for gram
                    const gramEntry = weightEntries.find(
                      (w) => w.vangiName && w.vangiName.trim() === String(row.mithai_name || '').trim()
                    );
                    const gram = gramEntry ? Number(gramEntry.gram) : null;

                    // Base name match for recipe
                    const mithaiBase = baseName(String(row.mithai_name) || "");
                    const recipeEntry = recipes.find(
                      (r) => r.vangiName && baseName(r.vangiName) === mithaiBase
                    );

                    let itemPerKg = null;
                    if (
                      recipeEntry &&
                      recipeEntry.items_per_kg !== undefined &&
                      recipeEntry.items_per_kg !== null &&
                      String(recipeEntry.items_per_kg).trim() !== ""
                    ) {
                      itemPerKg = Number(
                        String(recipeEntry.items_per_kg)
                          .replace(",", ".")
                          .replace(/[^0-9.]/g, "")
                      );
                    }
                    const nosFromItemPerKg =
                      gram !== null &&
                      !isNaN(gram) &&
                      itemPerKg !== null &&
                      !isNaN(itemPerKg) &&
                      gram > 0
                        ? Math.floor((itemPerKg * 1000) / gram)
                        : null;

                    const totalNang = getTotalNang({ id: row.mithai_id, vangiName: row.mithai_name });

                    const flourKg =
                      typeof nosFromItemPerKg === "number" &&
                      nosFromItemPerKg > 0
                        ? Number((totalNang / nosFromItemPerKg).toFixed(2))
                        : null

                    const rowBg = idx % 2 === 0 ? "#f7fbfc" : "#eaf3f6";

                    return (
                      <TableRow key={row.mithai_id} sx={{ backgroundColor: rowBg }}>
                        <TableCell
                          sx={{
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            position: "sticky",
                            left: 0,
                            background: rowBg,
                            zIndex: 2,
                            width: 100,
                            minWidth: 100,
                            maxWidth: 100,
                          }}
                        >
                          {gram ? `${gram}g` : '-'}
                        </TableCell>
                        <TableCell
                          sx={{
                            whiteSpace: "nowrap",
                            position: "sticky",
                            left: 100,
                            background: rowBg,
                            zIndex: 2,
                            width: 100,
                            minWidth: 100,
                            maxWidth: 100,
                          }}
                        >
                          {row.mithai_name}
                        </TableCell>
                        {boxRanges.map((box: any) => {
                          const nang = pieces[`${row.mithai_id}_${box.id}`] || 0;
                          const totalBoxes = boxTotals[box.priceRange] || 0;
                          return (
                            <TableCell
                              key={box.id}
                              sx={{
                                whiteSpace: "nowrap",
                                textAlign: "center",
                                background: rowBg,
                              }}
                            >
                              {nang * totalBoxes} nos
                            </TableCell>
                          );
                        })}
                        <TableCell
                          sx={{
                            whiteSpace: "nowrap",
                            fontWeight: 700,
                            background: "#fdf6e3",
                            color: "#245D6B",
                            textAlign: "center",
                          }}
                        >
                          {totalNang} nos
                        </TableCell>
                        <TableCell
                          sx={{
                            whiteSpace: "nowrap",
                            textAlign: "center",
                            background: "#fdf6e3",
                            fontWeight: 700,
                            color: "#245D6B",
                          }}
                        >
                          {nosFromItemPerKg && nosFromItemPerKg > 0 ? `${nosFromItemPerKg} nos` : "-"}
                        </TableCell>
                        <TableCell
                          sx={{
                            whiteSpace: "nowrap",
                            textAlign: "center",
                            background: "#fdf6e3",
                            fontWeight: 700,
                            color: "#245D6B",
                          }}
                        >
                          {flourKg === null ? "-" : `${flourKg} kg`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
      </Dialog>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
export default AnnkutNosSummary;
