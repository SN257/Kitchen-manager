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
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
} from "@mui/material";
import SummarizeIcon from "@mui/icons-material/Summarize";
import { useApiBaseUrl } from "../config/config";
import "../App.css";
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const ROWS_PER_PAGE = 5;

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
  const [page, setPage] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [storedMithaiIds, setStoredMithaiIds] = useState<Set<number>>(
    new Set()
  );
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  
  // Add snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Use context instead of local state
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  
  const API_BASE_URL = useApiBaseUrl();

  const pageCount = Math.ceil(mithais.length / ROWS_PER_PAGE);

  // Show all entries in print, paginate on screen
  const paginatedMithais = printing
    ? mithais
    : mithais.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  // Remove the fetchAnnkutEvents useEffect

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
      console.log('No token found, user not logged in');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE_URL}/weight-calculation-entries/latest?eventId=${selectedAnnkutEvent}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Weight calculation data:', data);
        if (data && data.entries && data.entries.length > 0) {
          const sortedMithais = data.entries
            .map((entry: any) => ({
              id: entry.mithaiId,
              vangiName: entry.mithaiName,
              nang: entry.totalNang,
              boxEntries: entry.boxEntries,
            }))
            .sort((a: any, b: any) => a.id - b.id);
          
          console.log('Processed mithais:', sortedMithais);
          setMithais(sortedMithais);

          const allBoxes = data.entries.flatMap((entry: any) =>
            entry.boxEntries.map((b: any) => ({
              id: b.boxId,
              priceRange: b.boxRange,
            }))
          );
          const uniqueBoxes = Array.from(
            new Map(allBoxes.map((b: { id: any }) => [b.id, b])).values()
          );
          
          console.log('Box ranges:', uniqueBoxes);
          setBoxRanges(uniqueBoxes.sort((a: any, b: any) => a.id - b.id));

          // Build pieces map
          const newPieces: { [key: string]: number } = {};
          data.entries.forEach((mithai: any) => {
            mithai.boxEntries.forEach((boxEntry: any) => {
              newPieces[`${mithai.mithaiId}_${boxEntry.boxId}`] =
                boxEntry.pieces;
            });
          });
          
          console.log('Pieces map:', newPieces);
          setPieces(newPieces);
        } else {
          setMithais([]);
          setBoxRanges([]);
          setPieces({});
        }
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
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
      console.log('No token found, user not logged in');
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
        console.log('Box weight entries data:', data);
        
        const filteredData = data.filter((box: any) => {
          const boxEventId = box.eventId?.toString();
          const selectedEventId = selectedAnnkutEvent.toString();
          return boxEventId === selectedEventId;
        });
        
        const totals: { [priceRange: string]: number } = {};
        filteredData.forEach((box: any) => {
          console.log('Processing box entry:', box);
          totals[box.priceRange] = Number(box.totalBoxes) || Number(box.nos) || 0;
        });
        console.log('Box totals after filtering:', totals);
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
      .then((res) => res.json())
      .then((data) => setWeightEntries(data || []));
  }, [API_BASE_URL, selectedAnnkutEvent]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/recipe`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
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
    const total = boxRanges.reduce((sum: number, box: any) => {
      const nang = pieces[`${mithai.id}_${box.id}`] || 0;
      const totalBoxes = boxTotals[box.priceRange] || 0;
      console.log(`Box ${box.priceRange}: nang=${nang}, totalBoxes=${totalBoxes}, contribution=${nang * totalBoxes}`);
      return sum + nang * totalBoxes;
    }, 0);
    console.log(`Total nang for ${mithai.vangiName}: ${total}`);
    return total;
  };

  function baseName(name: string) {
    return name.split("(")[0].trim().toLowerCase();
  }

  const handlePrint = () => {
    setPrintDialogOpen(true);
  };

  // Check if there's unsaved data or obsolete data to clean up
  useEffect(() => {
    if (!mithais.length || !selectedAnnkutEvent) {
      setHasUnsavedData(false);
      return;
    }

    // Check for new/updated entries that need saving
    const hasNewData = mithais.some((mithai) => {
      // Skip if already saved
      if (storedMithaiIds.has(mithai.id)) {
        return false;
      }

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

      // Only show as unsaved if we have valid data to save
      console.log('Validation check for', mithai.vangiName, {
        flourKg,
        totalNang,
        isFlourValid: flourKg !== null && !isNaN(flourKg),
        isTotalNangValid: totalNang !== null && !isNaN(totalNang) && totalNang > 0
      });

      return (
        flourKg !== null &&
        !isNaN(flourKg) &&
        totalNang !== null &&
        !isNaN(totalNang) &&
        totalNang > 0
      );
    });

    // Check for obsolete entries that need deletion
    const currentMithaiIds = new Set(mithais.map(m => m.id));
    const hasObsoleteData = Array.from(storedMithaiIds).some(id => !currentMithaiIds.has(id));

    const hasChanges = hasNewData || hasObsoleteData;
    console.log('Has changes:', { hasNewData, hasObsoleteData, hasChanges });
    setHasUnsavedData(hasChanges);
  }, [mithais, weightEntries, recipes, boxTotals, pieces, storedMithaiIds, selectedAnnkutEvent]);

  // Check for existing saved entries when data loads
  useEffect(() => {
    if (!selectedAnnkutEvent || !mithais.length) {
      setStoredMithaiIds(new Set());
      setHasUnsavedData(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, user not logged in');
      return;
    }

    // Fetch existing saved entries for this event
    fetch(`${API_BASE_URL}/annkut-sidhu-saman?eventId=${selectedAnnkutEvent}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        const savedIds = new Set<number>();
        const savedEntries = new Map<number, { total_nang: number; total_flour: number }>();
        
        data.forEach((entry: any) => {
          savedIds.add(Number(entry.mithai_id));
          savedEntries.set(Number(entry.mithai_id), {
            total_nang: Number(entry.total_nang),
            total_flour: Number(entry.total_flour)
          });
        });
        
        setStoredMithaiIds(savedIds);
        
        // Check if any calculated values differ from saved values
        const hasChangedData = mithais.some((mithai) => {
          const totalNang = getTotalNang(mithai);
          const savedEntry = savedEntries.get(mithai.id);
          
          // Calculate flour for comparison
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
          
          console.log(`Checking mithai ${mithai.vangiName}:`, {
            calculatedNang: totalNang,
            calculatedFlour: flourKg,
            savedNang: savedEntry?.total_nang,
            savedFlour: savedEntry?.total_flour,
            hasEntry: !!savedEntry
          });
          
          if (!savedEntry) {
            // New entry - show save button if we have valid data
            return totalNang > 0 && flourKg !== null && !isNaN(flourKg);
          }
          
          // Check if calculated values differ from saved values
          const nangDiffers = Math.abs(savedEntry.total_nang - totalNang) > 0.01;
          const flourDiffers = flourKg !== null && Math.abs(savedEntry.total_flour - flourKg) > 0.01;
          
          console.log(`Differences: nang=${nangDiffers} (${savedEntry.total_nang} vs ${totalNang}), flour=${flourDiffers} (${savedEntry.total_flour} vs ${flourKg})`);
          
          return nangDiffers || flourDiffers;
        });

        console.log('Has changed data:', hasChangedData);
        setHasUnsavedData(hasChangedData);
      })
      .catch((error) => {
        console.error('Error fetching saved entries:', error);
        setStoredMithaiIds(new Set());
      });
  }, [API_BASE_URL, selectedAnnkutEvent, mithais, boxTotals, pieces, weightEntries, recipes]);

  // Force re-check when data changes
  useEffect(() => {
    if (!selectedAnnkutEvent || !mithais.length) {
      setHasUnsavedData(false);
      return;
    }

    // Check if any mithai has valid calculated data that differs from saved data
    const hasChanges = mithais.some((mithai) => {
      const totalNang = getTotalNang(mithai);
      
      if (totalNang <= 0) return false; // Skip if no valid data
      
      // Always return true if we have valid data - let the fetch logic handle comparison
      return true;
    });
    
    console.log('Force re-check - hasChanges:', hasChanges);
    
    if (hasChanges) {
      setHasUnsavedData(true);
    }
  }, [mithais, boxTotals, pieces, storedMithaiIds]);

  const handleSave = async () => {
    if (!selectedAnnkutEvent) {
      setSnackbar({ open: true, message: 'Please select an Annkut event first', severity: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setSnackbar({ open: true, message: 'Authentication required. Please login again.', severity: 'error' });
      return;
    }

    let savedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    // Get current mithai IDs from weight calculation entries
    const currentMithaiIds = new Set(mithais.map(m => m.id));

    // First, delete entries that no longer exist in weight calculation
    try {
      const existingEntries = await fetch(`${API_BASE_URL}/annkut-sidhu-saman?eventId=${selectedAnnkutEvent}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json());
      
      for (const entry of existingEntries) {
        if (!currentMithaiIds.has(entry.mithai_id)) {
          try {
            const res = await fetch(`${API_BASE_URL}/annkut-sidhu-saman/${entry.id}`, {
              method: 'DELETE',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              }
            });
            if (res.ok) {
              deletedCount++;
              setStoredMithaiIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(entry.mithai_id);
                return newSet;
              });
            }
          } catch (err) {
            console.error('Error deleting obsolete entry:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching existing entries:', err);
    }

    // Then save/update current entries
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

      // Add debugging before the save logic
      console.log('Debug mithai:', mithai.vangiName);
      console.log('Total nang:', totalNang);
      console.log('Gram entry:', gramEntry);
      console.log('Recipe entry:', recipeEntry);
      console.log('Items per kg:', itemPerKg);
      console.log('Nos from item per kg:', nosFromItemPerKg);
      console.log('Flour kg:', flourKg);
      console.log('Box totals:', boxTotals);
      console.log('Pieces for this mithai:', Object.entries(pieces).filter(([key]) => key.startsWith(`${mithai.id}_`)));
      console.log('Will save?', flourKg !== null && !isNaN(flourKg) && totalNang !== null && !isNaN(totalNang) && totalNang > 0);

      if (
        flourKg !== null &&
        !isNaN(flourKg) &&
        totalNang !== null &&
        !isNaN(totalNang) &&
        totalNang > 0
      ) {
        try {
          const res = await fetch(`${API_BASE_URL}/annkut-sidhu-saman`, {
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
              eventId: Number(selectedAnnkutEvent),
            }),
          });

          if (res.ok) {
            setStoredMithaiIds((prev) => new Set(prev).add(mithai.id));
            savedCount++;
          } else {
            console.error(`Failed to save ${mithai.vangiName}:`, await res.text());
            errorCount++;
          }
        } catch (err) {
          console.error("Error saving mithai to DB:", err);
          errorCount++;
        }
      }
    }

    // Show success/error message
    let message = '';
    let severity: 'success' | 'error' = 'success';
    
    if (savedCount > 0) message += `Saved ${savedCount} entries. `;
    if (deletedCount > 0) message += `Deleted ${deletedCount} obsolete entries. `;
    if (errorCount > 0) {
      message += `Failed to process ${errorCount} entries.`;
      severity = 'error';
    }
    
    if (message) {
      setSnackbar({ open: true, message: message.trim(), severity });
    } else {
      setSnackbar({ open: true, message: 'No changes made.', severity: 'success' });
    }
  };

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
                          }}
                        >
                          {box.priceRange}
                        </TableCell>
                      ))}
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#fff",
                          background: "#245D6B",
                          whiteSpace: "nowrap",
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
                        }}
                      >
                        Flour (kg)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedMithais.map((mithai: any, idx: number) => {
                      // Exact match for gram
                      const gramEntry = weightEntries.find(
                        (w) =>
                          w.vangiName &&
                          w.vangiName.trim() === mithai.vangiName.trim()
                      );
                      const gram = gramEntry ? Number(gramEntry.gram) : null;

                      // Base name match for recipe
                      const mithaiBase = baseName(mithai.vangiName || "");
                      const recipeEntry = recipes.find(
                        (r) =>
                          r.vangiName && baseName(r.vangiName) === mithaiBase
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
                          : "-";

                      const totalNang = getTotalNang(mithai);

                      const flourKg =
                        typeof nosFromItemPerKg === "number" &&
                        nosFromItemPerKg > 0
                          ? Number((totalNang / nosFromItemPerKg).toFixed(2))
                          : "-";

                      const rowBg = idx % 2 === 0 ? "#f7fbfc" : "#eaf3f6";

                      return (
                        <TableRow
                          key={mithai.id}
                          sx={{
                            backgroundColor: rowBg,
                          }}
                        >
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
                            {gram}
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
                            {mithai.vangiName}
                          </TableCell>
                          {boxRanges.map((box: any) => {
                            const nang = pieces[`${mithai.id}_${box.id}`] || 0;
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
                                {nang * totalBoxes}
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
                            {totalNang}
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
                            {nosFromItemPerKg}
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
                            {flourKg}
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 2 }}>
            {hasUnsavedData && (
              <Button
                variant="contained"
                sx={{
                  background: "#245D6B",
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": {
                    background: "#4A7D91",
                  },
                }}
                onClick={handleSave}
              >
                Save
              </Button>
            )}
            <Button
              variant="contained"
              sx={{
                background: "#245D6B",
                fontWeight: 700,
                textTransform: "none",
              }}
              onClick={handlePrint}
            >
              Print
            </Button>
          </Box>
        </Paper>
        {!printing && pageCount > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, value) => setPage(value)}
              sx={{
                "& .MuiPaginationItem-root": {
                  color: "#245D6B",
                  borderColor: "#245D6B",
                },
                "& .Mui-selected": {
                  backgroundColor: "#4A7D91 !important",
                  color: "#fff",
                  borderColor: "#245D6B",
                },
                "& .MuiPaginationItem-root:hover": {
                  backgroundColor: "#E3F2FD",
                },
              }}
            />
          </Box>
        )}
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
                        }}
                      >
                        {box.priceRange}
                      </TableCell>
                    ))}
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        background: "#245D6B",
                        whiteSpace: "nowrap",
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
                      }}
                    >
                      Flour (kg)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mithais.map((mithai: any, idx: number) => {
                    // Exact match for gram
                    const gramEntry = weightEntries.find(
                      (w) =>
                        w.vangiName &&
                        w.vangiName.trim() === mithai.vangiName.trim()
                    );
                    const gram = gramEntry ? Number(gramEntry.gram) : null;

                    // Base name match for recipe
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
                        : "-";

                    const totalNang = getTotalNang(mithai);

                    const flourKg =
                      typeof nosFromItemPerKg === "number" &&
                      nosFromItemPerKg > 0
                        ? Number((totalNang / nosFromItemPerKg).toFixed(2))
                        : null

                    const rowBg = idx % 2 === 0 ? "#f7fbfc" : "#eaf3f6";

                    return (
                      <TableRow
                        key={mithai.id}
                        sx={{
                          backgroundColor: rowBg,
                        }}
                      >
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
                          {gram}
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
                          {mithai.vangiName}
                        </TableCell>
                        {boxRanges.map((box: any) => {
                          const nang = pieces[`${mithai.id}_${box.id}`] || 0;
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
                              {nang * totalBoxes}
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
                          {totalNang}
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
                          {nosFromItemPerKg}
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
                          {flourKg}
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
