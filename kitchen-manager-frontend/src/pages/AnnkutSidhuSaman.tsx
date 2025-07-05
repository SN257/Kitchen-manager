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

const AnnkutSidhuSaman = () => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const API_BASE_URL = useApiBaseUrl();

  useEffect(() => {
    fetch(`${API_BASE_URL}/recipe`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {console.log("data", data);setRecipes(Array.isArray(data) ? data : [])})
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false));
  }, [API_BASE_URL]);

  const allIngredients = Array.from(
    new Set(
      recipes.flatMap((recipe) =>
        recipe.ingredients?.map((ing: any) => ing.ingredientName)
      )
    )
  ).sort();

  const ingredientWithId = allIngredients.map((name, idx) => ({
    id: idx + 1,
    name,
  }));

  const columns = recipes.map((r) => {
    return {
      id: r.id,
      name: r.vangiName,
      ingredients: r.ingredients,
    };
  });

  const getIngredientWeight = (recipe: any, ingName: string) => {
    const found = recipe.ingredients.find(
      (ing: any) => ing.ingredientName === ingName
    );
    return found ? found.kg : 0;
  };

  const getTotalWeightByIngredient = (ingName: string) => {
    const total = recipes.reduce((sum, recipe) => {
      const found = recipe.ingredients.find(
        (ing: any) => ing.ingredientName === ingName
      );
      return sum + (found ? Number(found.kg) : 0);
    }, 0);
    return Number(total.toFixed(2));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <SummarizeIcon sx={{ color: "#245D6B", fontSize: 32, mr: 1 }} />
        <Typography variant="h5" sx={{ color: "#245D6B", fontWeight: 700 }}>
          Annkut Sidhu Saman
        </Typography>
      </Box>
      <Paper elevation={3} sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
            <Table sx={{ width: "100%" }}>
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
                      zIndex: 3,
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
                      zIndex: 3,
                      minWidth: 150,
                      maxWidth: 150,
                    }}
                  >
                    Ingredient Name
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        background: "#245D6B",
                        color: "#fff",
                        whiteSpace: "nowrap",
                        textAlign: "center",
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
              <Table sx={{ width: "100%" }}>
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
                        zIndex: 3,
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
                        zIndex: 3,
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
