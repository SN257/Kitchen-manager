import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import SummarizeIcon from "@mui/icons-material/Summarize";
import { useApiBaseUrl } from "../config/config";
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const AnnkutSidhuSaman = () => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [annkutData, setAnnkutData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  
  // Use context instead of local state
  const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
  
  const API_BASE_URL = useApiBaseUrl();

  // Remove the fetchAnnkutEvents useEffect and update the data fetching useEffect
  useEffect(() => {
    if (!selectedAnnkutEvent) {
      setRecipes([]);
      setAnnkutData([]);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/recipe`, {
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }).then((res) => (res.ok ? res.json() : [])),
      fetch(`${API_BASE_URL}/annkut-sidhu-saman?eventId=${selectedAnnkutEvent}`, {
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }).then((res) => (res.ok ? res.json() : []))
    ])
      .then(([recipesData, annkutData]) => {
        setRecipes(Array.isArray(recipesData) ? recipesData : []);
        setAnnkutData(Array.isArray(annkutData) ? annkutData : []);
      })
  .catch(() => { setRecipes([]); setAnnkutData([]); })
      .finally(() => setLoading(false));
  }, [API_BASE_URL, selectedAnnkutEvent]);

  const allIngredients = Array.from(
    new Set(
      recipes.flatMap((recipe) =>
        recipe.ingredients?.map((ing: any) => ing.ingredientName)
      )
    )
  ).sort();

  type Column = {
    id: number;
    name: string;
    ingredients: any[];
    totalFlour: number | null;
  };

  const columns: Column[] = annkutData
    .reduce((unique, entry) => {
      // Check if we already have an entry with the same mithai_name
      const existingIndex = unique.findIndex((item: { mithai_name: string }) => item.mithai_name === entry.mithai_name);
      
      if (existingIndex === -1) {
        // If not found, add the entry
        unique.push(entry);
      } else {
        // If found, keep the one with higher total_flour or more recent data
        if (entry.total_flour > unique[existingIndex].total_flour) {
          unique[existingIndex] = entry;
        }
      }
      
      return unique;
    }, [] as any[])
    .map((entry: { id: number; mithai_name: string; total_flour: number }) => {
      // Find the matching recipe for this mithai - try exact match first, then base name match
      let recipe = recipes.find((r) => r.vangiName === entry.mithai_name);
      
      // If no exact match, try matching base name (before parentheses)
      if (!recipe) {
        const baseName = entry.mithai_name.split('(')[0].trim();
        recipe = recipes.find((r) => r.vangiName.trim() === baseName);
      }

      return {
        id: entry.id,
        name: entry.mithai_name,
        ingredients: recipe?.ingredients || [], // Use recipe ingredients if available
        totalFlour: entry.total_flour || null, // Use total_flour from annkutData
      };
    });

  const getIngredientWeight = (recipe: any, ingName: string) => {
    const found = recipe.ingredients.find(
      (ing: any) => ing.ingredientName === ingName
    );

    // If no total_flour, return "-"
    if (!recipe.totalFlour) {
      return "-";
    }

    // Scale the ingredient weight based on `total_flour`
    if (found && recipe.totalFlour > 0) {
      const weight = found.kg * recipe.totalFlour;
      return weight > 0 ? `${weight.toFixed(3)} kg` : "-"; // Changed to toFixed(3) and removed Number()
    }

    return "-"; // Return "-" if no match or weight is 0
  };

  const getTotalWeightByIngredient = (ingName: string) => {
    let hasValidWeight = false;
    const total = columns.reduce((sum: number, recipe: { id: number; name: string; ingredients: any[]; totalFlour: number | null }) => {
      const weightStr = getIngredientWeight(recipe, ingName);
      // Extract numeric value from weight string (remove " kg")
      if (typeof weightStr === 'string' && weightStr !== '-') {
        const weight = parseFloat(weightStr.replace(' kg', ''));
        if (!isNaN(weight) && weight > 0) {
          hasValidWeight = true;
          return sum + weight;
        }
      }
      return sum;
    }, 0);
    
    // Return "-" if no valid weights were found, otherwise return the formatted total with kg unit
    return hasValidWeight ? `${total.toFixed(3)} kg` : "-"; // Changed to toFixed(3)
  };

  const ingredientWithId = allIngredients
    .map((name, idx) => ({
      id: idx + 1,
      name,
    }))
    .filter((ingredient) => {
      // Only include ingredients that have weight in at least one column
      const totalWeight = getTotalWeightByIngredient(ingredient.name);
      return totalWeight !== "-";
    });

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: "80vh" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <SummarizeIcon sx={{ color: "#245D6B", fontSize: 32, mr: 1 }} />
        <Typography variant="h5" sx={{ color: "#245D6B", fontWeight: 700 }}>
          Annkut Sidhu Saman
        </Typography>
        {selectedEventDetails && (
          <Typography variant="body1" sx={{ ml: 2, color: "#666", fontStyle: "italic" }}>
            - {selectedEventDetails.eventName} {selectedEventDetails.eventYear}
          </Typography>
        )}
      </Box>
      
      <Paper elevation={3} sx={{ p: 2, opacity: selectedAnnkutEvent ? 1 : 0.5, pointerEvents: selectedAnnkutEvent ? 'auto' : 'none' }}>
        {!selectedAnnkutEvent ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Typography variant="h6" sx={{ color: "#245D6B", fontStyle: "italic" }}>
              Please select an Annkut event from the menu bar
            </Typography>
          </Box>
        ) : loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : annkutData.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Typography variant="h6" sx={{ color: "#999", fontStyle: "italic" }}>
              No data available for the selected event
            </Typography>
          </Box>
        ) : (
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
            <Table sx={{ width: "100%" }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      background: "#245D6B",
                      color: "#fff",
                      whiteSpace: "nowrap",
                      position: "sticky",
                      left: 0,
                      top: 0,
                      zIndex: 4,
                      minWidth: 50,
                      maxWidth: 50,
                    }}
                  >
                    ID
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      background: "#245D6B",
                      color: "#fff",
                      whiteSpace: "nowrap",
                      position: "sticky",
                      left: 50,
                      top: 0,
                      zIndex: 4,
                      minWidth: 150,
                      maxWidth: 150,
                    }}
                  >
                    Ingredient Name
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      sx={{
                        fontWeight: 700,
                        background: "#245D6B",
                        color: "#fff",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                        position: "sticky",
                        top: 0,
                        zIndex: 3,
                      }}
                    >
                      {col.name}
                    </TableCell>
                  ))}
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      background: "#245D6B",
                      color: "#fff",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    Total Weight
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ingredientWithId.map((ingredient, idx) => {
                  const rowBg = idx % 2 === 0 ? "#f7fbfc" : "#eaf3f6";
                  return (
                    <TableRow key={ingredient.id} sx={{ backgroundColor: rowBg }}>
                      <TableCell
                        sx={{
                          position: "sticky",
                          left: 0,
                          background: rowBg,
                          zIndex: 2,
                        }}
                      >
                        {ingredient.id}
                      </TableCell>
                      <TableCell
                        sx={{
                          position: "sticky",
                          left: 50,
                          background: rowBg,
                          zIndex: 2,
                        }}
                      >
                        {ingredient.name}
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.id} align="center">
                          {getIngredientWeight(col, ingredient.name)}
                        </TableCell>
                      ))}
                      <TableCell align="center">
                        {getTotalWeightByIngredient(ingredient.name)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button
            variant="contained"
            sx={{
              background: "#245D6B",
              textTransform: "none",
              fontWeight: 700,
            }}
            onClick={() => setPrintDialogOpen(true)}
          >
            Print
          </Button>
        </Box>
      </Paper>

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
                Annkut Sidhu Saman Summary
              </h1>
              <div style={{ color: "#555", fontSize: 16, marginTop: 4 }}>
                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by
                Kitchen Manager
              </div>
            </div>

            <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
              <Table sx={{ width: "100%" }} stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        background: "#245D6B",
                        whiteSpace: "nowrap",
                        position: "sticky",
                        left: 0,
                        top: 0,
                        zIndex: 4,
                        minWidth: 80,
                        maxWidth: 80,
                      }}
                    >
                      ID
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        background: "#245D6B",
                        whiteSpace: "nowrap",
                        position: "sticky",
                        left: 80,
                        top: 0,
                        zIndex: 4,
                        minWidth: 120,
                        maxWidth: 120,
                      }}
                    >
                      Ingredient Name
                    </TableCell>
                    {columns.map((col) => (
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
                        {col.name}
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
                      Total Weight
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ingredientWithId.map((ingredient, idx) => {
                    const rowBg = idx % 2 === 0 ? "#f7fbfc" : "#eaf3f6";
                    return (
                      <TableRow
                        key={ingredient.id}
                        sx={{ backgroundColor: rowBg }}
                      >
                        <TableCell
                          sx={{
                            position: "sticky",
                            left: 0,
                            background: rowBg,
                            zIndex: 2,
                          }}
                        >
                          {ingredient.id}
                        </TableCell>
                        <TableCell
                          sx={{
                            position: "sticky",
                            left: 80,
                            background: rowBg,
                            zIndex: 2,
                          }}
                        >
                          {ingredient.name}
                        </TableCell>
                        {columns.map((col) => (
                          <TableCell key={col.id} align="center">
                            {getIngredientWeight(col, ingredient.name)}
                          </TableCell>
                        ))}
                        <TableCell align="center">
                          {getTotalWeightByIngredient(ingredient.name)}
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
    </Box>
  );
};

export default AnnkutSidhuSaman;
