import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useApiBaseUrl } from '../config/config';

type Event = {
  id: string;
  name: string;
  eventName: string;
  eventYear: string;
};

interface AnnkutEventContextType {
  annkutEvents: Event[];
  selectedAnnkutEvent: string;
  setSelectedAnnkutEvent: (eventId: string) => void;
  loading: boolean;
  selectedEventDetails: Event | null;
}

const AnnkutEventContext = createContext<AnnkutEventContextType | undefined>(undefined);

export const useAnnkutEvent = () => {
  const context = useContext(AnnkutEventContext);
  if (!context) {
    throw new Error('useAnnkutEvent must be used within an AnnkutEventProvider');
  }
  return context;
};

interface AnnkutEventProviderProps {
  children: ReactNode;
}

export const AnnkutEventProvider: React.FC<AnnkutEventProviderProps> = ({ children }) => {
  const [annkutEvents, setAnnkutEvents] = useState<Event[]>([]);
  const [selectedAnnkutEvent, setSelectedAnnkutEvent] = useState(() => {
    // Initialize with saved value from localStorage
    return localStorage.getItem('selectedAnnkutEvent') || '';
  });
  const [loading, setLoading] = useState(true);
  
  const API_BASE_URL = useApiBaseUrl();

  const selectedEventDetails = annkutEvents.find(event => event.id === selectedAnnkutEvent) || null;

  // Save selected event to localStorage whenever it changes
  const handleSetSelectedAnnkutEvent = (eventId: string) => {
    setSelectedAnnkutEvent(eventId);
    if (eventId) {
      localStorage.setItem('selectedAnnkutEvent', eventId);
    } else {
      localStorage.removeItem('selectedAnnkutEvent');
    }
  };

  useEffect(() => {
    const fetchAnnkutEvents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/events`, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch Annkut events: ${res.status}`);
        }
        const data = await res.json();
        const filteredAnnkutEvents = data.filter((event: any) => 
          event.eventName.toLowerCase().includes('annkut')
        );
        setAnnkutEvents(filteredAnnkutEvents);
        
        // Validate saved event still exists after events are loaded
        const savedEventId = localStorage.getItem('selectedAnnkutEvent');
        if (savedEventId && !filteredAnnkutEvents.find((event: any) => event.id === savedEventId)) {
          localStorage.removeItem('selectedAnnkutEvent');
          setSelectedAnnkutEvent('');
        }
      } catch (err) {
        console.error('Failed to fetch Annkut events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnkutEvents();
  }, [API_BASE_URL]);

  return (
    <AnnkutEventContext.Provider value={{
      annkutEvents,
      selectedAnnkutEvent,
      setSelectedAnnkutEvent: handleSetSelectedAnnkutEvent,
      loading,
      selectedEventDetails
    }}>
      {children}
    </AnnkutEventContext.Provider>
  );
};
