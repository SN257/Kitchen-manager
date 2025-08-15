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
  
  // Add snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Use context instead of local state
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  
  const API_BASE_URL = useApiBaseUrl();

  // Remove pagination variables and use all data
  const displayedMithais = mithais;

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
            console.error("Error auto-saving mithai data:", err);
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
            nos_per_kg: Number(entry.nos_per_kg || 0)
          };
        });
        
        setCalculatedData(calculatedMap);
      }
    } catch (error) {
      console.error('Error fetching calculated data:', error);
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
                            ({boxTotals[box.priceRange] || 0})
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
                    {displayedMithais.map((mithai: any, idx: number) => {
                      // Get calculated data from database first, fallback to live calculation
                      const savedData = calculatedData[mithai.id];
                      
                      // Live calculation for comparison/fallback
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

                      // Use saved data if available, otherwise calculate live
                      const totalNang = savedData ? savedData.total_nang : getTotalNang(mithai);
                      const nosFromItemPerKg = savedData && savedData.nos_per_kg > 0 ? savedData.nos_per_kg : (
                        gram !== null &&
                        !isNaN(gram) &&
                        itemPerKg !== null &&
                        !isNaN(itemPerKg) &&
                        gram > 0
                          ? Math.floor((itemPerKg * 1000) / gram)
                          : null
                      );
                      const flourKg = savedData && savedData.total_flour > 0 ? savedData.total_flour : (
                        typeof nosFromItemPerKg === "number" && nosFromItemPerKg > 0
                          ? Number((totalNang / nosFromItemPerKg).toFixed(2))
                          : null
                      );

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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 2 }}>
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
                          ({boxTotals[box.priceRange] || 0})
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
                        : null;

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
