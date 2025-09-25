import React, { useEffect, useState } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { useApiBaseUrl } from '../config/config';

const AnnkutCenterSelector: React.FC = () => {
  const API_BASE_URL = useApiBaseUrl();
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const role = user?.role;

  const [centers, setCenters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<string>(() => {
    return localStorage.getItem('selectedAnnkutCenter') || '';
  });

  const valid = centers.includes(selectedCenter);

  useEffect(() => {
    if (role !== 'sant') return;
    setLoading(true);
    const parseAllocated = (obj: any): string[] => {
      if (!obj) return [];
      // Check likely keys
      const possibleKeys = ['allocatedCenter', 'allocated_center', 'allocatedCenters', 'allocated_centers', 'allocated center', 'allocatedcenter', 'allocated'];
      for (const k of possibleKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          const v = obj[k];
          if (!v) return [];
          if (Array.isArray(v)) return v.map(String);
          if (typeof v === 'string') {
            // comma separated?
            if (v.includes(',')) return v.split(',').map(s => s.trim()).filter(Boolean);
            return [v.trim()];
          }
          // number -> string
          return [String(v)];
        }
      }
      return [];
    };

    // First try dedicated endpoint
    // Prefer value from localStorage user object (explicit 'allocated center' column)
    try {
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const localList = parseAllocated(storedUser);
      if (localList && localList.length) {
        setCenters(localList);
        const stored = localStorage.getItem('selectedAnnkutCenter');
        if (stored && !localList.includes(stored)) {
          localStorage.removeItem('selectedAnnkutCenter');
          setSelectedCenter('');
        }
        setLoading(false);
        return;
      }
    } catch (e) {
      // ignore and fallback to network
    }

    fetch(`${API_BASE_URL}/user/center`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) return null;
        try { return await res.json(); } catch { return null; }
      })
      .then(async (data) => {
        let list: string[] = [];
        if (data) {
          if (Array.isArray(data) && data.length > 0) list = data.map(String);
          else if (typeof data === 'object') list = parseAllocated(data);
          else if (typeof data === 'string') list = data.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        // If nothing from /user/center, fall back to /user/me
        if (!list.length) {
          try {
            const res2 = await fetch(`${API_BASE_URL}/user/me`, { credentials: 'include' });
            if (res2.ok) {
              const u = await res2.json();
              // try multiple fields including 'allocated center'
              list = parseAllocated(u);
              // Also consider 'center' fallback
              if (!list.length && u && u.center) {
                if (Array.isArray(u.center)) list = u.center.map(String);
                else if (typeof u.center === 'string' && u.center.trim()) list = [u.center.trim()];
              }
            }
          } catch {}
        }

        setCenters(list);
        const stored = localStorage.getItem('selectedAnnkutCenter');
        if (stored && !list.includes(stored)) {
          localStorage.removeItem('selectedAnnkutCenter');
          setSelectedCenter('');
        }
  // Do not auto-select; let user pick. If there's a stored center we preserved it earlier.
      })
      .catch(() => setCenters([]))
      .finally(() => setLoading(false));
  }, [API_BASE_URL, role]);

  const handleChange = (val: string) => {
    setSelectedCenter(val);
    if (val) localStorage.setItem('selectedAnnkutCenter', val);
    else localStorage.removeItem('selectedAnnkutCenter');
    // Emit a small event in case pages want to react
    try {
      window.dispatchEvent(new CustomEvent('annkutCenterChanged', { detail: { center: val } }));
    } catch {}
  };

  if (role !== 'sant') return null;

  return (
    <TextField
      select
      label="Allocated Centers"
      value={valid ? selectedCenter : ''}
      onChange={(e) => handleChange(e.target.value)}
  size="small"
  disabled={loading}
      InputLabelProps={{ shrink: true }}
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
      SelectProps={{
        displayEmpty: true,
        renderValue: (val: any) => {
          if (!val) return <span style={{ color: '#777' }}>Select Center</span>;
          return val;
        }
      }}
    >
      {centers.length > 0 && (
        <MenuItem value="">
          <em>Select Center</em>
        </MenuItem>
      )}
      {centers.length === 0 && !loading && <MenuItem value="" disabled>No allocated centers</MenuItem>}
      {centers.map((c) => (
        <MenuItem key={c} value={c}>
          {c}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default AnnkutCenterSelector;
