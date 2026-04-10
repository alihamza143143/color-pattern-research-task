// js/data.js

const sessionData = {
  participantId: '',
  delayMs: 0,
  sessionStart: null,
  trials: [],
};

export function initSession(participantId, delayMs) {
  sessionData.participantId = participantId;
  sessionData.delayMs = delayMs;
  sessionData.sessionStart = new Date().toISOString();
  sessionData.trials = [];
}

export function recordTrial(trialData) {
  sessionData.trials.push({
    trialNumber: trialData.trialNumber,
    trialType: trialData.trialType,
    colorCount: trialData.colorCount,
    keyOpenings: trialData.keyOpenings,
    firstKeyOpenDuration: trialData.firstKeyOpenDuration,
    totalCompletionTime: trialData.totalCompletionTime,
    attempts: trialData.attempts,
    correctAfterFirstKeyOpen: trialData.correctAfterFirstKeyOpen,
  });
}

export function getSessionData() {
  return { ...sessionData };
}

/**
 * Export all trial data as CSV and trigger download.
 */
export function downloadCSV() {
  const headers = [
    'participant_id',
    'delay_ms',
    'session_start',
    'trial_number',
    'trial_type',
    'total_colors_in_pattern',
    'key_openings',
    'first_key_open_duration_ms',
    'correct_after_first_key_open',
    'total_completion_time_ms',
    'attempts',
  ];

  const rows = sessionData.trials.map(t => [
    sessionData.participantId,
    sessionData.delayMs,
    sessionData.sessionStart,
    t.trialNumber,
    t.trialType,
    t.colorCount,
    t.keyOpenings,
    t.firstKeyOpenDuration,
    t.correctAfterFirstKeyOpen,
    t.totalCompletionTime,
    t.attempts,
  ]);

  const escapeCSV = (val) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const csv = [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `color-task_${sessionData.participantId}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * POST session data as JSON to server endpoint.
 */
export async function postToServer(serverUrl) {
  if (!serverUrl) return false;

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to POST data:', err);
    return false;
  }
}

/**
 * Send postMessage to parent window (Qualtrics iframe integration).
 */
export function notifyParent() {
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: 'color-pattern-task-complete',
        participantId: sessionData.participantId,
        trialCount: sessionData.trials.length,
        data: sessionData,
      },
      '*'
    );
  }
}
