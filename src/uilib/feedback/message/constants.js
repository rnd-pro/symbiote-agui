export let MESSAGE_TIMEOUT_MS = 5_000;
export let MESSAGE_TONES = Object.freeze({
  info: {
    messageRole: 'status',
    liveMode: 'polite',
    iconName: 'info',
  },
  success: {
    messageRole: 'status',
    liveMode: 'polite',
    iconName: 'check_circle',
  },
  warning: {
    messageRole: 'status',
    liveMode: 'polite',
    iconName: 'warning',
  },
  error: {
    messageRole: 'alert',
    liveMode: 'assertive',
    iconName: 'error',
  },
  alert: {
    messageRole: 'alert',
    liveMode: 'assertive',
    iconName: 'warning',
  },
});
