// ═══════════════════════════════════════════════════════
// MSG91 OTP Service
// Uses the MSG91 SendOTP widget with exposeMethods: true
// ═══════════════════════════════════════════════════════

const WIDGET_ID = '366241694955373230363637';
const TOKEN_AUTH = '496915TcnVi8aWAIb69a168aaP1';

const SCRIPT_URLS = [
  'https://verify.msg91.com/otp-provider.js',
  'https://verify.phone91.com/otp-provider.js',
];

let scriptLoaded = false;
let scriptLoading = false;
let widgetReady = false;
let widgetReadyResolvers: (() => void)[] = [];

function waitForWidget(): Promise<void> {
  if (widgetReady) return Promise.resolve();
  return new Promise((res) => { widgetReadyResolvers.push(res); });
}

function markWidgetReady() {
  widgetReady = true;
  widgetReadyResolvers.forEach((r) => r());
  widgetReadyResolvers = [];
}

// ─── Load the MSG91 script ───
function loadScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) return waitForWidget();

  scriptLoading = true;

  return new Promise((resolve, reject) => {
    let index = 0;

    function attempt() {
      const script = document.createElement('script');
      script.src = SCRIPT_URLS[index];
      script.async = true;

      script.onload = () => {
        console.log('[OTP] Script loaded from:', SCRIPT_URLS[index]);
        scriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        index++;
        if (index < SCRIPT_URLS.length) {
          attempt();
        } else {
          reject(new Error('Failed to load MSG91 OTP script'));
        }
      };

      document.head.appendChild(script);
    }

    attempt();
  });
}

// ─── Initialize the widget (call once) ───
export async function initOTP(): Promise<void> {
  await loadScript();

  if (widgetReady) return;

  return new Promise<void>((resolve, reject) => {
    // Wait a tick for initSendOTP to be available
    const checkInterval = setInterval(() => {
      const initSendOTP = (window as any).initSendOTP;
      if (typeof initSendOTP === 'function') {
        clearInterval(checkInterval);

        const configuration = {
          widgetId: WIDGET_ID,
          tokenAuth: TOKEN_AUTH,
          exposeMethods: true,
          success: (data: any) => {
            console.log('[OTP] Widget success callback:', data);
          },
          failure: (error: any) => {
            console.log('[OTP] Widget failure callback:', error);
          },
        };

        console.log('[OTP] Calling initSendOTP with config...');
        initSendOTP(configuration);

        // Give widget time to initialize and expose methods
        setTimeout(() => {
          console.log('[OTP] Available window methods:', {
            sendOtp: typeof (window as any).sendOtp,
            verifyOtp: typeof (window as any).verifyOtp,
            retryOtp: typeof (window as any).retryOtp,
          });
          markWidgetReady();
          resolve();
        }, 1000);
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!widgetReady) {
        reject(new Error('MSG91 widget failed to initialize (timeout)'));
      }
    }, 10000);
  });
}

// ─── Send OTP to a phone number ───
// identifier should be in E.164 format, e.g. "+918897143689" or just "918897143689"
export async function sendOTP(identifier: string): Promise<boolean> {
  await initOTP();

  // MSG91 widget expects the number without '+' prefix in some cases
  const cleanIdentifier = identifier.startsWith('+') ? identifier : `+${identifier}`;

  return new Promise((resolve, reject) => {
    const fn = (window as any).sendOtp;
    if (typeof fn === 'function') {
      console.log('[OTP] Calling sendOtp for:', cleanIdentifier);
      fn(
        cleanIdentifier,
        (data: any) => {
          console.log('[OTP] Send success:', data);
          resolve(true);
        },
        (error: any) => {
          console.error('[OTP] Send error:', error);
          reject(new Error(typeof error === 'string' ? error : error?.message || 'Failed to send OTP'));
        }
      );
    } else {
      console.error('[OTP] sendOtp not found on window. Available:', Object.keys(window).filter(k => k.toLowerCase().includes('otp')));
      reject(new Error('MSG91 OTP widget not ready. Please refresh and try again.'));
    }
  });
}

// ─── Verify OTP code ───
export async function verifyOTP(identifier: string, otp: string): Promise<boolean> {
  await initOTP();

  return new Promise((resolve, reject) => {
    const fn = (window as any).verifyOtp;
    if (typeof fn === 'function') {
      console.log('[OTP] Calling verifyOtp...');
      fn(
        otp,
        (data: any) => {
          console.log('[OTP] Verify success:', data);
          resolve(true);
        },
        (error: any) => {
          console.error('[OTP] Verify failed:', error);
          resolve(false);
        }
      );
    } else {
      reject(new Error('MSG91 verifyOtp not ready. Please refresh and try again.'));
    }
  });
}

// ─── Retry / Resend OTP ───
export async function retryOTP(identifier: string, retryType: 'text' | 'voice' = 'text'): Promise<boolean> {
  await initOTP();

  return new Promise((resolve, reject) => {
    const fn = (window as any).retryOtp;
    if (typeof fn === 'function') {
      console.log('[OTP] Calling retryOtp with type:', retryType);
      fn(
        retryType,
        (data: any) => {
          console.log('[OTP] Retry success:', data);
          resolve(true);
        },
        (error: any) => {
          console.error('[OTP] Retry failed:', error);
          reject(new Error(typeof error === 'string' ? error : error?.message || 'Failed to resend OTP'));
        }
      );
    } else {
      // Fallback: try sending again
      console.log('[OTP] retryOtp not found, falling back to sendOtp');
      sendOTP(identifier).then(resolve).catch(reject);
    }
  });
}

// ─── Namespace ───
export const OTPService = {
  init: initOTP,
  send: sendOTP,
  verify: verifyOTP,
  retry: retryOTP,
};
