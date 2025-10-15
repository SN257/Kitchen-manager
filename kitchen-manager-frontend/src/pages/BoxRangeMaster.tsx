import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    InputAdornment,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Pagination,
    Snackbar,
    Alert,
    Menu,
    MenuItem,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { useApiBaseUrl } from '../config/config';
import Autocomplete from '@mui/material/Autocomplete';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const ROWS_PER_PAGE = 5;

const BoxRangeEntry: React.FC = () => {
    const [priceRange, setPriceRange] = useState('');
    const [boxType, setBoxType] = useState<string[]>([]);
    const [gramPerBox, setGramPerBox] = useState('');
    const [search, setSearch] = useState('');
    const [boxTypeOptions, setBoxTypeOptions] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [boxRanges, setBoxRanges] = useState<{ 
        id: number; 
        priceRange: string; 
        boxType: string[]; 
        gramPerBox: number;
        eventId?: number;
        event?: {
            id: number;
            eventName: string;
            eventYear: string;
            description?: string;
        };
        createdAt: string;
    }[]>([]);
    const [editingBox, setEditingBox] = useState<{ 
        id: number; 
        priceRange: string; 
        boxType: string[]; 
        gramPerBox: number;
        eventId?: number;
    } | null>(null);
    const [deleteBoxId, setDeleteBoxId] = useState<number | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
    
    // Use context instead of local state
    const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
    
    const API_BASE_URL = useApiBaseUrl();

    const handleExportClick = (e: React.MouseEvent<HTMLElement>) => setExportAnchorEl(e.currentTarget);
    const handleExportClose = () => setExportAnchorEl(null);

    const exportToExcel = async () => {
        handleExportClose();
        try {
            const XLSXmod = await import('xlsx');
            const XLSX = (XLSXmod && (XLSXmod as any).default) || XLSXmod;
            
            const wsData: any[][] = [];
            const header = ['ID', 'Price Range', 'Box Types', 'Gram per Box'];
            wsData.push(header);
            
            const dataRows = filteredBoxRanges.map((box, idx) => [
                idx + 1,
                box.priceRange,
                box.boxType.join(', '),
                box.gramPerBox
            ]);
            wsData.push(...dataRows);
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 40 }, { wch: 15 }];
            
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            for (let col = 0; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = {
                        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
                        fill: { fgColor: { rgb: '245D6B' } },
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                        border: {
                            top: { style: 'thin', color: { rgb: '000000' } },
                            bottom: { style: 'thin', color: { rgb: '000000' } },
                            left: { style: 'thin', color: { rgb: '000000' } },
                            right: { style: 'thin', color: { rgb: '000000' } }
                        }
                    };
                }
            }
            
            for (let row = 1; row <= range.e.r; row++) {
                for (let col = 0; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    if (ws[cellAddress]) {
                        ws[cellAddress].s = {
                            alignment: { horizontal: 'center', vertical: 'center', wrapText: col === 2 },
                            border: {
                                top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                                bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                                left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                                right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                            }
                        };
                    }
                }
            }
            
            ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };
            ws['!rows'] = [{ hpt: 30 }, ...dataRows.map(() => ({ hpt: 22 }))];
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Box Range Master');
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BoxRangeMaster_${new Date().toISOString().slice(0,10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Excel export failed', err);
            alert('Excel export failed (ensure xlsx is installed)');
        }
    };

    const exportToPdf = async () => {
        handleExportClose();
        try {
            const h2cMod = await import('html2canvas');
            const html2canvas = (h2cMod && (h2cMod as any).default) || h2cMod;
            const jspdfMod = await import('jspdf');
            const jsPDF = (jspdfMod && (jspdfMod as any).jsPDF) || jspdfMod;
            
            const printContent = `
                <div style="background: #fff; padding: 20px; width: 1100px;">
                    <div style="margin-bottom: 20px; border-bottom: 2px solid #245D6B; padding-bottom: 12px;">
                        <h1 style="font-weight: 700; color: #245D6B; letter-spacing: 1px; font-size: 26px; margin: 0 0 8px 0;">Box Range Master Report</h1>
                        <p style="color: #000; margin: 0; font-size: 14px;">
                            ${new Date().toLocaleDateString()} | Powered by Kitchen Manager
                            ${selectedEventDetails ? `| Event: ${selectedEventDetails.eventName} - ${selectedEventDetails.eventYear}` : ''}
                        </p>
                    </div>
                    <table style="border: 1px solid #245D6B; font-size: 13px; table-layout: fixed; width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="background: #245D6B; color: #fff; font-weight: 700; border: 1px solid #245D6B; padding: 8px; text-align: center; width: 8%;">ID</th>
                                <th style="background: #245D6B; color: #fff; font-weight: 700; border: 1px solid #245D6B; padding: 8px; text-align: center; width: 20%;">Price Range</th>
                                <th style="background: #245D6B; color: #fff; font-weight: 700; border: 1px solid #245D6B; padding: 8px; text-align: center; width: 52%;">Box Types</th>
                                <th style="background: #245D6B; color: #fff; font-weight: 700; border: 1px solid #245D6B; padding: 8px; text-align: center; width: 20%;">Gram per Box</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredBoxRanges.map((box, idx) => `
                                <tr>
                                    <td style="border: 1px solid #245D6B; padding: 8px; text-align: center;">${idx + 1}</td>
                                    <td style="border: 1px solid #245D6B; padding: 8px; text-align: center;">${box.priceRange}</td>
                                    <td style="border: 1px solid #245D6B; padding: 8px; text-align: center;">${box.boxType.join(', ')}</td>
                                    <td style="border: 1px solid #245D6B; padding: 8px; text-align: center;">${box.gramPerBox}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.background = '#fff';
            container.innerHTML = printContent;
            document.body.appendChild(container);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#fff' });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const imgProps = (pdf as any).getImageProperties(imgData);
            const imgWidth = pageWidth - 40;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
            pdf.save(`BoxRangeMaster_${new Date().toISOString().slice(0,10)}.pdf`);
            
            container.remove();
        } catch (err) {
            console.error('PDF export failed', err);
            alert('PDF export failed (ensure html2canvas and jspdf are installed)');
        }
    };

    // Fetch current user data
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/user/me`, {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (res.ok) {
                    const userData = await res.json();
                    setCurrentUser(userData);
                } else {
                }
            } catch (error) {
            }
        };
        fetchCurrentUser();
    }, [API_BASE_URL]);

    // Fetch data from the database
    const fetchBoxRanges = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }

            let url = `${API_BASE_URL}/box-ranges`;
            if (selectedAnnkutEvent) {
                url += `?eventId=${selectedAnnkutEvent}`;
            }
            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = '/login';
                    return;
                }
                setBoxRanges([]);
                return;
            }

            const data = await response.json();

            // Normalize boxType to always be an array
            const normalizedData = data.map((box: { boxType: string | string[] }) => ({
                ...box,
                boxType: Array.isArray(box.boxType) ? box.boxType : [box.boxType].filter(Boolean),
            }));

            setBoxRanges(selectedAnnkutEvent ? normalizedData : []);

            // Extract unique box types for the dropdown
            const uniqueBoxTypes: string[] = Array.from(
                new Set(normalizedData.flatMap((box: { boxType: string[] }) => box.boxType))
            );
            setBoxTypeOptions(uniqueBoxTypes);
        } catch (error) {
        }
    };

    // Refresh box ranges when event is selected
    useEffect(() => {
        if (selectedAnnkutEvent) {
            fetchBoxRanges();
        } else {
            setBoxRanges([]);
            setBoxTypeOptions([]);
        }
    }, [selectedAnnkutEvent, API_BASE_URL]);

    // Add a new box range
    const handleAdd = async () => {
        if (!currentUser) {
            setError('User not authenticated. Please login again.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }

        if (!selectedAnnkutEvent) {
            setError('Please select an Annkut event first.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }
        
        if (!priceRange || boxType.length === 0 || !gramPerBox) {
            setError('Please fill in all fields.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }

        // Check for duplicates
        const isDuplicate = boxRanges.some(box => 
            box.priceRange === priceRange && 
            box.eventId?.toString() === selectedAnnkutEvent.toString() &&
            JSON.stringify(box.boxType.sort()) === JSON.stringify(boxType.sort())
        );

        if (isDuplicate) {
            setError('This box range already exists for the selected event.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/box-ranges`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    priceRange,
                    boxType,
                    gramPerBox: Number(gramPerBox),
                    eventId: selectedAnnkutEvent
                    // Remove userId from body as backend gets it from session
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add box range');
            }

            const newBoxRange = await response.json();
            setBoxRanges(prev => [...prev, newBoxRange]);
            setPriceRange('');
            setBoxType([]);
            setGramPerBox('');
            setSuccess('Box range added successfully!');
            setError('');
            setOpenSnackbar(true);
            fetchBoxRanges(); // Refresh data
        } catch (error) {
            setError('Failed to add box range.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    // Open edit dialog
    const handleEditOpen = (box: { id: number; priceRange: string; boxType: string[]; gramPerBox: number }) => {
        setEditingBox(box);
        setEditDialogOpen(true);
    };

    // Save edited box range
    const handleEditSave = async () => {
        if (!editingBox || !currentUser) {
            setError('User not authenticated. Please login again.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/box-ranges/${editingBox.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    priceRange: editingBox.priceRange,
                    boxType: editingBox.boxType,
                    gramPerBox: editingBox.gramPerBox,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update box range');
            }

            setBoxRanges(prev =>
                prev.map(box =>
                    box.id === editingBox.id
                        ? { ...box, priceRange: editingBox.priceRange, boxType: editingBox.boxType, gramPerBox: editingBox.gramPerBox }
                        : box
                )
            );
            setEditDialogOpen(false);
            setEditingBox(null);
            setSuccess('Box range updated successfully!');
            setError('');
            setOpenSnackbar(true);
        } catch (error) {
            setError('Failed to update box range.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    // Open delete confirmation dialog
    const handleDeleteOpen = (id: number) => {
        setDeleteBoxId(id);
        setDeleteDialogOpen(true);
    };

    // Confirm delete
    const handleDeleteConfirm = async () => {
        if (!deleteBoxId || !currentUser) {
            setError('User not authenticated. Please login again.');
            setSuccess('');
            setOpenSnackbar(true);
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/box-ranges/${deleteBoxId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete box range');
            }

            setBoxRanges(prev => prev.filter(box => box.id !== deleteBoxId));
            setDeleteDialogOpen(false);
            setDeleteBoxId(null);
            setSuccess('Box range deleted successfully!');
            setError('');
            setOpenSnackbar(true);
        } catch (error) {
            setError('Failed to delete box range.');
            setSuccess('');
            setOpenSnackbar(true);
        }
    };

    const filteredBoxRanges = boxRanges
        .filter(box => {
            // Only show data if an event is selected
            if (!selectedAnnkutEvent) {
                return false; // Don't show any data when no event is selected
            }
            
            // Filter by search term
            const matchesSearch = box.priceRange.toLowerCase().includes(search.toLowerCase()) ||
                box.boxType.some(type => type.toLowerCase().includes(search.toLowerCase()));
            
            // Filter by selected event
            const matchesEvent = box.eventId?.toString() === selectedAnnkutEvent.toString();
            
            return matchesSearch && matchesEvent;
        })
        .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());

    const pageCount = Math.ceil(filteredBoxRanges.length / ROWS_PER_PAGE);
    const paginatedBoxRanges = filteredBoxRanges.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    return (
        <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
                    Box Range Master
                </Typography>
                {selectedEventDetails && (
                    <Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>
                        - {selectedEventDetails.eventName} {selectedEventDetails.eventYear}
                    </Typography>
                )}
            </Box>

            {/* Paper Container */}
            <Paper
                elevation={4}
                sx={{
                    p: { xs: 2, sm: 4 },
                    mt: 5,
                    width: '100%',
                    borderRadius: 2,
                    boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
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
                {/* Form Fields */}
                <Box
                    component="form"
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 2,
                        alignItems: 'flex-start',
                    }}
                >
                    <TextField
                        label="Price Range"
                        value={priceRange}
                        onChange={e => setPriceRange(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Inventory2Icon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: 1, minWidth: '300px', maxWidth: '300px' }}
                    />
                    <Autocomplete
                        multiple
                        options={boxTypeOptions}
                        value={boxType}
                        onChange={(_, newValue: string[]) => setBoxType(newValue)} // Update the boxType array
                        freeSolo
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Box Type"
                                placeholder="Type or select box types"
                                sx={{
                                    flex: 1,
                                    minWidth: '300px',
                                    maxWidth: '300px',
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                                onBlur={(e) => {
                                    const enteredText = e.target.value.trim();
                                    if (enteredText && !boxType.includes(enteredText)) {
                                        setBoxType((prev) => [...prev, enteredText]); // Add the entered text to the array
                                    }
                                    // Clear the input field to prevent duplicate display
                                    e.target.value = '';
                                    params.inputProps.value = ''; // Clear the Autocomplete input value
                                }}
                            />
                        )}
                    />
                    <TextField
                        label="Gram per Box"
                        value={gramPerBox}
                        onChange={e => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value)) { // Allow only numeric values (including decimals)
                                setGramPerBox(value);
                            }
                        }}
                        required
                        type="number"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Inventory2Icon sx={{ color: '#245D6B' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: 1, minWidth: '300px', maxWidth: '300px' }}
                    />
                    <Button
                        type="button"
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
                        onClick={handleAdd}
                    >
                        Add
                    </Button>
                </Box>
            </Paper>
            {/* Search Field */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: -2, gap: 2 }}>
                <TextField
                    label="Search by Price Range or Box Type"
                    variant="outlined"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{
                        width: 300,
                        background: '#fff',
                        borderRadius: 1,
                        '& .MuiOutlinedInput-root': {
                            background: '#fff',
                            color: '#245D6B',
                        },
                        '& .MuiInputLabel-root': { color: '#245D6B' },
                        '& .MuiInputBase-input': { color: '#245D6B' },
                    }}
                />
                {selectedAnnkutEvent && filteredBoxRanges.length > 0 && (
                    <>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportClick}
                            sx={{
                                color: '#245D6B',
                                borderColor: '#245D6B',
                                fontWeight: 600,
                                height: 40,
                                textTransform: 'none',
                                '&:hover': {
                                    bgcolor: '#f5fafd',
                                    borderColor: '#4A7D91',
                                },
                            }}
                        >
                            Export
                        </Button>
                        <Menu
                            anchorEl={exportAnchorEl}
                            open={Boolean(exportAnchorEl)}
                            onClose={handleExportClose}
                        >
                            <MenuItem onClick={exportToExcel}>Export Excel</MenuItem>
                            <MenuItem onClick={exportToPdf}>Export PDF</MenuItem>
                        </Menu>
                        <Button
                            variant="outlined"
                            sx={{
                                color: '#245D6B',
                                borderColor: '#245D6B',
                                fontWeight: 600,
                                height: 40,
                                '&:hover': {
                                    bgcolor: '#f5fafd',
                                    borderColor: '#4A7D91',
                                },
                            }}
                            onClick={() => setPrintDialogOpen(true)}
                        >
                            Print
                        </Button>
                    </>
                )}
            </Box>
            <TableContainer
                component={Paper}
                sx={{
                    mt: 4,
                    borderRadius: 2,
                    boxShadow: '0 2px 12px rgba(36,93,107,0.06)',
                }}
            >
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Price Range</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Box Type</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Gram per Box</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Event</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!selectedAnnkutEvent ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ color: '#245D6B', fontStyle: 'italic', py: 4, fontSize: 16 }}>
                                    Please select an Annkut event first
                                </TableCell>
                            </TableRow>
                        ) : paginatedBoxRanges.length > 0 ? (
                            paginatedBoxRanges.map((box, idx) => (
                                <TableRow key={box.id}>
                                    <TableCell sx={{ fontSize: 16 }}>
                                        {(currentPage - 1) * ROWS_PER_PAGE + idx + 1}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 16 }}>{box.priceRange}</TableCell>
                                    <TableCell sx={{ fontSize: 16 }}>
                                        {Array.isArray(box.boxType) ? box.boxType.join(', ') : 'N/A'}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 16 }}>
                                        {box.gramPerBox ? `${box.gramPerBox} g` : 'N/A'}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 16 }}>
                                        {box.event?.eventName || 'N/A'} - {box.event?.eventYear || 'N/A'}
                                    </TableCell>
                                    
                                    <TableCell sx={{ fontSize: 16 }}>
                                        <IconButton
                                            size="small"
                                            sx={{ color: '#245D6B' }}
                                            onClick={() => handleEditOpen(box)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteOpen(box.id)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
                                    No data found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {/* Pagination */}
            {selectedAnnkutEvent && selectedAnnkutEvent && pageCount > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                        count={pageCount}
                        page={currentPage}
                        onChange={(_, value) => setCurrentPage(value)}
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
            {/* Edit Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                aria-labelledby="edit-dialog-title"
                aria-describedby="edit-dialog-description"
                sx={{ marginLeft: 20 }}
            >
                <Box sx={{ p: 3, minWidth: 600 }}>
                    <DialogTitle id="edit-dialog-title" sx={{ p: 0, mb: 2 }}>
                        Edit Box Range
                    </DialogTitle>
                    <DialogContent id="edit-dialog-description" sx={{ p: 0 }}>
                        <TextField
                            label="Price Range"
                            value={editingBox?.priceRange || ''}
                            onChange={e => setEditingBox({ ...editingBox!, priceRange: e.target.value })}
                            fullWidth
                            margin="dense"
                        />
                        <Autocomplete
                            multiple
                            options={boxTypeOptions}
                            value={editingBox?.boxType || []}
                            onChange={(_, newValue) => setEditingBox({ ...editingBox!, boxType: newValue })}
                            freeSolo
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Box Type"
                                    placeholder="Type or select box types"
                                    sx={{
                                        flex: 1,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                        },
                                    }}
                                />
                            )}
                        />
                        <TextField
                            label="Gram per Box"
                            value={editingBox?.gramPerBox || ''}
                            onChange={e => setEditingBox({ ...editingBox!, gramPerBox: Number(e.target.value) })}
                            fullWidth
                            margin="dense"
                            sx={{ mt: 2 }}
                            type="number"
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 0, mt: 2 }}>
                        <Button onClick={() => setEditDialogOpen(false)} sx={{ color: '#245D6B' }}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSave} variant="contained" sx={{ background: '#245D6B' }}>
                            Save
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this box range?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} variant="contained" color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Snackbar */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setOpenSnackbar(false)}
                    severity={success ? 'success' : 'error'}
                    sx={{ width: '100%' }}
                >
                    {success || error}
                </Alert>
            </Snackbar>

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
                    <Box id="box-range-print">
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
                                Box Range Master Report
                            </h1>
                            <div style={{ color: "#555", fontSize: 16, marginTop: 4 }}>
                                {new Date().toLocaleDateString()} &nbsp;|&nbsp; Powered by Kitchen Manager
                                {selectedEventDetails && (
                                    <span>
                                        &nbsp;|&nbsp; Event: {selectedEventDetails.eventName} - {selectedEventDetails.eventYear}
                                    </span>
                                )}
                            </div>
                        </div>

                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "14px",
                                marginTop: "20px",
                            }}
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: "12px 8px",
                                            background: "#245D6B",
                                            color: "#fff",
                                            fontWeight: 700,
                                            textAlign: "left",
                                            fontSize: "14px",
                                        }}
                                    >
                                        Sr. No.
                                    </th>
                                    <th
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: "12px 8px",
                                            background: "#245D6B",
                                            color: "#fff",
                                            fontWeight: 700,
                                            textAlign: "left",
                                            fontSize: "14px",
                                        }}
                                    >
                                        Price Range
                                    </th>
                                    <th
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: "12px 8px",
                                            background: "#245D6B",
                                            color: "#fff",
                                            fontWeight: 700,
                                            textAlign: "left",
                                            fontSize: "14px",
                                        }}
                                    >
                                        Box Type
                                    </th>
                                    <th
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: "12px 8px",
                                            background: "#245D6B",
                                            color: "#fff",
                                            fontWeight: 700,
                                            textAlign: "left",
                                            fontSize: "14px",
                                        }}
                                    >
                                        Gram per Box
                                    </th>
                                    <th
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: "12px 8px",
                                            background: "#245D6B",
                                            color: "#fff",
                                            fontWeight: 700,
                                            textAlign: "left",
                                        }}
                                    >
                                        Event
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBoxRanges.map((box, index) => (
                                    <tr key={box.id}>
                                        <td
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "12px 8px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            {index + 1}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "12px 8px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            {box.priceRange}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "12px 8px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            {Array.isArray(box.boxType) ? box.boxType.join(', ') : 'N/A'}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "12px 8px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            {box.gramPerBox ? `${box.gramPerBox} g` : 'N/A'}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "12px 8px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            {box.event?.eventName || 'N/A'} - {box.event?.eventYear || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredBoxRanges.length === 0 && (
                            <div
                                style={{
                                    textAlign: "center",
                                    color: "#999",
                                    fontStyle: "italic",
                                    padding: "40px",
                                    fontSize: "16px",
                                }}
                            >
                                No box range data available for printing.
                            </div>
                        )}
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

export default BoxRangeEntry;
