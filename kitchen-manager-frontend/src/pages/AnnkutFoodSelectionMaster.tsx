import React, { useEffect, useState } from 'react';
import {
	Box,
	Typography,
	Paper,
	TextField,
	Button,
	Snackbar,
	Alert,
	InputAdornment,
	Checkbox,
	MenuItem,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Pagination,
} from '@mui/material';
// Removed Grid in favor of CSS Grid via Box
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApiBaseUrl } from '../config/config';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const MAGAJ_SUBTYPES = ['લાડુડી', 'લાડવા', 'ચોસલા'];
const ROWS_PER_PAGE = 5;

const AnnkutFoodSelectionMaster: React.FC = () => {
	const API_BASE_URL = useApiBaseUrl();
	const { selectedAnnkutEvent, selectedEventDetails } = useAnnkutEvent();

	const [foodItems, setFoodItems] = useState<{ id: number; vangiName: string }[]>([]);
	const [selectedItems, setSelectedItems] = useState<{
		[id: number]: { vangiName: string; subType?: string };
	}>({});
	const [currentUser, setCurrentUser] = useState<any>(null);
	const [openSnackbar, setOpenSnackbar] = useState(false);
	const [success, setSuccess] = useState('');
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [savedItemSearch, setSavedItemSearch] = useState('');
	const [page, setPage] = useState(1);

	const [entries, setEntries] = useState<
		Array<{
			id: number;
			vangiName: string;
			// no gram now
			createdAt: string;
			eventId?: number;
			event?: { id: number; eventName: string; eventYear: string; description?: string };
		}>
	>([]);

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editEntry, setEditEntry] = useState<any>(null);

	useEffect(() => {
		const fetchCurrentUser = async () => {
			try {
				const res = await fetch(`${API_BASE_URL}/user/me`, {
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${localStorage.getItem('token')}`,
					},
				});
				if (res.ok) setCurrentUser(await res.json());
			} catch { }
		};
		fetchCurrentUser();
	}, [API_BASE_URL]);

	useEffect(() => {
		const fetchFoodItems = async () => {
			const res = await fetch(`${API_BASE_URL}/food-item`);
			const data = await res.json();
			setFoodItems(data);
		};
		fetchFoodItems();
	}, [API_BASE_URL]);

	const fetchEntries = async () => {
		try {
			const token = localStorage.getItem('token');
			if (!token) return;
			let url = selectedAnnkutEvent
				? `${API_BASE_URL}/annkut-food-selections?eventId=${selectedAnnkutEvent}`
				: `${API_BASE_URL}/annkut-food-selections`;
			const selectedCenter = localStorage.getItem('selectedAnnkutCenter') || '';
			if (selectedCenter) {
				url += (url.includes('?') ? '&' : '?') + `center=${encodeURIComponent(selectedCenter)}`;
			}
			console.debug('[AnnkutFoodSelectionMaster] fetchEntries URL:', url);
			const res = await fetch(url, {
				method: 'GET',
				credentials: 'include',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (!res.ok) {
				if (res.status === 401) {
					localStorage.clear();
					window.location.href = '/login';
				}
				setEntries([]);
				return;
			}
			const data = await res.json();
			console.debug('[AnnkutFoodSelectionMaster] fetchEntries returned count:', Array.isArray(data) ? data.length : 0);
			setEntries(Array.isArray(data) ? data : []);
		} catch {
			setEntries([]);
		}
	};

	useEffect(() => {
		fetchEntries();
	}, []);

	useEffect(() => {
		if (selectedAnnkutEvent) fetchEntries();
	}, [selectedAnnkutEvent]);

	const handleCheck = (item: { id: number; vangiName: string }) => {
		const selectedCenter = localStorage.getItem('selectedAnnkutCenter') || '';
		if (selectedCenter) {
			setError('Editing is disabled when a center is selected.');
			setSuccess('');
			setOpenSnackbar(true);
			return;
		}
		setSelectedItems((prev) => {
			if (prev[item.id]) {
				const copy = { ...prev };
				delete copy[item.id];
				return copy;
			}
			return {
				...prev,
				[item.id]: {
					vangiName: item.vangiName,
					// no gram now
					subType: item.vangiName.trim().startsWith('મગજ') ? MAGAJ_SUBTYPES[0] : undefined,
				},
			};
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const selectedCenter = localStorage.getItem('selectedAnnkutCenter') || '';
		if (selectedCenter) {
			setError('Saving is disabled when a center is selected.');
			setSuccess('');
			setOpenSnackbar(true);
			return;
		}
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
		if (Object.keys(selectedItems).length === 0) {
			setError('Please select at least one food item.');
			setSuccess('');
			setOpenSnackbar(true);
			return;
		}
		// no gram validation required

		try {
			for (const [idStr, item] of Object.entries(selectedItems)) {
				const id = Number(idStr);
				let vangiName = item.vangiName;
				if (item.vangiName.startsWith('મગજ') && item.subType) {
					vangiName = `મગજ (${item.subType})`;
				}
				await fetch(`${API_BASE_URL}/annkut-food-selections`, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${localStorage.getItem('token')}`,
					},
					body: JSON.stringify({
						foodItemId: id,
						vangiName,
						eventId: selectedAnnkutEvent,
					}),
				});
			}
			setSuccess('Selections saved!');
			setError('');
			setOpenSnackbar(true);
			setSelectedItems({});
			fetchEntries();
		} catch (err) {
			setError('Failed to save selections.');
			setSuccess('');
			setOpenSnackbar(true);
		}
	};

	const handleDelete = async (id: number) => {
		const selectedCenter = localStorage.getItem('selectedAnnkutCenter') || '';
		if (selectedCenter) {
			setError('Delete is disabled when a center is selected.');
			setSuccess('');
			setOpenSnackbar(true);
			return;
		}
		try {
			await fetch(`${API_BASE_URL}/annkut-food-selections/${id}`, {
				method: 'DELETE',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.getItem('token')}`,
				},
			});
			fetchEntries();
			setSuccess('Entry deleted!');
			setError('');
			setOpenSnackbar(true);
		} catch {
			setError('Failed to delete entry.');
			setSuccess('');
			setOpenSnackbar(true);
		}
	};

	const handleEditOpen = (entry: any) => {
		setEditEntry({ ...entry });
		setEditDialogOpen(true);
	};

	const handleEditChange = (field: string, value: any) => {
		setEditEntry((prev: any) => ({ ...prev, [field]: value }));
	};

	const handleEditSave = async () => {
		const selectedCenter = localStorage.getItem('selectedAnnkutCenter') || '';
		if (selectedCenter) {
			setError('Update is disabled when a center is selected.');
			setSuccess('');
			setOpenSnackbar(true);
			return;
		}
		try {
			await fetch(`${API_BASE_URL}/annkut-food-selections/${editEntry.id}`, {
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.getItem('token')}`,
				},
				body: JSON.stringify({
					vangiName: editEntry.vangiName,
				}),
			});
			setEditDialogOpen(false);
			setEditEntry(null);
			fetchEntries();
			setSuccess('Entry updated!');
			setError('');
			setOpenSnackbar(true);
		} catch {
			setError('Failed to update entry.');
			setSuccess('');
			setOpenSnackbar(true);
		}
	};

	const filteredEntries = entries
		.slice()
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
		.filter((item) => item.vangiName.toLowerCase().includes(savedItemSearch.toLowerCase()))
		.filter((item) => (selectedAnnkutEvent ? item.eventId?.toString() === selectedAnnkutEvent.toString() : true));

	return (
		<Box sx={{ p: { xs: 2, sm: 1 }, minHeight: '80vh' }}>
			<Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
				<Typography variant="h5" sx={{ color: '#245D6B', fontWeight: 700 }}>
					Annkut Food Selection Master
				</Typography>
				{selectedEventDetails && (
					<Typography variant="body1" sx={{ ml: 2, color: '#666', fontStyle: 'italic' }}>
						- {selectedEventDetails.eventName} {selectedEventDetails.eventYear}
					</Typography>
				)}
			</Box>

			<Paper
				elevation={4}
				sx={{
					p: { xs: 2, sm: 4 },
					mt: 3,
					width: '100%',
					mx: 'auto',
					borderRadius: 2,
					boxShadow: '0 4px 24px rgba(36,93,107,0.08)',
					opacity: selectedAnnkutEvent ? 1 : 0.5,
					pointerEvents: selectedAnnkutEvent ? 'auto' : 'none',
					position: 'relative',
				}}
			>
				<Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
					<Box sx={{ mb: 0 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', mt: -2, justifyContent: 'space-between' }}>
							<Typography sx={{ fontWeight: 600, color: '#245D6B', mt: 0, mb: 2 }} variant="h6">
								Select Food Item(s)
							</Typography>
							<TextField
								placeholder="Search Food Item"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								size="small"
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchIcon sx={{ color: '#245D6B' }} />
										</InputAdornment>
									),
								}}
								sx={{ mb: 2, background: '#f5fafd', borderRadius: 2 }}
							/>
						</Box>
						<Box sx={{ maxHeight: 300, overflowY: 'auto', background: '#f9f9f9', p: 2.5, borderRadius: 2, border: '1px solid #e0e0e0' }}>
							<Box
								sx={{
									display: 'grid',
									gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
									gap: 2,
								}}
							>
								{foodItems
									.filter((item) => item.vangiName.toLowerCase().includes(search.toLowerCase()))
									.filter((item) => {
										if (!selectedAnnkutEvent) return true;
										const alreadySaved = entries.some(
											(e) => e.vangiName === item.vangiName && e.eventId?.toString() === selectedAnnkutEvent.toString(),
										);
										if (item.vangiName.trim().startsWith('મગજ')) {
											// Check if ALL three Magaj subtypes are saved
											const allMagajSaved = MAGAJ_SUBTYPES.every((sub) =>
												entries.some(
													(e) => e.vangiName === `મગજ (${sub})` && e.eventId?.toString() === selectedAnnkutEvent.toString(),
												),
											);
											// Show મગજ in available list until all three subtypes are saved
											return !allMagajSaved;
										}
										return !alreadySaved;
									})
									.map((item) => (
										<Box
											key={item.id}
											sx={{
												p: 2,
												borderRadius: 2,
												background: selectedItems[item.id] ? 'rgba(36,93,107,0.08)' : '#fff',
												boxShadow: selectedItems[item.id] ? '0 2px 8px rgba(36,93,107,0.10)' : 'none',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'space-between',
												gap: 2,
												height: 70,
												width: '100%',
												transition: 'background 0.2s, box-shadow 0.2s',
												border: '1px solid #e0e0e0',
												'&:hover': { background: 'rgba(36,93,107,0.12)', boxShadow: '0 4px 16px rgba(36,93,107,0.12)' },
											}}
										>
											<Checkbox
												checked={!!selectedItems[item.id]}
												onChange={() => handleCheck(item)}
												sx={{ color: '#245D6B', '&.Mui-checked': { color: '#4A7D91' } }}
												disabled={!!localStorage.getItem('selectedAnnkutCenter')}
											/>
											<Typography sx={{ flex: 1, color: '#245D6B', fontWeight: 400, fontSize: 16 }}>
												{item.vangiName}
											</Typography>
											{item.vangiName.trim().startsWith('મગજ') && selectedItems[item.id] && (
												<TextField
													select
													label="Type"
													value={selectedItems[item.id].subType || MAGAJ_SUBTYPES[0]}
													onChange={(e) =>
														setSelectedItems((prev) => ({
															...prev,
															[item.id]: { ...prev[item.id], subType: e.target.value },
														}))
													}
													size="small"
													sx={{ width: 120, background: '#fff', borderRadius: 1 }}
												>
													{MAGAJ_SUBTYPES.map((sub) => (
														<MenuItem key={sub} value={sub} style={{ fontWeight: 600, color: '#245D6B', background: '#fff' }}>
															{sub}
														</MenuItem>
													))}
												</TextField>
											)}
										</Box>
									))}
							</Box>
						</Box>
					</Box>
					<Button type="submit" variant="contained" sx={{ bgcolor: '#245D6B', fontWeight: 600, height: '56px' }} size="large" disabled={!!localStorage.getItem('selectedAnnkutCenter')}>
						Save
					</Button>
				</Box>
			</Paper>

			{entries.length > 0 && (
				<Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 4, mb: -2, gap: 2 }}>
					<TextField
						label="Search by Food Name"
						variant="outlined"
						size="small"
						value={savedItemSearch}
						onChange={(e) => setSavedItemSearch(e.target.value)}
						sx={{ width: 300, background: '#fff', borderRadius: 1 }}
					/>
					{/* Optional: add print later */}
				</Box>
			)}

			<TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(36,93,107,0.06)' }}>
				<Table sx={{ tableLayout: 'fixed', width: '100%' }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ fontWeight: 700, color: '#245D6B', width: 70 }}>Id</TableCell>
							<TableCell sx={{ fontWeight: 700, color: '#245D6B' }}>Food Name</TableCell>
							<TableCell sx={{ fontWeight: 700, color: '#245D6B', width: { xs: '30%', md: '28%' } }}>Event</TableCell>
							<TableCell sx={{ fontWeight: 700, color: '#245D6B', width: { xs: '30%', md: '28%' } }}>Date</TableCell>
							<TableCell sx={{ fontWeight: 700, color: '#245D6B', width: 130 }}>Actions</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{!selectedAnnkutEvent ? (
							<TableRow>
								<TableCell colSpan={5} align="center" sx={{ color: '#245D6B', fontStyle: 'italic', py: 4, fontSize: 16 }}>
									Please select an Annkut event first
								</TableCell>
							</TableRow>
						) : filteredEntries.length > 0 ? (
							filteredEntries
								.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)
								.map((item, idx) => (
									<TableRow key={item.id}>
										<TableCell>{(page - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
										<TableCell>{item.vangiName}</TableCell>
										{/* no gram */}
										<TableCell>
											{item.event?.eventName || 'N/A'} - {item.event?.eventYear || 'N/A'}
										</TableCell>
										<TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
										<TableCell>
											<IconButton size="small" sx={{ color: '#245D6B' }} onClick={() => handleEditOpen(item)} aria-label="edit" disabled={!!localStorage.getItem('selectedAnnkutCenter')}>
												<EditIcon fontSize="small" />
											</IconButton>
											<IconButton size="small" color="error" onClick={() => handleDelete(item.id)} aria-label="delete" disabled={!!localStorage.getItem('selectedAnnkutCenter')}>
												<DeleteIcon fontSize="small" />
											</IconButton>
										</TableCell>
									</TableRow>
								))
						) : (
							<TableRow>
								<TableCell colSpan={5} align="center" sx={{ color: '#999', fontStyle: 'italic', py: 4 }}>
									No data available
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{filteredEntries.length > ROWS_PER_PAGE && (
				<Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
					<Pagination
						count={Math.ceil(filteredEntries.length / ROWS_PER_PAGE)}
						page={page}
						onChange={(_, value) => setPage(value)}
					/>
				</Box>
			)}

			<Snackbar open={openSnackbar} autoHideDuration={3000} onClose={() => setOpenSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
				<Alert onClose={() => setOpenSnackbar(false)} severity={success ? 'success' : 'error'} sx={{ width: '100%' }}>
					{success || error}
				</Alert>
			</Snackbar>

			<Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
				<DialogTitle>Edit Entry</DialogTitle>
				<DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
					<TextField label="Food Name" value={editEntry?.vangiName || ''} onChange={(e) => handleEditChange('vangiName', e.target.value)} fullWidth />
					{/* Weight edit removed */}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
					<Button onClick={handleEditSave} variant="contained" color="primary">
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default AnnkutFoodSelectionMaster;

