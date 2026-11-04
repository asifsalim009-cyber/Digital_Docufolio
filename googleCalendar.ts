export const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export const initGoogleCalendar = (
  clientId: string,
  onSuccess: (token: string) => void,
  onError: (error: any) => void
) => {
  const google = (window as any).google;
  if (!google || !google.accounts || !google.accounts.oauth2) {
    onError(new Error("Google Identity Services script not loaded."));
    return;
  }

  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: CALENDAR_SCOPES,
    callback: (response: any) => {
      if (response.error !== undefined) {
        onError(response);
      } else {
        onSuccess(response.access_token);
      }
    },
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
};

export const getCalendarToken = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google || !google.accounts || !google.accounts.oauth2) {
      reject(new Error("Google Identity Services script not loaded."));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPES,
      callback: (response: any) => {
        if (response.error !== undefined) {
          reject(response);
        } else {
          resolve(response.access_token);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
};

export const createCalendarEvent = async (
  token: string, 
  eventDetails: {
    title: string;
    description: string;
    date: string; // YYYY-MM-DD
    time?: string; // HH:mm
    reminders: { days?: number, minutes?: number }[];
  }
) => {
  const timeStr = eventDetails.time || '09:00';
  const startDateTime = `${eventDetails.date}T${timeStr}:00`;
  const [cHours, cMinutes] = timeStr.split(':').map(Number);
  const cEndHours = String((cHours + 1) % 24).padStart(2, '0');
  const cEndMins = String(cMinutes).padStart(2, '0');
  const endDateTime = `${eventDetails.date}T${cEndHours}:${cEndMins}:00`;

  const overrides = eventDetails.reminders.map(r => {
    const min = (r.days !== undefined ? r.days * 24 * 60 : 0) + (r.minutes || 0);
    return {
      method: 'email',
      minutes: min
    };
  }).concat(eventDetails.reminders.map(r => {
    const min = (r.days !== undefined ? r.days * 24 * 60 : 0) + (r.minutes || 0);
    return {
      method: 'popup',
      minutes: min
    };
  }));

  const event = {
    summary: eventDetails.title,
    description: eventDetails.description,
    start: {
      dateTime: startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    end: {
      dateTime: endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    reminders: {
      useDefault: false,
      overrides
    }
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create event: ${err}`);
  }
  return response.json();
};

export const updateCalendarEvent = async (
  token: string,
  eventId: string,
  eventDetails: {
    title: string;
    description: string;
    date: string;
    time?: string;
    reminders: { days?: number, minutes?: number }[];
  }
) => {
  const timeStr = eventDetails.time || '09:00';
  const startDateTime = `${eventDetails.date}T${timeStr}:00`;
  const [uHours, uMinutes] = timeStr.split(':').map(Number);
  const uEndHours = String((uHours + 1) % 24).padStart(2, '0');
  const uEndMins = String(uMinutes).padStart(2, '0');
  const endDateTime = `${eventDetails.date}T${uEndHours}:${uEndMins}:00`;

  const overrides = eventDetails.reminders.map(r => {
    const min = (r.days !== undefined ? r.days * 24 * 60 : 0) + (r.minutes || 0);
    return {
      method: 'email',
      minutes: min
    };
  }).concat(eventDetails.reminders.map(r => {
    const min = (r.days !== undefined ? r.days * 24 * 60 : 0) + (r.minutes || 0);
    return {
      method: 'popup',
      minutes: min
    };
  }));

  const event = {
    summary: eventDetails.title,
    description: eventDetails.description,
    start: {
      dateTime: startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    end: {
      dateTime: endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    reminders: {
      useDefault: false,
      overrides
    }
  };

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to update event: ${err}`);
  }
  return response.json();
};

export const deleteCalendarEvent = async (token: string, eventId: string) => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to delete event: ${err}`);
  }
  
  return true;
};
