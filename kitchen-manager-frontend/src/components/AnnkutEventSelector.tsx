import React from 'react';
import { TextField, MenuItem} from '@mui/material';
import { useAnnkutEvent } from '../contexts/AnnkutEventContext';

const AnnkutEventSelector: React.FC = () => {
  const { annkutEvents, selectedAnnkutEvent, setSelectedAnnkutEvent, loading } = useAnnkutEvent();

  return (
    <TextField
      select
      label="Annkut Event"
      value={selectedAnnkutEvent}
      onChange={e => setSelectedAnnkutEvent(e.target.value)}
      size="small"
      disabled={loading}
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
      {annkutEvents.map(event => (
        <MenuItem key={event.id} value={event.id}>
          {event.eventName} - {event.eventYear}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default AnnkutEventSelector;
