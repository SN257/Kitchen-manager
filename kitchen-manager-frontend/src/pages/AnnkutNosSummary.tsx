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
} from "@mui/material";
import SummarizeIcon from "@mui/icons-material/Summarize";
import { useApiBaseUrl } from "../config/config";
import "../App.css";

const ROWS_PER_PAGE = 5;

const AnnkutNosSummary: React.FC = () => {
  const [mithais, setMithais] = useState<any[]>([]);
  const [boxRanges, setBoxRanges] = useState<any[]>([]);
  const [pieces, setPieces] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [boxTotals, setBoxTotals] = useState<{ [boxId: number]: number }>({});
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
  const API_BASE_URL = useApiBaseUrl();

  const pageCount = Math.ceil(mithais.length / ROWS_PER_PAGE);

  // Show all entries in print, paginate on screen
  const paginatedMithais = printing
    ? mithais
    : mithais.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/weight-calculation-entries/latest`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.entries) {
          const sortedMithais = data.entries
            .map((entry: any) => ({
              id: entry.mithaiId,
              vangiName: entry.mithaiName,
              nang: entry.totalNang,
              boxEntries: entry.boxEntries,
            }))
            .sort((a: any, b: any) => a.id - b.id);
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
          setBoxRanges(uniqueBoxes.sort((a: any, b: any) => a.id - b.id));

          // Build pieces map
          const newPieces: { [key: string]: number } = {};
          data.entries.forEach((mithai: any) => {
            mithai.boxEntries.forEach((boxEntry: any) => {
              newPieces[`${mithai.mithaiId}_${boxEntry.boxId}`] =
                boxEntry.pieces;
            });
          });
          setPieces(newPieces);
        }
      })
      .finally(() => setLoading(false));
  }, [API_BASE_URL]);

  useEffect(() => {
    if (!mithais.length) return;

    mithais.forEach((mithai) => {
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
        !storedMithaiIds.has(mithai.id) &&
        flourKg !== null &&
        !isNaN(flourKg) &&
        totalNang !== null &&
        !isNaN(totalNang)
      ) {
        fetch(`${API_BASE_URL}/annkut-sidhu-saman`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mithai_id: Number(mithai.id),
            mithai_name: String(mithai.vangiName),
            total_nang: Number(totalNang),
            total_flour: Number(flourKg),
          }),
        })
          .then((res) => {
            if (res.ok) {
              setStoredMithaiIds((prev) => new Set(prev).add(mithai.id));
            } else {
              console.error("Failed to store mithai in DB:", res.statusText);
            }
          })
          .catch((err) => console.error("Error saving mithai to DB:", err));
      }
    });
  }, [mithais, weightEntries, recipes, boxTotals, pieces]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/box-weight-entries`)
      .then((res) => res.json())
      .then((data) => {
        const totals: { [boxId: number]: number } = {};
        data.forEach((box: any) => {
          totals[box.id] = box.totalBoxes || box.nos || 0;
        });
        setBoxTotals(totals);
      });
  }, [API_BASE_URL]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/weight-entries`)
      .then((res) => res.json())
      .then((data) => setWeightEntries(data || []));
  }, [API_BASE_URL]);

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
    return boxRanges.reduce((sum: number, box: any) => {
      const nang = pieces[`${mithai.id}_${box.id}`] || 0;
      const totalBoxes = boxTotals[box.id] || 0;
      return sum + nang * totalBoxes;
    }, 0);
  };

  function baseName(name: string) {
    return name.split("(")[0].trim().toLowerCase();
  }

  const handlePrint = () => {
    setPrintDialogOpen(true);
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
          </Box>
        </Box>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
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
                              width: 80,
                              minWidth: 80,
                              maxWidth: 80,
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
                            const totalBoxes = boxTotals[box.id] || 0;
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
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
                            width: 80,
                            minWidth: 80,
                            maxWidth: 80,
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
                          const totalBoxes = boxTotals[box.id] || 0;
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
    </>
  );
};
export default AnnkutNosSummary;