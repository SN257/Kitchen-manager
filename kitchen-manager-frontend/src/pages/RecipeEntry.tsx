import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptIcon from '@mui/icons-material/Receipt';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useApiBaseUrl } from '../config/config';

const RecipeEntry: React.FC = () => {
  const ROWS_PER_PAGE = 5;
  const [recipes, setRecipes] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [editRecipe, setEditRecipe] = useState<any | null>(null);
  const [editVangiName, setEditVangiName] = useState('');
  const [, setEditIngredients] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewRecipe, setViewRecipe] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [itemsPerKg, setItemsPerKg] = useState('');
  const [editItemsPerKg, setEditItemsPerKg] = useState('');
  const API_BASE_URL = useApiBaseUrl();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [vanagiSearch, setVanagiSearch] = useState('');
  const [vangiList, setVangiList] = useState<{ id: number; vangiName: string }[]>([]);
  const [ingredientList, setIngredientList] = useState<{ id: number; ingredientName: string; category: string }[]>([]);
  const [vangiId, setVangiId] = useState('');
  const [ingredients, setIngredients] = useState<{ ingredientId: string; ingredientName: string; kg: string }[]>([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<{ [id: string]: boolean }>({});
  const [ingredientKgs, setIngredientKgs] = useState<{ [id: string]: string }>({});
  const [focusIngredientId, setFocusIngredientId] = useState<string | null>(null);
  const filteredRecipes = recipes.filter(recipe =>
    recipe.vangiName.toLowerCase().includes(vanagiSearch.toLowerCase())
  );
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;
  const center = user.center;
  const [selectedCenter, setSelectedCenter] = useState<string>(center || '');
  const [centers, setCenters] = useState<string[]>([]);
  useEffect(() => {
    if (role === 'sant') {
      fetch(`${API_BASE_URL}/user/center`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          console.log('Fetched centers:', data); // Debugging log
          setCenters(data);
        })
        .catch(error => {
          console.error('Failed to fetch centers:', error);
        });
    }
  }, [role]);

  useEffect(() => {
    let url = `${API_BASE_URL}/recipe`;
    if (role === 'sant' && selectedCenter) {
      url += `?center=${encodeURIComponent(selectedCenter)}`;
    }
    fetch(url, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        console.log('Fetched recipes:', data);
        setRecipes(data);
      });
  }, [selectedCenter, role]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/food-item`)
      .then(res => res.json())
      .then(data => setVangiList(data));
    fetch(`${API_BASE_URL}/ingredient`)
      .then(res => res.json())
      .then(data => setIngredientList(data));
  }, []);

  const fetchRecipes = () => {
    fetch(`${API_BASE_URL}/recipe`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setRecipes(Array.isArray(data) ? data : []));
  };

  // useEffect(() => {
  //   fetchRecipes();
  // }, []);

  useEffect(() => {
    const savedIngredients = localStorage.getItem('recipe_ingredients');
    const savedVangiId = localStorage.getItem('recipe_vangiId');
    if (savedIngredients) setIngredients(JSON.parse(savedIngredients));
    if (savedVangiId) setVangiId(savedVangiId);
  }, []);

  useEffect(() => {
    localStorage.setItem('recipe_ingredients', JSON.stringify(ingredients));
    localStorage.setItem('recipe_vangiId', vangiId);
  }, [ingredients, vangiId]);

  const handleVangiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVangiId(e.target.value);
    setIngredientDialogOpen(true);
    setSelectedIngredients({});
    setIngredientKgs({});
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const filteredIngredients = ingredientList
    .filter(ing => ing.ingredientName.toLowerCase().includes(searchTerm))
    .sort((a, b) => {
      const aSelected = !!selectedIngredients[a.id];
      const bSelected = !!selectedIngredients[b.id];
      if (aSelected === bSelected) return 0;
      return aSelected ? -1 : 1;
    });

  const handleVangiClick = () => {
    if (vangiId) {
      setIngredientDialogOpen(true);
      const selected: { [id: string]: boolean } = {};
      const kgs: { [id: string]: string } = {};
      ingredients.forEach(ing => {
        selected[ing.ingredientId] = true;
        kgs[ing.ingredientId] = ing.kg;
      });
      setSelectedIngredients(selected);
      setIngredientKgs(kgs);
    }
  };

  const handleIngredientDialogClose = () => {
    setIngredientDialogOpen(false);
    setFocusIngredientId(null);
    const anySelectedInPopup = Object.values(selectedIngredients).some(Boolean);
    if (!anySelectedInPopup && ingredients.length === 0) {
      setVangiId('');
    }
  };

  const handleIngredientCheck = (id: string) => {
    setSelectedIngredients(prev => {
      const checked = !prev[id];
      if (checked) {
        if (!ingredientKgs[id] || ingredientKgs[id] === '') {
          setIngredientKgs(prevKgs => ({
            ...prevKgs,
            [id]: '1',
          }));
        }
      } else {
        setIngredientKgs(prevKgs => {
          const newKgs = { ...prevKgs };
          delete newKgs[id];
          return newKgs;
        });
      }
      return {
        ...prev,
        [id]: checked,
      };
    });
  };

  const handleKgChange = (id: string, value: string) => {
    setIngredientKgs(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleIngredientDialogSubmit = () => {
    const selected = Object.entries(selectedIngredients)
      .filter(([, checked]) => checked)
      .map(([id]) => {
        const ingredientObj = ingredientList.find(i => i.id.toString() === id);
        return {
          ingredientId: id,
          ingredientName: ingredientObj ? ingredientObj.ingredientName : '',
          kg: ingredientKgs[id] || '1',
        };
      });
    setIngredients(selected);
    setIngredientDialogOpen(false);
    setFocusIngredientId(null);
  };

  const handleEditIngredient = (ingredientId: string) => {
    const selected: { [id: string]: boolean } = {};
    const kgs: { [id: string]: string } = {};
    ingredients.forEach(ing => {
      selected[ing.ingredientId] = true;
      kgs[ing.ingredientId] = ing.kg;
    });
    setSelectedIngredients(selected);
    setIngredientKgs(kgs);
    setFocusIngredientId(ingredientId);
    setIngredientDialogOpen(true);
  };

  const handleDeleteIngredient = (ingredientId: string) => {
    setIngredients(prev => prev.filter(ing => ing.ingredientId !== ingredientId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (ingredients.length === 0) {
      setError('Please add at least one ingredient.');
      return;
    }
    if (!vangiId) {
      setError('Please select a Vangi.');
      return;
    }
    try {
      const vangiObj = vangiList.find(v => v.id.toString() === vangiId);
      const vangiName = vangiObj ? vangiObj.vangiName : '';
      const itemsPerKgToSend = itemsPerKg && itemsPerKg !== '' ? Number(itemsPerKg) : 1;

      const res = await fetch(`${API_BASE_URL}/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vangiName,
          ingredients,
          items_per_kg: itemsPerKgToSend,
          center,
          // userId: user.id,
        }),
        credentials: 'include',

      });
      const data = await res.json();
      console.log('POST response:', data);
      if (!res.ok) {
        setSnackbar({ open: true, message: 'Failed to save recipe.', severity: 'error' });
        return;
      }
      setVangiId('');
      setIngredients([]);
      setError('');
      localStorage.removeItem('recipe_ingredients');
      localStorage.removeItem('recipe_vangiId');
      setItemsPerKg('');
      if (role === 'sant') {
        setSelectedCenter(center || '');
      }
      fetchRecipes();
      setSnackbar({ open: true, message: 'Recipe saved successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
    }
  };

  const handleEditOpen = (recipe: any) => {
    setEditRecipe(recipe);
    setEditVangiName(recipe.vangiName);
    setEditIngredients(recipe.ingredients.map((i: any) => `${i.ingredientName} (${i.kg} KG)`).join(', '));
    setEditItemsPerKg(recipe.items_per_kg?.toString() || '');

    setIngredientDialogOpen(true);

    const selected: { [id: string]: boolean } = {};
    const kgs: { [id: string]: string } = {};
    recipe.ingredients.forEach((ing: any) => {
      selected[ing.ingredientId] = true;
      kgs[ing.ingredientId] = ing.kg;
    });

    setSelectedIngredients(selected);
    setIngredientKgs(kgs);
  };

  const handleEditSave = async () => {
    if (!editRecipe) return;

    try {
      const updatedIngredients = Object.entries(selectedIngredients)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => ({
          ingredientId: id,
          ingredientName: ingredientList.find(ing => ing.id.toString() === id)?.ingredientName || '',
          kg: ingredientKgs[id] || '',
        }));

      const res = await fetch(`${API_BASE_URL}/recipe/${editRecipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vangiName: editVangiName,
          ingredients: updatedIngredients,
          items_per_kg: editItemsPerKg && editItemsPerKg !== '' ? Number(editItemsPerKg) : 1,
        }),
      });

      if (!res.ok) {
        setSnackbar({ open: true, message: 'Failed to update recipe.', severity: 'error' });
        return;
      }

      setIngredientDialogOpen(false);
      setEditRecipe(null);
      fetchRecipes();
      setSnackbar({ open: true, message: 'Recipe updated successfully!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/recipe/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setSnackbar({ open: true, message: 'Failed to delete recipe.', severity: 'error' });
        return;
      }
      fetchRecipes();
      setSnackbar({ open: true, message: 'Recipe deleted successfully!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Server error. Please try again.', severity: 'error' });
    }
  };

  const selectedVangi = vangiList.find(v => v.id.toString() === vangiId);

  return (
    <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ReceiptIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
          Recipe Entry
        </Typography>
      </Box>
      <Paper
        elevation={4}
        sx={{
          p: { xs: 2, sm: 4 },
          mt: 5,
          width: '100%',
          borderRadius: 2,
          boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
            <TextField
              select
              label="Vanagi"
              value={vangiList.some(v => v.id.toString() === vangiId) ? vangiId : ''}
              onChange={handleVangiChange}
              onClick={handleVangiClick}
              fullWidth
              sx={{ flex: 2 }}
              InputProps={{
                startAdornment: <FastfoodIcon sx={{ color: '#245D6B', mr: 1 }} />,
              }}
            >
              {vangiList.map(vangi => (
                <MenuItem key={vangi.id} value={vangi.id.toString()}>
                  {vangi.vangiName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Item will made on per 1 KG ingredient"
              type="number"
              value={itemsPerKg}
              onChange={e => {
                // Allow only digits and one decimal point
                const normalizedValue = e.target.value.replace(/[૦૧૨૩૪૫૬૭૮૯]/g, char =>
                  '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(char)]
                );
                // Allow empty, digits, or digits with one decimal
                if (/^\d*\.?\d*$/.test(normalizedValue)) {
                  setItemsPerKg(normalizedValue);
                }
              }}
              fullWidth
              sx={{ flex: 2 }}
              inputProps={{ inputMode: 'decimal', pattern: '[0-9.૦-૯]*', min: 0, step: 'any' }}
              InputProps={{
                endAdornment: <span style={{ marginLeft: 4 }}>Kg</span>,
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: '#245D6B',
                fontWeight: 600,
                letterSpacing: 1,
                height: '56px',
                minWidth: '90px',
                transition: 'background 0.3s, color 0.3s',
                '&:hover': {
                  bgcolor: '#4A7D91',
                  color: '#fff',
                },
              }}
              size="large"
            >
              Save Recipe
            </Button>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <List>
            {ingredients.map((item, idx) => (
              <ListItem key={idx} secondaryAction={
                <>
                  <IconButton
                    size="small"
                    sx={{ color: '#245D6B' }}
                    aria-label="edit"
                    onClick={() => handleEditIngredient(item.ingredientId)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="delete"
                    onClick={() => handleDeleteIngredient(item.ingredientId)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              }>
                <ListItemText primary={`${item.ingredientName} - ${item.kg} KG`} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, mb: -2 }}>
        {role === 'sant' && centers.length > 0 && (
          <TextField
            select
            label="Select Center"
            value={selectedCenter}
            onChange={e => setSelectedCenter(e.target.value)}
            fullWidth
            size="small"
            sx={{
              width: 200,
              mr: 2,
              background: '#fff',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                background: '#fff',
                borderRadius: 2,
                color: '#245D6B',
              },
              '& .MuiInputLabel-root': {
                color: '#245D6B',
              },
              '& .MuiInputBase-input': {
                color: '#245D6B',
              },
            }}
          >
            {centers.map(center => (
              <MenuItem key={center} value={center}>
                {center}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          label="Search by Vanagi Name"
          variant="outlined"
          size="small"
          value={vanagiSearch}
          onChange={e => setVanagiSearch(e.target.value)}
          sx={{
            width: 300,
            background: '#fff',
            borderRadius: 5,
            '& .MuiOutlinedInput-root': {
              background: '#fff',
              borderRadius: 2,
              color: '#245D6B',
            },
            '& .MuiInputLabel-root': { color: '#245D6B' },
            '& .MuiInputBase-input': { color: '#245D6B' },
          }}
        />
      </Box>
      <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Vanagi Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Ingredients</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Items Per KG</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecipes.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE).length > 0 ? (
              filteredRecipes.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE).map((recipe, idx) => (
                <TableRow key={recipe.id}>
                  <TableCell sx={{ fontSize: 16 }}>
                    {(page - 1) * ROWS_PER_PAGE + idx + 1}
                  </TableCell>
                  <TableCell sx={{ fontSize: 16 }}>{recipe.vangiName}</TableCell>
                  <TableCell
                    sx={{
                      fontSize: 16,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {recipe.ingredients
                      .slice(0, 5)
                      .map((i: any) => `${i.ingredientName} (${i.kg} KG)`)
                      .join(', ')}
                    {recipe.ingredients.length > 5 && '...'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 16 }}>
                    {recipe.items_per_kg}
                  </TableCell>
                  <TableCell >
                    <IconButton
                      size="small"
                      sx={{ color: '#245D6B' }}
                      onClick={() => handleEditOpen(recipe)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ color: '#245D6B' }}
                      onClick={() => {
                        setViewRecipe(recipe);
                        setViewDialogOpen(true);
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ color: '#245D6B' }}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setDeleteId(recipe.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
                  No raw data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {Math.ceil(recipes.length / ROWS_PER_PAGE) > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={Math.ceil(filteredRecipes.length / ROWS_PER_PAGE)}
            page={page}
            onChange={(_, value) => setPage(value)}
            sx={{
              '& .MuiPaginationItem-root': {
                color: '#245D6B',
                borderColor: '#245D6B',
              },
              '& .Mui-selected': {
                backgroundColor: '#4A7D91 !important',
                color: '#fff',
                borderColor: '#245D6B',
              },
              '& .MuiPaginationItem-root:hover': {
                backgroundColor: '#E3F2FD',
              },
            }}
          />
        </Box>
      )}

      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 4px 24px rgba(36,93,107,0.10)',
            background: '#fff',
            p: 3,
            '@media print': {
              boxShadow: 'none',
              borderRadius: 0,
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
              margin: 0,
              padding: 0,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            color: '#245D6B',
            fontSize: 28,
            borderBottom: '1px solid #e0e0e0',
            mb: 2,
            '@media print': {
              color: '#000',
              borderBottom: '1px solid #000',
              fontSize: 24,
            },
          }}
        >
          {viewRecipe?.vangiName}
        </DialogTitle>
        <DialogContent
          sx={{
            background: '#f9f9f9',
            borderRadius: 2,
            mt: 2,
            mb: 1,
            '@media print': {
              background: '#fff',
              color: '#000',
            },
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              mb: 2,
              mt: 2,
              color: '#245D6B',
              fontSize: 20,
              '@media print': { color: '#000', fontSize: 18 },
            }}
          >
            Ingredients
          </Typography>
          <Table size="small" sx={{
            background: '#fff',
            borderRadius: 1,
            boxShadow: '0 1px 8px 0 rgba(36,93,107,0.18)',
            '@media print': { boxShadow: 'none', border: '1px solid #000' }
          }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: 16,
                    background: '#fff',
                    color: '#245D6B',
                    border: 'none',
                    '@media print': { background: '#fff', color: '#000', border: '1px solid #000' }
                  }}
                >
                  Ingredient
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: 16,
                    background: '#fff',
                    color: '#245D6B',
                    border: 'none',
                    '@media print': { background: '#fff', color: '#000', border: '1px solid #000' }
                  }}
                >
                  Quantity
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {viewRecipe?.ingredients?.map((ing: any, idx: number) => (
                <TableRow
                  key={idx}
                  sx={{
                    backgroundColor: idx % 2 === 0 ? 'rgba(36,93,107,0.08)' : '#fff',
                    '@media print': { backgroundColor: '#fff' }
                  }}
                >
                  <TableCell
                    sx={{
                      fontWeight: 500,
                      fontSize: 16,
                      border: 'none',
                      '@media print': { border: '1px solid #000' }
                    }}
                  >
                    {ing.ingredientName}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: '#245D6B',
                      fontSize: 16,
                      border: 'none',
                      '@media print': { color: '#000', border: '1px solid #000' }
                    }}
                  >
                    {ing.kg} KG
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: '#245D6B',
                fontSize: 18,
                '@media print': { color: '#000', fontSize: 16 },
              }}
            >
              Item will be made as per 1 Kg Ingredients:&nbsp;
              <span style={{ fontWeight: 700 }}>
                {viewRecipe?.items_per_kg}
              </span>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            '@media print': { display: 'none' }
          }}
        >
          <Button
            onClick={() => window.print()}
            variant="outlined"
            sx={{
              borderColor: '#245D6B',
              color: '#245D6B',
              fontWeight: 600,
              '&:hover': { borderColor: '#4A7D91', color: '#4A7D91' },
            }}
          >
            Print
          </Button>
          <Button onClick={() => setViewDialogOpen(false)} sx={{ color: '#245D6B', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} sx={{ marginLeft: 20 }}>
        <Box sx={{ p: 3, minWidth: 600 }}>
          <DialogTitle sx={{ p: 0, mb: 2 }}>Confirm Delete</DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Typography>Are you sure you want to delete this recipe?</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 0, mt: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#245D6B' }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (deleteId !== null) {
                  await handleDelete(deleteId);
                }
                setDeleteDialogOpen(false);
                setDeleteId(null);
              }}
              color="error"
              variant="contained"
              sx={{ background: '#B71C1C' }}
            >
              Delete
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={ingredientDialogOpen}
        onClose={handleIngredientDialogClose}
        maxWidth="lg"
        sx={{ ml: 25, mt: 7 }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 2,
            backgroundColor: '#245D6B',
            color: '#fff',
          }}
        >
          <Typography variant="h6" component="span">
            {`Select Ingredients for ${editRecipe
              ? editVangiName
              : selectedVangi
                ? selectedVangi.vangiName
                : ''
              }`}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0 }}>
            {editRecipe && (
              <TextField
                label="Items Per KG"
                type="text"
                value={editItemsPerKg}
                onChange={e => {
                  const normalizedValue = e.target.value.replace(/[૦૧૨૩૪૫૬૭૮૯]/g, char =>
                    '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(char)]
                  );
                  setEditItemsPerKg(normalizedValue);
                }}
                variant="outlined"
                size="small"
                sx={{
                  width: 250,
                  color: '#fff',
                  '& .MuiOutlinedInput-root': {
                    height: 40,
                    borderRadius: 1,
                    borderWidth: 1,
                    '& fieldset': {
                      borderColor: '#fff',
                    },
                    '&:hover fieldset': {
                      borderColor: '#fff',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#fff',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#fff',
                  },
                  '& .Mui-focused .MuiInputLabel-root': {
                    color: '#fff !important',
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff',
                  },
                  background: 'transparent',
                }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9૦-૯]*' }}
                InputProps={{
                  endAdornment: <span style={{ marginLeft: 4, color: '#fff', fontWeight: 600 }}>Kg</span>,
                }}
              />
            )}
            <TextField
              label="Search Ingredients"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              sx={{
                width: 300,
                color: '#fff',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#ccc',
                  },
                  '&:hover fieldset': {
                    borderColor: '#fff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#fff',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#fff',
                },
                '& .Mui-focused .MuiInputLabel-root': {
                  color: '#fff !important',
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                },
              }}
            />
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              // flexDirection: 'row',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              mt: 2,
              gap: 2,
              // alignItems: 'flex-start',
              width: '100%',
              minWidth: 800,
              minHeight: 300,
              maxHeight: 6 * 52,
              overflowY: 'scroll',
              '&::-webkit-scrollbar': {
                width: '8px',
                visibility: 'visible',
                cursor: 'pointer',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(36, 93, 107, 0.5)',
                borderRadius: '4px',
                cursor: 'pointer',

              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            {(() => {
              // const columns = 3; 
              // const itemsPerColumn = Math.ceil(filteredIngredients.length / columns);
              // const ingredientChunks = Array.from({ length: columns }, (_, i) =>
              //   filteredIngredients.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn)
              // );

              // return ingredientChunks.map((chunk, columnIndex) => (

              const categorizedIngredients: { [category: string]: typeof ingredientList } = {};
              filteredIngredients.forEach((ing) => {
                const category = ing.category || 'Uncategorized';
                if (!categorizedIngredients[category]) categorizedIngredients[category] = [];
                categorizedIngredients[category].push(ing);
              });

              return Object.entries(categorizedIngredients).map(([category, ingredients]) => (
                <Box
                  // key={columnIndex}
                  key={category}
                  sx={{
                    // flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    // borderRight: columnIndex < ingredientChunks.length - 1 ? '1px solid #ccc' : 'none',
                    borderRight: '1px solid #ccc',
                    pr: 2,
                  }}
                >
                  {/* {chunk.map((ing) => ( */}
                  <Typography variant="h6" sx={{ color: '#245D6B', mb: 1 }}>
                    {category}
                  </Typography>
                  {ingredients.map((ing) => (
                    <React.Fragment key={ing.id}>
                      <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedIngredients[ing.id]}
                          onChange={() => handleIngredientCheck(ing.id.toString())}
                          style={{
                            accentColor: '#245D6B',
                          }}
                        />
                        <ListItemText primary={ing.ingredientName} sx={{ ml: 2, flex: 1 }} />
                        <TextField
                          label="KG"
                          type="text"
                          size="small"
                          value={ingredientKgs[ing.id.toString()] || ''}
                          onChange={(e) => {
                            const normalizedValue = e.target.value
                              .replace(/[૦૧૨૩૪૫૬૭૮૯]/g, (char) =>
                                '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(char)]
                              );
                            handleKgChange(ing.id.toString(), normalizedValue);
                          }}
                          disabled={!selectedIngredients[ing.id]}
                          sx={{ width: 100, ml: 2 }}
                          inputProps={{ min: 0, step: 0.01 }}
                          autoFocus={focusIngredientId === ing.id.toString()}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </Box>
              ));
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ mb: 1, ml: 2, mr: 2, mt: 0 }}>
          <Button onClick={handleIngredientDialogClose} sx={{ color: '#245D6B' }}>Cancel</Button>
          <Button
            onClick={editRecipe ? handleEditSave : handleIngredientDialogSubmit}
            variant="contained"
            sx={{ background: '#245D6B' }}
          >
            {editRecipe ? 'Update Ingredients' : 'Save Ingredients'}

          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="standard"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RecipeEntry;