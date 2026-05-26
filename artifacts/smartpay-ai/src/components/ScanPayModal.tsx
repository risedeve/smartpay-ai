import { useState, useEffect, useRef, useCallback } from 'react';
import { Store, CameraOff, Keyboard, SwitchCamera, AlertCircle, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import jsQR from 'jsqr';
import {
  addTransaction, getSettings, checkBudgetAlert,
  BudgetAlertInfo, buildPaymentLink, buildFallbackUpiLink,
} from '@/lib/storage';
import BottomSheet from './BottomSheet';
import BudgetAlertModal from './BudgetAlertModal';
import PayAppSetupModal from './PayAppSetupModal';

interface ScanPayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UpiDetails {
  pa: string;
  pn: string;
  am: string;
}

const APP_COLORS: Record<string, string> = {
  gpay: '#4285F4', phonepe: '#5f259f', paytm: '#00B9F1', upi: '#FF6B00',
};

function parseUpiQr(raw: string): UpiDetails | null {
  try {
    let upiString = raw.trim();

    // Some QR codes embed upi:// inside an https redirect URL
    const embedded = upiString.match(/[?&](upi:\/\/[^&\s]+)/);
    if (embedded) upiString = decodeURIComponent(embedded[1]);

    if (!upiString.toLowerCase().startsWith('upi://')) return null;

    const queryPart = upiString.split('?')[1] || '';
    const params = new URLSearchParams(queryPart);
    const pa = params.get('pa') || '';
    if (!pa) return null;

    return {
      pa,
      pn: params.get('pn') || params.get('mc') || '',
      am: params.get('am') || '',
    };
  } catch {
    return null;
  }
}

function openUpiLink(link: string) {
  // Use window.location.href — most reliable approach in Android browser/PWA
  // The confirmation screen is shown immediately so user can confirm on return
  window.location.href = link;
}

type Step = 'scan' | 'pay' | 'confirm';

export default function ScanPayModal({ open, onClose, onSuccess }: ScanPayModalProps) {
  const [step, setStep] = useState<Step>('scan');
  const [amount, setAmount] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [payeeUpi, setPayeeUpi] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [category, setCategory] = useState('');
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);
  const [showAppSetup, setShowAppSetup] = useState(false);
  const [camError, setCamError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);
  const [nonUpiDetected, setNonUpiDetected] = useState(false);
  const [scanLinePos, setScanLinePos] = useState(0);
  const [primaryLink, setPrimaryLink] = useState('');
  const [fallbackLink, setFallbackLink] = useState('');
  const [appOpenError, setAppOpenError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const scanLineRaf = useRef<number>(0);
  const scanLineDir = useRef<1 | -1>(1);

  const settings = getSettings();
  const appColor = APP_COLORS[settings.preferredPayApp] || '#00D65E';
  const appName = settings.payAppName || 'UPI App';
  const cat = category || settings.categories[0] || 'Others';

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(scanLineRaf.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError('');
    setDetected(false);
    setNonUpiDetected(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
      }
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCamError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCamError('No camera found on this device.');
      } else if (name === 'NotReadableError') {
        setCamError('Camera is in use by another app. Close other apps and try again.');
      } else {
        setCamError('Could not access camera. Use manual entry below.');
      }
    }
  }, []);

  // Animate scan line
  useEffect(() => {
    if (!scanning) return;
    let pos = 0;
    const animate = () => {
      pos += 1.2 * scanLineDir.current;
      if (pos >= 90) { pos = 90; scanLineDir.current = -1; }
      if (pos <= 0)  { pos = 0;  scanLineDir.current = 1; }
      setScanLinePos(pos);
      scanLineRaf.current = requestAnimationFrame(animate);
    };
    scanLineRaf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(scanLineRaf.current);
  }, [scanning]);

  // Scan frames
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code?.data) {
      const upi = parseUpiQr(code.data);
      if (upi) {
        setDetected(true);
        stopCamera();
        setPayeeUpi(upi.pa);
        setPayeeName(upi.pn);
        if (upi.am) setAmount(upi.am);
        setStep('pay');
        return;
      } else {
        setNonUpiDetected(true);
        setTimeout(() => setNonUpiDetected(false), 2500);
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  useEffect(() => {
    if (scanning && videoRef.current) {
      const startScan = () => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(scanFrame);
      };
      const vid = videoRef.current;
      vid.addEventListener('loadeddata', startScan);
      if (vid.readyState >= vid.HAVE_ENOUGH_DATA) startScan();
      return () => vid.removeEventListener('loadeddata', startScan);
    }
  }, [scanning, scanFrame]);

  // Open / close lifecycle
  useEffect(() => {
    if (open && !manualMode) {
      setStep('scan');
      setAmount('');
      setPayeeUpi('');
      setPayeeName('');
      setCategory('');
      setDetected(false);
      setNonUpiDetected(false);
      setAppOpenError(false);
      startCamera();
    }
    if (!open) {
      stopCamera();
      setManualMode(false);
      setStep('scan');
      setAppOpenError(false);
    }
  }, [open]);

  const switchToManual = () => {
    stopCamera();
    setManualMode(true);
    setStep('pay');
  };

  const isValidUpi = (val: string) =>
    /^\d{10}$/.test(val.trim()) || /^[\w.\-+]+@[\w]+$/.test(val.trim());

  // Step 1 → 2: open UPI app, show confirm screen
  const handlePay = () => {
    const s = getSettings();
    if (!s.preferredPayApp) { setShowAppSetup(true); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!isValidUpi(payeeUpi)) return;

    const primary  = buildPaymentLink(s.preferredPayApp, payeeUpi, Number(amount), '', payeeName);
    const fallback = buildFallbackUpiLink(payeeUpi, Number(amount), '', payeeName);
    setPrimaryLink(primary);
    setFallbackLink(fallback);
    setAppOpenError(false);
    setStep('confirm');

    // Attempt to open the UPI app
    try {
      openUpiLink(primary);
    } catch {
      setAppOpenError(true);
    }
  };

  // Step 2: user confirms payment succeeded → save transaction
  const handleConfirmSuccess = () => {
    addTransaction({
      amount: Number(amount),
      category: cat,
      note: payeeName ? `Payment to ${payeeName}` : `Payment to ${payeeUpi}`,
    });
    const info = checkBudgetAlert(cat);
    onSuccess();
    onClose();
    if (info.kind !== 'none') setAlert(info);
  };

  // Step 2: user says payment failed → go back
  const handleConfirmCancel = () => {
    setStep('pay');
    setAppOpenError(false);
  };

  const inputStyle: React.CSSProperties = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
  };

  return (
    <>
      <BottomSheet isOpen={open} onClose={onClose} title={
        step === 'scan' ? 'Scan QR Code' : step === 'pay' ? 'Pay' : 'Confirm Payment'
      }>

        {/* ── STEP: SCAN ── */}
        {step === 'scan' && (
          <div className="flex flex-col items-center py-4 gap-4">
            <div className="relative w-full rounded-2xl overflow-hidden"
              style={{ aspectRatio: '1/1', maxHeight: 320, background: '#000' }}>
              <video ref={videoRef} muted playsInline autoPlay
                className="absolute inset-0 w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              {scanning && !camError && (
                <>
                  {['top-3 left-3 border-t-2 border-l-2',
                    'top-3 right-3 border-t-2 border-r-2',
                    'bottom-3 left-3 border-b-2 border-l-2',
                    'bottom-3 right-3 border-b-2 border-r-2'].map((cls, i) => (
                    <div key={i} className={`absolute w-7 h-7 ${cls}`}
                      style={{ borderColor: '#00D65E', borderRadius: 3 }} />
                  ))}
                  <div className="absolute left-3 right-3 h-[2px]" style={{
                    top: `${scanLinePos}%`,
                    background: 'linear-gradient(90deg, transparent, #00D65E, transparent)',
                    boxShadow: '0 0 8px #00D65E',
                  }} />
                </>
              )}

              {nonUpiDetected && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,180,0,0.15)', border: '1px solid rgba(255,180,0,0.4)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#FFB400' }} />
                  <p className="text-[11px]" style={{ color: '#FFB400' }}>
                    QR detected — not a UPI code. Try a merchant QR.
                  </p>
                </div>
              )}

              {(camError || !scanning) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
                  style={{ background: 'hsl(222 40% 10%)' }}>
                  <CameraOff className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {camError || 'Starting camera...'}
                  </p>
                  {camError && (
                    <button onClick={startCamera}
                      className="text-xs font-semibold px-4 py-2 rounded-xl"
                      style={{ background: 'rgba(0,214,94,0.15)', color: '#00D65E' }}>
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Point camera at any UPI / GPay / PhonePe merchant QR code
            </p>

            <button onClick={switchToManual}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold w-full justify-center"
              style={{ background: 'hsl(222 40% 16%)', color: 'hsl(215 20% 65%)', border: '1px solid hsl(222 35% 22%)' }}>
              <Keyboard className="w-4 h-4" />
              Enter UPI ID / Mobile manually
            </button>
          </div>
        )}

        {/* ── STEP: PAY ── */}
        {step === 'pay' && (
          <div className="flex flex-col gap-4 py-1">
            {/* App badge */}
            <div className="flex items-center justify-between">
              {settings.preferredPayApp ? (
                <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: `${appColor}15`, color: appColor, border: `1px solid ${appColor}30` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: appColor }} />
                  Opens {appName}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No payment app selected</div>
              )}
              <button onClick={() => setShowAppSetup(true)}
                className="text-xs underline underline-offset-2 text-muted-foreground">
                {settings.preferredPayApp ? 'Change' : 'Select App'}
              </button>
            </div>

            {/* Payee */}
            {detected && payeeUpi ? (
              <div className="flex items-center gap-4 p-4 rounded-2xl" style={inputStyle}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,214,94,0.15)', border: '1px solid rgba(0,214,94,0.3)' }}>
                  <Store className="w-6 h-6" style={{ color: '#00D65E' }} />
                </div>
                <div className="flex-1 min-w-0">
                  {payeeName && <p className="text-sm font-bold text-foreground">{payeeName}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{payeeUpi}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#00D65E' }}>✓ Scanned from QR</p>
                </div>
                <button onClick={switchToManual}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                  style={{ background: 'hsl(222 35% 22%)', color: 'hsl(215 20% 65%)' }}>
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pay to</label>
                <input type="text" value={payeeUpi} onChange={e => setPayeeUpi(e.target.value)}
                  placeholder="UPI ID (name@bank) or 10-digit mobile"
                  autoFocus
                  className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
                  style={inputStyle} />
                {payeeUpi && isValidUpi(payeeUpi) && (
                  <p className="text-xs" style={{ color: '#00D65E' }}>
                    {/^\d{10}$/.test(payeeUpi.trim()) ? '✓ Mobile number' : '✓ UPI ID'}
                  </p>
                )}
                <button onClick={() => { setManualMode(false); setStep('scan'); startCamera(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2">
                  <SwitchCamera className="w-3 h-3" /> Scan QR instead
                </button>
              </div>
            )}

            {/* Amount */}
            <div className="flex items-center justify-center py-4 rounded-xl" style={inputStyle}>
              <span className="text-2xl text-muted-foreground mr-2 font-display">₹</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="bg-transparent border-none outline-none w-32 text-4xl text-center font-display font-bold placeholder:text-muted-foreground/30" />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {settings.categories.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className="py-2 px-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                    style={cat === c
                      ? { background: '#00D65E', color: '#000' }
                      : { background: 'hsl(222 35% 18%)', color: 'hsl(215 20% 65%)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Pay button */}
            <button onClick={handlePay}
              disabled={!amount || !isValidUpi(payeeUpi)}
              className="w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: '#00D65E', color: '#000' }}>
              Pay ₹{Number(amount || 0).toLocaleString('en-IN')} via {appName}
            </button>

            <p className="text-center text-[10px] text-muted-foreground -mt-1">
              You will confirm after the payment completes
            </p>
          </div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && (
          <div className="flex flex-col gap-4 py-2">
            {/* Icon */}
            <div className="flex flex-col items-center text-center pt-3 pb-1 gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: `${appColor}18`, border: `2px solid ${appColor}40` }}>
                <Smartphone className="w-8 h-8" style={{ color: appColor }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Complete in {appName}</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[260px]">
                  Finish the payment in your UPI app, then come back here and confirm.
                </p>
              </div>
            </div>

            {/* Payment summary */}
            <div className="rounded-2xl p-4 space-y-2.5" style={inputStyle}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Paying to</span>
                <div className="text-right">
                  {payeeName && <p className="text-xs font-bold text-foreground">{payeeName}</p>}
                  <p className="text-[11px] text-muted-foreground">{payeeUpi}</p>
                </div>
              </div>
              <div className="flex justify-between items-center" style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                <span className="text-xs text-muted-foreground">Amount</span>
                <span className="text-lg font-bold" style={{ color: '#00D65E' }}>
                  ₹{Number(amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center" style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                <span className="text-xs text-muted-foreground">Category</span>
                <span className="text-xs font-semibold text-foreground">{cat}</span>
              </div>
            </div>

            {/* App didn't open fallback */}
            {appOpenError && (
              <div className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#FF4444' }} />
                <p className="text-[11px]" style={{ color: '#FF4444' }}>
                  App didn't open.{' '}
                  <button onClick={() => { setAppOpenError(false); openUpiLink(fallbackLink); }}
                    className="underline underline-offset-2 font-semibold">
                    Try generic UPI
                  </button>
                </p>
              </div>
            )}

            {!appOpenError && (
              <button onClick={() => openUpiLink(fallbackLink)}
                className="text-center text-xs text-muted-foreground underline underline-offset-2">
                App didn't open? Try generic UPI link
              </button>
            )}

            <p className="text-center text-xs font-semibold text-muted-foreground">
              Did the payment go through?
            </p>

            {/* Confirm / Cancel */}
            <div className="flex gap-3">
              <button onClick={handleConfirmCancel}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: 'hsl(222 40% 16%)', color: 'hsl(215 20% 65%)', border: '1px solid hsl(222 35% 22%)' }}>
                <XCircle className="w-4 h-4" />
                No, go back
              </button>
              <button onClick={handleConfirmSuccess}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: '#00D65E', color: '#000' }}>
                <CheckCircle2 className="w-4 h-4" />
                Yes, paid!
              </button>
            </div>

            <p className="text-center text-[10px] text-muted-foreground -mt-1">
              Transaction is recorded only after you confirm
            </p>
          </div>
        )}
      </BottomSheet>

      {alert && (
        <BudgetAlertModal
          open={!!alert}
          onClose={() => setAlert(null)}
          type={alert.kind === 'none' ? 'no_budget' : alert.kind}
          category={alert.category}
          spent={alert.spent}
          budget={alert.budget}
        />
      )}

      <PayAppSetupModal open={showAppSetup} onDone={() => setShowAppSetup(false)} />
    </>
  );
}
