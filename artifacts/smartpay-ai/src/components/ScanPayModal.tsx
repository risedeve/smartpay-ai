import { useState, useEffect, useRef, useCallback } from 'react';
import { Store, CameraOff, Keyboard, SwitchCamera } from 'lucide-react';
import jsQR from 'jsqr';
import {
  addTransaction, getSettings, checkBudgetAlert,
  BudgetAlertInfo, buildPaymentLink,
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
  pa: string;   // payee UPI ID
  pn: string;   // payee name
  am: string;   // amount
}

const APP_COLORS: Record<string, string> = {
  gpay: '#4285F4', phonepe: '#5f259f', paytm: '#00B9F1', upi: '#FF6B00',
};

function parseUpiQr(raw: string): UpiDetails | null {
  try {
    // UPI QR format: upi://pay?pa=...&pn=...&am=...
    const url = raw.startsWith('upi://') ? raw : null;
    if (!url) return null;
    const params = new URLSearchParams(raw.split('?')[1] || '');
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

export default function ScanPayModal({ open, onClose, onSuccess }: ScanPayModalProps) {
  const [step, setStep] = useState<'scan' | 'pay'>('scan');
  const [amount, setAmount] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [payeeUpi, setPayeeUpi] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);
  const [showAppSetup, setShowAppSetup] = useState(false);
  const [camError, setCamError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const settings = getSettings();
  const appColor = APP_COLORS[settings.preferredPayApp] || '#00D65E';
  const appName = settings.payAppName || 'UPI App';
  const cat = category || settings.categories[0] || 'Others';

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError('');
    setDetected(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
      }
    } catch (err: any) {
      setCamError(err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access and try again.'
        : 'Camera not available on this device.');
    }
  }, []);

  // Scan frames for QR codes
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
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
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  useEffect(() => {
    if (scanning && videoRef.current) {
      videoRef.current.onloadeddata = () => {
        rafRef.current = requestAnimationFrame(scanFrame);
      };
    }
  }, [scanning, scanFrame]);

  useEffect(() => {
    if (open && !manualMode) {
      setStep('scan');
      setAmount('');
      setPayeeUpi('');
      setPayeeName('');
      setCategory('');
      setDetected(false);
      startCamera();
    }
    if (!open) {
      stopCamera();
      setManualMode(false);
      setStep('scan');
    }
  }, [open]);

  const switchToManual = () => {
    stopCamera();
    setManualMode(true);
    setStep('pay');
  };

  const isValidUpi = (val: string) => {
    if (!val.trim()) return false;
    return /^\d{10}$/.test(val.trim()) || /^[\w.\-+]+@[\w]+$/.test(val.trim());
  };

  const handlePay = () => {
    const s = getSettings();
    if (!s.preferredPayApp) { setShowAppSetup(true); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!isValidUpi(payeeUpi)) return;

    setIsSubmitting(true);
    addTransaction({
      amount: Number(amount),
      category: cat,
      note: payeeName ? `Payment to ${payeeName}` : `Payment to ${payeeUpi}`,
    });

    const link = buildPaymentLink(s.preferredPayApp, payeeUpi, Number(amount));
    window.location.href = link;

    setTimeout(() => {
      const info = checkBudgetAlert(cat);
      setIsSubmitting(false);
      onSuccess();
      onClose();
      if (info.kind !== 'none') setAlert(info);
    }, 600);
  };

  const inputStyle: React.CSSProperties = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
  };

  return (
    <>
      <BottomSheet isOpen={open} onClose={onClose} title={step === 'scan' ? 'Scan QR Code' : 'Pay'}>
        {step === 'scan' ? (
          <div className="flex flex-col items-center py-4 gap-4">
            {/* Camera viewfinder */}
            <div
              className="relative w-full rounded-2xl overflow-hidden"
              style={{ aspectRatio: '1/1', maxHeight: 320, background: '#000' }}
            >
              {/* Live video */}
              <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Corner markers */}
              {scanning && !camError && (
                <>
                  {[
                    'top-3 left-3 border-t-2 border-l-2',
                    'top-3 right-3 border-t-2 border-r-2',
                    'bottom-3 left-3 border-b-2 border-l-2',
                    'bottom-3 right-3 border-b-2 border-r-2',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-7 h-7 ${cls}`} style={{ borderColor: '#00D65E', borderRadius: 3 }} />
                  ))}
                  {/* Scan line */}
                  <div
                    className="absolute left-3 right-3 h-[2px] animate-scan"
                    style={{ background: '#00D65E', boxShadow: '0 0 8px #00D65E' }}
                  />
                </>
              )}

              {/* No camera / error state */}
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
              Point camera at any UPI / GPay / PhonePe QR code
            </p>

            {/* Manual fallback */}
            <button
              onClick={switchToManual}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold w-full justify-center"
              style={{ background: 'hsl(222 40% 16%)', color: 'hsl(215 20% 65%)', border: '1px solid hsl(222 35% 22%)' }}
            >
              <Keyboard className="w-4 h-4" />
              Enter UPI ID / Mobile manually
            </button>
          </div>
        ) : (
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
              <button onClick={() => setShowAppSetup(true)} className="text-xs underline underline-offset-2 text-muted-foreground">
                {settings.preferredPayApp ? 'Change' : 'Select App'}
              </button>
            </div>

            {/* Payee */}
            {detected && payeeUpi ? (
              /* Scanned merchant card */
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
              /* Manual UPI entry */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pay to</label>
                <input
                  type="text"
                  value={payeeUpi}
                  onChange={e => setPayeeUpi(e.target.value)}
                  placeholder="UPI ID (name@bank) or 10-digit mobile"
                  autoFocus
                  className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
                  style={inputStyle}
                />
                {payeeUpi && isValidUpi(payeeUpi) && (
                  <p className="text-xs" style={{ color: '#00D65E' }}>
                    {/^\d{10}$/.test(payeeUpi.trim()) ? '✓ Mobile number' : '✓ UPI ID'}
                  </p>
                )}
                <button
                  onClick={() => { setManualMode(false); setStep('scan'); startCamera(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2"
                >
                  <SwitchCamera className="w-3 h-3" /> Scan QR instead
                </button>
              </div>
            )}

            {/* Amount */}
            <div className="flex items-center justify-center py-4 rounded-xl" style={inputStyle}>
              <span className="text-2xl text-muted-foreground mr-2 font-display">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="bg-transparent border-none outline-none w-32 text-4xl text-center font-display font-bold placeholder:text-muted-foreground/30"
              />
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
                      : { background: 'hsl(222 35% 18%)', color: 'hsl(215 20% 65%)' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={!amount || !isValidUpi(payeeUpi) || isSubmitting}
              className="w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: isSubmitting ? 'hsl(222 35% 22%)' : '#00D65E', color: isSubmitting ? '#666' : '#000' }}
            >
              {isSubmitting ? 'Opening...' : `Pay ₹${Number(amount || 0).toLocaleString('en-IN')} via ${appName}`}
            </button>

            <p className="text-center text-[10px] text-muted-foreground -mt-1">
              Logs the payment · Opens {appName} to complete it
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
