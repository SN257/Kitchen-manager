import React from 'react';
import { TextField, MenuItem} from '@mui/material';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const AnnkutEventSelector: React.FC = () => {
  const { annkutEvents, selectedAnnkutEvent, setSelectedAnnkutEvent, loading } = useAnnkutEvent();

  const valid = annkutEvents.some(e => e.id === selectedAnnkutEvent);
  return (
    <TextField
      select
      label="Annkut Event"
      value={valid ? selectedAnnkutEvent : ''}
      onChange={e => setSelectedAnnkutEvent(e.target.value)}
      size="small"
      disabled={loading}
      InputLabelProps={{ shrink: true }}
      SelectProps={{
        displayEmpty: true,
        renderValue: (val: any) => {
          if (!val) return <span style={{ color: '#777' }}>Select Annkut Event</span>;
          const ev = annkutEvents.find(e => e.id === val);
          return ev ? `${ev.eventName} - ${ev.eventYear}` : '';
        }
      }}
      sx={{
        minWidth: 180,
        '& .MuiOutlinedInput-root': {
          background: '#fff',
          color: '#245D6B',
          height: 36,
          '& fieldset': {
            borderColor: '#245D6B',
          },
          '&:hover fieldset': {
            borderColor: '#245D6B',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#245D6B',
          },
        },
        '& .MuiInputLabel-root': { 
          color: '#245D6B',
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: '#245D6B',
          },
        },
        '& .MuiSelect-icon': {
          color: '#245D6B',
        },
      }}
    >
  {/* Hidden empty option (placeholder handled by renderValue) or message when none */}
  {annkutEvents.length > 0 && <MenuItem value="" sx={{ display:'none' }} />}
  {annkutEvents.length === 0 && <MenuItem value="" disabled>No events found</MenuItem>}
      {annkutEvents.map(event => (
        <MenuItem key={event.id} value={event.id}>
          {event.eventName} - {event.eventYear}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default AnnkutEventSelector;
