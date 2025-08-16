import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CompareIcon from '@mui/icons-material/Compare';
import { useApiBaseUrl } from '../config/config';

interface AnnkutEvent {
  id: number;
  eventName: string;
  eventYear: number;
}

const pageOptions = [
  { value: 'weight-entry', label: 'Weight Entry Master' },
  { value: 'box-weight-entry', label: 'Box Master' },
  { value: 'box-range-entry', label: 'Box Range Master' },
  { value: 'weight-calculation', label: 'Weight Calculation' },
  { value: 'annkut-nos-summary', label: 'Annkut Nos Summary' },
  { value: 'annkut-sidhu-saman', label: 'Annkut Sidhu Saman' },
];

const AnnkutComparison: React.FC = () => {
  const [events, setEvents] = useState<AnnkutEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState<{[key: string]: any[]}>({});
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const API_BASE_URL = useApiBaseUrl();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const annkutEvents = data.filter((event: AnnkutEvent) => 
          event.eventName.toLowerCase().includes('annkut')
        );
        setEvents(annkutEvents);
      } else {
        console.error('Failed to fetch events:', response.status);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPageData = async (eventId: number, page: string) => {
    const token = localStorage.getItem('token');
    let endpoint = '';
    
    switch (page) {
      case 'weight-entry':
        endpoint = `/weight-entries?eventId=${eventId}`;
        break;
      case 'box-weight-entry':
        endpoint = `/box-weight-entries?eventId=${eventId}`;
        break;
      case 'box-range-entry':
        endpoint = `/box-ranges?eventId=${eventId}`;
        break;
      case 'weight-calculation':
        endpoint = `/weight-calculation-entries/latest?eventId=${eventId}`;
        break;
      case 'annkut-nos-summary':
        // Fetch raw data from annkut_sidhu_saman table
        return await fetchAnnkutNosSummaryData(eventId);
      case 'annkut-sidhu-saman':
        // Fetch calculated ingredient data
        return await fetchAnnkutSidhuSamanData(eventId);
      default:
        return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Data for ${page}:`, data);
        
        // Handle weight-calculation
        if (page === 'weight-calculation') {
          if (data && data.entries && Array.isArray(data.entries)) {
            return data.entries.map((entry: any) => ({
              mithaiName: entry.mithaiName,
              totalNang: entry.totalNang,
              totalGram: entry.totalGram,
              boxEntries: entry.boxEntries?.map((box: any) => 
                `${box.boxRange}: ${box.pieces} pieces`
              ).join(', ') || ''
            }));
          }
          return [];
        }
        
        // For other endpoints, return the data as is if it's an array
        return Array.isArray(data) ? data : (data ? [data] : []);
      }
      return [];
    } catch (error) {
      console.error('Error fetching data:', error);
      return [];
    }
  };

  const fetchAnnkutNosSummaryData = async (eventId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/annkut-sidhu-saman?eventId=${eventId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      
      if (!Array.isArray(data)) return [];

      // Return the raw mithai data from annkut_sidhu_saman table
      return data.map((entry: any) => ({
        mithaiName: entry.mithai_name,
        totalNang: entry.total_nang,
        totalFlour: entry.total_flour,
      }));

    } catch (error) {
      console.error('Error fetching Annkut Nos Summary data:', error);
      return [];
    }
  };

  const fetchAnnkutSidhuSamanData = async (eventId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch recipes and saved annkut data from database
      const [recipesResponse, annkutResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/recipe`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE_URL}/annkut-sidhu-saman?eventId=${eventId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      ]);

      if (!recipesResponse.ok || !annkutResponse.ok) return [];

      const recipes = await recipesResponse.json();
      const annkutData = await annkutResponse.json();

      if (!Array.isArray(recipes) || !Array.isArray(annkutData)) return [];

      // Get all unique ingredients from recipes
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

      // Create columns from saved annkut data
      const columns = annkutData
        .reduce((unique, entry) => {
          const existingIndex = unique.findIndex((item: { mithai_name: string }) => item.mithai_name === entry.mithai_name);
          
          if (existingIndex === -1) {
            unique.push(entry);
          } else {
            if (entry.total_flour > unique[existingIndex].total_flour) {
              unique[existingIndex] = entry;
            }
          }
          
          return unique;
        }, [] as any[])
        .map((entry: { id: number; mithai_name: string; total_flour: number }) => {
          let recipe = recipes.find((r) => r.vangiName === entry.mithai_name);
          
          if (!recipe) {
            const baseName = entry.mithai_name.split('(')[0].trim();
            recipe = recipes.find((r) => r.vangiName.trim() === baseName);
          }

          return {
            id: entry.id,
            name: entry.mithai_name,
            ingredients: recipe?.ingredients || [],
            totalFlour: entry.total_flour || null,
          };
        });

      // Calculate ingredient weights using saved flour data
      const getIngredientWeight = (recipe: any, ingName: string) => {
        const found = recipe.ingredients.find(
          (ing: any) => ing.ingredientName === ingName
        );

        if (!recipe.totalFlour) return 0;

        if (found && recipe.totalFlour > 0) {
          const weight = found.kg * recipe.totalFlour;
          return weight > 0 ? Number(weight.toFixed(2)) : 0;
        }

        return 0;
      };

      const getTotalWeightByIngredient = (ingredientName: string) => {
        return columns.reduce((total: number, col: { id: number; name: string; ingredients: any[]; totalFlour: number | null }) => {
          return total + getIngredientWeight(col, ingredientName);
        }, 0);
      };

      // Return ingredient data with total weights
      return ingredientWithId.map((ingredient) => ({
        ingredientName: ingredient.name,
        totalWeight: getTotalWeightByIngredient(ingredient.name),
        // Add individual mithai weights for detailed view
        ...columns.reduce((acc: Record<string, number>, col: { id: number; name: string; ingredients: any[]; totalFlour: number | null }) => {
          acc[col.name] = getIngredientWeight(col, ingredient.name);
          return acc;
        }, {} as Record<string, number>)
      })).filter(item => item.totalWeight > 0); // Only show ingredients with weight

    } catch (error) {
      console.error('Error fetching Annkut Sidhu Saman data:', error);
      return [];
    }
  };

  const handleCompare = async () => {
    if (selectedEvents.length >= 2 && selectedPage) {
      setShowComparison(true);
      
      const dataPromises = selectedEvents.map(async (eventId) => {
        const data = await fetchPageData(eventId, selectedPage);
        return { eventId, data };
      });
      
      const results = await Promise.all(dataPromises);
      const newComparisonData: {[key: string]: any[]} = {};
      
      results.forEach(({ eventId, data }) => {
        newComparisonData[eventId] = data;
      });
      
      setComparisonData(newComparisonData);
    }
  };

  // Add useEffect to auto-compare when selections change
  useEffect(() => {
    if (selectedEvents.length >= 2 && selectedPage) {
      handleCompare();
    } else {
      setShowComparison(false);
      setComparisonData({});
    }
  }, [selectedEvents, selectedPage]);

  const renderDataTable = (data: any[]) => {
    // Determine headers and formatting functions based on selected page
    let orderedHeaders: string[] = [];
    let formatHeaderName: (header: string) => string;

    if (selectedPage === 'annkut-nos-summary') {
      orderedHeaders = ['mithaiName', 'totalNang', 'totalFlour', 'mithaiId'];
      formatHeaderName = (header: string) => {
        switch (header) {
          case 'mithaiName': return 'Mithai Name';
          case 'totalNang': return 'Total Nang';
          case 'totalFlour': return 'Total Flour';
          case 'mithaiId': return 'Mithai ID';
          default: return header;
        }
      };
    } else if (selectedPage === 'annkut-sidhu-saman') {
      // For Annkut Sidhu Saman, we need to get headers from data if available
      if (data && data.length > 0) {
        const firstRow = data[0];
        const ingredientNameKey = 'ingredientName';
        const totalWeightKey = 'totalWeight';
        const mithaiColumns = Object.keys(firstRow).filter(key => 
          key !== ingredientNameKey && key !== totalWeightKey
        );
        orderedHeaders = [ingredientNameKey, ...mithaiColumns, totalWeightKey];
      } else {
        // Default headers when no data
        orderedHeaders = ['ingredientName', 'totalWeight'];
      }
      formatHeaderName = (header: string) => {
        if (header === 'ingredientName') return 'Ingredient Name';
        if (header === 'totalWeight') return 'Total Weight';
        return header;
      };
    } else {
      // For other pages, get headers from data or use defaults
      if (data && data.length > 0) {
        orderedHeaders = Object.keys(data[0]).filter(key => 
          !['id', 'userId', 'createdAt', 'updatedAt', 'user'].includes(key)
        );
      } else {
        // Default headers based on page type
        switch (selectedPage) {
          case 'weight-entry':
            orderedHeaders = ['vangiName', 'gram', 'eventId', 'event'];
            break;
          case 'box-weight-entry':
            orderedHeaders = ['priceRange', 'boxType', 'totalBoxes', 'eventId', 'event'];
            break;
          case 'box-range-entry':
            orderedHeaders = ['priceRange', 'boxType', 'gramPerBox', 'eventId', 'event'];
            break;
          case 'weight-calculation':
            orderedHeaders = ['mithaiName', 'totalNang', 'totalGram', 'boxEntries'];
            break;
          default:
            orderedHeaders = [];
        }
      }
      formatHeaderName = (header: string) => {
        return header
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace(/Id$/, 'ID');
      };
    }

    const formatCellValue = (value: any) => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      if (typeof value === 'object' && value.eventName && value.eventYear) {
        return `${value.eventName} ${value.eventYear}`;
      }
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    };

    return (
      <TableContainer sx={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {orderedHeaders.map(header => (
                <TableCell
                  key={header}
                  sx={{
                    fontWeight: 600,
                    color: '#245D6B',
                    backgroundColor: '#f8f9fa',
                    fontSize: '0.85rem'
                  }}
                >
                  {formatHeaderName(header)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(!data || data.length === 0) ? (
              <TableRow>
                <TableCell 
                  colSpan={orderedHeaders.length} 
                  sx={{ 
                    textAlign: 'center', 
                    color: '#999', 
                    fontStyle: 'italic',
                    py: 4
                  }}
                >
                  No data found for this event
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                    '&:hover': { backgroundColor: '#e3f2fd' }
                  }}
                >
                  {orderedHeaders.map(header => (
                    <TableCell
                      key={header}
                      sx={{ fontSize: '0.8rem', color: '#333' }}
                    >
                      {formatCellValue(row[header])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const getEventName = (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    return event ? `${event.eventName} - ${event.eventYear}` : '';
  };

  const renderPrintTable = (data: any[]) => {
    let orderedHeaders: string[] = [];
    let formatHeaderName: (header: string) => string;

    // Set headers based on selected page
    if (selectedPage === 'annkut-nos-summary') {
      orderedHeaders = ['mithaiName', 'totalNang', 'totalFlour', 'mithaiId'];
      formatHeaderName = (header: string) => {
        switch (header) {
          case 'mithaiName': return 'Mithai Name';
          case 'totalNang': return 'Total Nang';
          case 'totalFlour': return 'Total Flour';
          case 'mithaiId': return 'Mithai ID';
          default: return header;
        }
      };
    } else if (selectedPage === 'annkut-sidhu-saman') {
      if (data && data.length > 0) {
        const firstRow = data[0];
        const ingredientNameKey = 'ingredientName';
        const totalWeightKey = 'totalWeight';
        const mithaiColumns = Object.keys(firstRow).filter(key => 
          key !== ingredientNameKey && key !== totalWeightKey
        );
        orderedHeaders = [ingredientNameKey, ...mithaiColumns, totalWeightKey];
      } else {
        orderedHeaders = ['ingredientName', 'totalWeight'];
      }
      formatHeaderName = (header: string) => {
        if (header === 'ingredientName') return 'Ingredient Name';
        if (header === 'totalWeight') return 'Total Weight';
        return header;
      };
    } else {
      if (data && data.length > 0) {
        orderedHeaders = Object.keys(data[0]).filter(key => 
          !['id', 'userId', 'createdAt', 'updatedAt', 'user'].includes(key)
        );
      } else {
        switch (selectedPage) {
          case 'weight-entry':
            orderedHeaders = ['vangiName', 'gram', 'eventId', 'event'];
            break;
          case 'box-weight-entry':
            orderedHeaders = ['priceRange', 'boxType', 'totalBoxes', 'eventId', 'event'];
            break;
          case 'box-range-entry':
            orderedHeaders = ['priceRange', 'boxType', 'gramPerBox', 'eventId', 'event'];
            break;
          case 'weight-calculation':
            orderedHeaders = ['mithaiName', 'totalNang', 'totalGram', 'boxEntries'];
            break;
          default:
            orderedHeaders = [];
        }
      }
      formatHeaderName = (header: string) => {
        return header
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace(/Id$/, 'ID');
      };
    }

    const formatCellValue = (value: any) => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') return value.toLocaleString();
      if (typeof value === 'object' && value.eventName && value.eventYear) {
        return `${value.eventName} ${value.eventYear}`;
      }
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    };

    return (
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: '10px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            {orderedHeaders.map(header => (
              <th
                key={header}
                style={{
                  padding: '4px 6px',
                  border: '1px solid #ddd',
                  fontWeight: 600,
                  color: '#245D6B',
                  textAlign: 'left'
                }}
              >
                {formatHeaderName(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(!data || data.length === 0) ? (
            <tr>
              <td
                colSpan={orderedHeaders.length}
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#999',
                  fontStyle: 'italic',
                  border: '1px solid #ddd'
                }}
              >
                No data found for this event
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa'
                }}
              >
                {orderedHeaders.map(header => (
                  <td
                    key={header}
                    style={{
                      padding: '4px 6px',
                      border: '1px solid #ddd',
                      color: '#333'
                    }}
                  >
                    {formatCellValue(row[header])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '80vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CompareIcon sx={{ color: '#245D6B', mr: 2, fontSize: 28 }} />
        <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
          Annkut Comparison
        </Typography>
      </Box>

      {/* Selection Form */}
      <Paper
        elevation={4}
        sx={{
          p: { xs: 2, sm: 4 },
          mb: 3,
          borderRadius: 2,
          boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
        }}
      >
        <Typography variant="h6" sx={{ 
          color: '#245D6B', 
          mb: 3,
          fontWeight: 600
        }}>
          Select Events and Page to Compare
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            select
            label="Select Annkut Events"
            value={selectedEvents}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedEvents(
                typeof value === 'string'
                  ? value.split(',').map(Number)
                  : (value as (string | number)[]).map(Number)
              );
            }}
            variant="outlined"
            size="medium"
            sx={{ flex: 2, minWidth: 300 }}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const selectedArray = selected as number[];
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedArray.map(id => {
                      const event = events.find(e => e.id === id);
                      return (
                        <Chip
                          key={id}
                          label={event ? `${event.eventName} ${event.eventYear}` : ''}
                          size="small"
                          onDelete={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedEvents(prev => prev.filter(eventId => eventId !== id));
                          }}
                          onMouseDown={(e) => {
                            if ((e.target as Element).closest('.MuiChip-deleteIcon')) {
                              e.stopPropagation();
                            }
                          }}
                          sx={{ 
                            backgroundColor: '#245D6B',
                            color: '#fff',
                            '& .MuiChip-deleteIcon': {
                              color: '#fff',
                              '&:hover': {
                                color: '#ffcccb'
                              }
                            }
                          }}
                        />
                      );
                    })}
                  </Box>
                );
              }
            }}
          >
            {events.map(event => (
              <MenuItem key={event.id} value={event.id}>
                <Typography>{event.eventName} {event.eventYear}</Typography>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Page to Compare"
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            variant="outlined"
            size="medium"
            sx={{ flex: 1, minWidth: 200 }}
          >
            {pageOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      {/* Results Section */}
      {(selectedEvents.length >= 2 && selectedPage) ? (
        showComparison && (
          <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ 
                color: '#245D6B', 
                fontWeight: 600
              }}>
                Comparison Results
              </Typography>
              <Button
                variant="contained"
                sx={{
                  bgcolor: '#245D6B',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1e4d57' }
                }}
                onClick={() => setPrintDialogOpen(true)}
              >
                Print
              </Button>
            </Box>
            
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: `repeat(${selectedEvents.length}, 1fr)`,
              gap: 2,
              width: '100%'
            }}>
              {selectedEvents.map((eventId) => (
                <Paper 
                  key={eventId}
                  elevation={2} 
                  sx={{ 
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                    width: '100%'
                  }}
                >
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: '#245D6B',
                    color: '#fff',
                    textAlign: 'center'
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {getEventName(eventId)}
                    </Typography>
                    <Chip 
                      label={`${(comparisonData[eventId] || []).length} records`}
                      size="small"
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        mt: 1
                      }}
                    />
                  </Box>
                  
                  {renderDataTable(comparisonData[eventId] || [])}
                </Paper>
              ))}
            </Box>
          </Paper>
        )
      ) : (
        <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Typography variant="h6" sx={{ color: "#245D6B", fontStyle: "italic" }}>
              {selectedEvents.length < 2 && selectedPage 
                ? 'Please select at least two events to compare'
                : !selectedPage && selectedEvents.length >= 2
                ? 'Please select a page to compare'
                : 'Please select at least two events and a page to compare'
              }
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Print Dialog */}
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
          <Box id="annkut-comparison-print">
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
                Annkut Comparison Report
              </h1>
              <div style={{ color: "#555", fontSize: 16, marginTop: 4 }}>
                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by Kitchen Manager
                &nbsp;|&nbsp; Page: {pageOptions.find(p => p.value === selectedPage)?.label}
              </div>
            </div>

            {/* Print Content */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: `repeat(${selectedEvents.length}, 1fr)`,
              gap: '16px',
              width: '100%'
            }}>
              {selectedEvents.map((eventId) => (
                <div 
                  key={eventId}
                  style={{ 
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#245D6B',
                    color: '#fff',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ margin: 0, fontWeight: 600 }}>
                      {getEventName(eventId)}
                    </h3>
                    <div style={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      marginTop: '8px',
                      display: 'inline-block'
                    }}>
                      {(comparisonData[eventId] || []).length} records
                    </div>
                  </div>
                  
                  {renderPrintTable(comparisonData[eventId] || [])}
                </div>
              ))}
            </div>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)} sx={{ color: '#245D6B', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnnkutComparison;
