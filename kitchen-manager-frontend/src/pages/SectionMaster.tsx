import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Menu,
    MenuItem,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    Pagination,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GridOnIcon from '@mui/icons-material/GridOn';
import DownloadIcon from '@mui/icons-material/Download';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const ROWS_PER_PAGE = 5;

interface Section {
    id: number;
    sectionName: string;
    description?: string;
    eventId: number;
    rows: number;
    columns: number;
    event?: {
        eventName: string;
        eventYear: number;
    };
    createdAt: string;
}

const SectionMaster: React.FC = () => {
    const [sectionName, setSectionName] = useState('');
    const [description, setDescription] = useState('');
    const [rows, setRows] = useState('');
    const [columns, setColumns] = useState('');
    const [sections, setSections] = useState<Section[]>([]);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
    const [editSection, setEditSection] = useState<Section | null>(null);
    const [deleteSectionId, setDeleteSectionId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
    const [search, setSearch] = useState('');

    const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();
    const API_BASE_URL = useApiBaseUrl();

    const fetchSections = async () => {
        if (!selectedAnnkutEvent) {
            setSections([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/sections?eventId=${selectedAnnkutEvent}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSections(Array.isArray(data) ? data : []);
            } else {
                setSections([]);
            }
        } catch (error) {
            setSections([]);
        }
    };

    useEffect(() => {
        fetchSections();
    }, [selectedAnnkutEvent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedAnnkutEvent) {
            setSnackbarMessage('Please select an Annkut event first');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        if (!sectionName.trim()) {
            setSnackbarMessage('Section name is required');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        if (!rows || !columns || Number(rows) < 1 || Number(columns) < 1) {
            setSnackbarMessage('Rows and columns must be at least 1');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/sections`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sectionName: sectionName.trim(),
                    description: description.trim() || undefined,
                    eventId: Number(selectedAnnkutEvent),
                    rows: Number(rows),
                    columns: Number(columns)
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add section');
            }

            setSectionName('');
            setDescription('');
            setRows('');
            setColumns('');
            setSnackbarMessage('Section added successfully!');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
            fetchSections();
        } catch (error) {
            setSnackbarMessage('Failed to add section');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        }
    };

    const handleEditOpen = (section: Section) => {
        setEditSection(section);
        setEditDialogOpen(true);
    };

    const handleEditSave = async () => {
        if (!editSection || !editSection.sectionName.trim()) {
            setSnackbarMessage('Section name is required');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        if (!editSection.rows || !editSection.columns || editSection.rows < 1 || editSection.columns < 1) {
            setSnackbarMessage('Rows and columns must be at least 1');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/sections/${editSection.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sectionName: editSection.sectionName.trim(),
                    description: editSection.description?.trim() || undefined,
                    eventId: editSection.eventId,
                    rows: editSection.rows,
                    columns: editSection.columns
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update section');
            }

            setEditDialogOpen(false);
            setEditSection(null);
            setSnackbarMessage('Section updated successfully!');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
            fetchSections();
        } catch (error) {
            setSnackbarMessage('Failed to update section');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        }
    };

    const handleDeleteOpen = (id: number) => {
        setDeleteSectionId(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteSectionId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/sections/${deleteSectionId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete section');
            }

            setDeleteDialogOpen(false);
            setDeleteSectionId(null);
            setSnackbarMessage('Section deleted successfully!');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
            fetchSections();
        } catch (error) {
            setSnackbarMessage('Failed to delete section');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        }
    };

    // Filter sections based on search
    const filteredSections = sections.filter(section =>
        section.sectionName.toLowerCase().includes(search.toLowerCase()) ||
        (section.description && section.description.toLowerCase().includes(search.toLowerCase()))
    );

    const pageCount = Math.ceil(filteredSections.length / ROWS_PER_PAGE);
    const paginatedSections = filteredSections.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    return (
        <Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountTreeIcon sx={{ color: '#245D6B', fontSize: 32, mr: 1 }} />
                <Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
                    Section Master
                </Typography>
                {selectedEventDetails && (
                    <Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>
                        - {selectedEventDetails.eventName} {selectedEventDetails.eventYear}
                    </Typography>
                )}
            </Box>

            {/* Form */}
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
                }}
            >
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <TextField
                        label="Section Name"
                        value={sectionName}
                        onChange={e => setSectionName(e.target.value)}
                        required
                        sx={{ flex: 1, minWidth: 200 }}
                        InputProps={{
                            startAdornment: (
                                <AccountTreeIcon sx={{ color: '#245D6B', mr: 1 }} />
                            ),
                        }}
                    />

                    <TextField
                        label="Rows"
                        value={rows}
                        onChange={e => {
                            const value = e.target.value.replace(/[૦૧૨૩૪૫૬૭૮૯]/g, char =>
                                '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(char)]
                            );
                            if (/^\d*$/.test(value)) {
                                setRows(value);
                            }
                        }}
                        required
                        type="text"
                        inputMode="numeric"
                        sx={{ flex: 1, minWidth: 200 }}
                        InputProps={{
                            startAdornment: (
                                <GridOnIcon sx={{ color: '#245D6B', mr: 1 }} />
                            ),
                        }}
                    />

                    <TextField
                        label="Columns"
                        value={columns}
                        onChange={e => {
                            const value = e.target.value.replace(/[૦૧૨૩૪૫૬૭૮૯]/g, char =>
                                '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(char)]
                            );
                            if (/^\d*$/.test(value)) {
                                setColumns(value);
                            }
                        }}
                        required
                        type="text"
                        inputMode="numeric"
                        sx={{ flex: 1, minWidth: 200 }}
                        InputProps={{
                            startAdornment: (
                                <GridOnIcon sx={{ color: '#245D6B', mr: 1 }} />
                            ),
                        }}
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        sx={{ flex: 1, minWidth: 200 }}
                        InputProps={{
                            startAdornment: (
                                <DescriptionIcon sx={{ color: '#245D6B', mr: 1 }} />
                            ),
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
                            minWidth: '120px',
                            transition: 'background 0.3s, color 0.3s',
                            '&:hover': {
                                bgcolor: '#4A7D91',
                                color: '#fff',
                            },
                        }}
                        size="large"
                    >
                        Add Section
                    </Button>
                </Box>
            </Paper>

            {/* Search Field */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: -2, gap: 2 }}>
                <TextField
                    label="Search by Section Name or Description"
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
                {selectedAnnkutEvent && filteredSections.length > 0 && (
                    <>
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
                        startIcon={<DownloadIcon />}
                        onClick={(e) => setExportAnchorEl(e.currentTarget)}
                    >
                        Export
                    </Button>
                    <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={() => setExportAnchorEl(null)}>
                        <MenuItem onClick={async () => { setExportAnchorEl(null);
                            try {
                                const XLSX = await import('xlsx');
                                const data = filteredSections.map(sec => ({
                                    ID: sec.id,
                                    'Section Name': sec.sectionName,
                                    Rows: sec.rows,
                                    Columns: sec.columns,
                                    Event: sec.event ? `${sec.event.eventName} - ${sec.event.eventYear}` : '',
                                    Description: sec.description || '',
                                }));
                                const ws = XLSX.utils.json_to_sheet(data);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, 'Sections');
                                XLSX.writeFile(wb, `Sections_${selectedEventDetails?.eventName || 'Export'}.xlsx`);
                            } catch (err) {
                                setSnackbarMessage('Failed to export');
                                setSnackbarSeverity('error');
                                setOpenSnackbar(true);
                            }
                        }}>Export Excel</MenuItem>
                        <MenuItem onClick={async () => { setExportAnchorEl(null);
                            try {
                                const html2canvas = (await import('html2canvas')).default;
                                const jsPDF = (await import('jspdf')).default;
                                const elem = document.querySelector('#sections-print');
                                const tempDiv = document.createElement('div');
                                tempDiv.style.position = 'absolute'; tempDiv.style.left = '-9999px';
                                tempDiv.innerHTML = elem ? elem.innerHTML : '<div>No data</div>';
                                document.body.appendChild(tempDiv);
                                const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: '#fff' });
                                document.body.removeChild(tempDiv);
                                const imgData = canvas.toDataURL('image/png');
                                const pdf = new jsPDF('p', 'mm', 'a4');
                                const pdfWidth = pdf.internal.pageSize.getWidth();
                                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                                pdf.save(`Sections_${selectedEventDetails?.eventName || 'Export'}.pdf`);
                            } catch (err) {
                                setSnackbarMessage('Failed to export');
                                setSnackbarSeverity('error');
                                setOpenSnackbar(true);
                            }
                        }}>Export PDF</MenuItem>
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

            {/* Table */}
            <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Section Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Rows</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Columns</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Event</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Description</TableCell>
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
                        ) : paginatedSections.length > 0 ? (
                            paginatedSections.map((section, idx) => (
                                <TableRow key={section.id}>
                                    <TableCell>{(currentPage - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
                                    <TableCell>{section.sectionName}</TableCell>
                                    <TableCell>{section.rows}</TableCell>
                                    <TableCell>{section.columns}</TableCell>
                                    <TableCell>
                                        {section.event ? `${section.event.eventName} - ${section.event.eventYear}` : 'N/A'}
                                    </TableCell>
                                    <TableCell>{section.description || '-'}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            onClick={() => handleEditOpen(section)}
                                            sx={{ color: '#245D6B', mr: 1 }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDeleteOpen(section.id)}
                                            sx={{ color: '#d32f2f' }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
                                    No sections found for this event
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            {selectedAnnkutEvent && pageCount > 1 && (
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
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Section</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Section Name"
                        value={editSection?.sectionName || ''}
                        onChange={e => setEditSection(prev => prev ? { ...prev, sectionName: e.target.value } : null)}
                        fullWidth
                        margin="normal"
                        required
                    />
                    <TextField
                        label="Description"
                        value={editSection?.description || ''}
                        onChange={e => setEditSection(prev => prev ? { ...prev, description: e.target.value } : null)}
                        fullWidth
                        margin="normal"
                    />
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <TextField
                            label="Rows"
                            value={editSection?.rows || ''}
                            onChange={e => {
                                const value = e.target.value.replace(/[૦૧૨૩૪૫૬૭૮૯]/g, char =>
                                    '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(char)]
                                );
                                if (/^\d*$/.test(value)) {
                                    setEditSection(prev => prev ? { ...prev, rows: value === '' ? 0 : Number(value) } : null);
                                }
                            }}
                            type="text"
                            inputMode="numeric"
                            required
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            label="Columns"
                            value={editSection?.columns || ''}
                            onChange={e => {
                                const value = e.target.value.replace(/[૦૧૨૩૪૫૬૭૮૯]/g, char =>
                                    '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(char)]
                                );
                                if (/^\d*$/.test(value)) {
                                    setEditSection(prev => prev ? { ...prev, columns: value === '' ? 0 : Number(value) } : null);
                                }
                            }}
                            type="text"
                            inputMode="numeric"
                            required
                            sx={{ flex: 1 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleEditSave} variant="contained" sx={{ bgcolor: '#245D6B' }}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this section?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

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
                    <Box id="sections-print">
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
                                Section Master Report
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

                        {filteredSections.length > 0 ? (
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    marginTop: 16,
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: 8,
                                                backgroundColor: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                            }}
                                        >
                                            ID
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: 8,
                                                backgroundColor: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Section Name
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: 8,
                                                backgroundColor: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Rows
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: 8,
                                                backgroundColor: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Columns
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: 8,
                                                backgroundColor: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Event
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: 8,
                                                backgroundColor: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Description
                                        </th>
                                        <th
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: 8,
                                                backgroundColor: "#245D6B",
                                                color: "#fff",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Created Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSections
                                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                        .map((section, idx) => (
                                            <tr key={section.id}>
                                                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{idx + 1}</td>
                                                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{section.sectionName}</td>
                                                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{section.rows}</td>
                                                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{section.columns}</td>
                                                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>
                                                    {section.event ? `${section.event.eventName} - ${section.event.eventYear}` : 'N/A'}
                                                </td>
                                                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{section.description || '-'}</td>
                                                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>
                                                    {new Date(section.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        ) : (
                            <div
                                style={{
                                    textAlign: "center",
                                    color: "#999",
                                    fontStyle: "italic",
                                    padding: "40px",
                                    fontSize: "16px",
                                }}
                            >
                                No sections data available for printing.
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

            {/* Snackbar */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setOpenSnackbar(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SectionMaster;
