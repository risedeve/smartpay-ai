import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Store, CameraOff, AlertCircle, Smartphone,
  CheckCircle2, XCircle, Copy, Check, ScanLine, X,
} from 'lucide-react';
import jsQR from 'jsqr';
import {
  addTransaction, getSettings, checkBudgetAlert,
  BudgetAlertInfo, buildPaymentLink, buildFallbackUpiLink,
} from '@/lib/storage';
import BottomSheet from './BottomSheet';
import BudgetAlertModal from './BudgetAlertModal';
import PayAppSetupModal from './PayAppSetupModal';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

const APP_COLORS: Record<string, string> = {
  gpay: '#4285F4', phonepe: '#5f259f', paytm: '#00B9F1', upi: '#FF6B00',
};

interface ScanPayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function parseUpiQr(raw: string): { pa: string; pn: string; am: string } | null {
  try {
    let s = raw.trim();
    const embedded = s.match(/[?&](upi:\/\/[^&\s]+)/);
    if (embedded) s = decodeURIComponent(embedded[1]);
    if (!s.toLowerCase().startsWith('upi://')) return null;
    const p = new URLSearchParams(s.split('?')[1] || '');
    const pa = p.get('pa') || '';
    if (!pa) return null;
    return { pa, pn: p.get('pn') || '', am: p.get('am') || '' };
  } catch { return null; }
}

function openUpiLink(link: string) {
  const a = document.createElement('a');
  a.href = link;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

type Step = 'pay' | 'confirm';

export default function ScanPayModal({ open, onClose, onSuccess }: ScanPayModalProps) {
  const [step, setStep] = useState<Step>('pay');

  // Payment fields
  const [upiId, setUpiId]         = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [amount, setAmount]       = useState('');
  const [category, setCategory]   = useState('');
  const [subCat, setSubCat]       = useState('');

  // Scanner
  const [showScanner, setShowScanner]         = useState(true);
  const [scanning, setScanning]               = useState(false);
  const [camError, setCamError]               = useState('');
  const [nonUpiDetected, setNonUpiDetected]   = useState(false);
  const [scanLinePos, setScanLinePos]         = useState(0);

  // Confirm step
  const [primaryLink, setPrimaryLink]   = useState('');
  const [fallbackLink, setFallbackLink] = useState('');
  const [appOpenError, setAppOpenError] = useState(false);
  const [copied, setCopied]             = useState(false);

  const [alert, setAlert]           = useState<BudgetAlertInfo | null>(null);
  const [showAppSetup, setShowAppSetup] = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const scanLineRaf = useRef<number>(0);
  const scanLineDir = useRef<1 | -1>(1);

  const settings = getSettings();
  const cat      = category || settings.categories[0] || 'Others';
  const appColor = APP_COLORS[settings.preferredPayApp] || '#00D65E';
  const appName  = settings.payAppName || 'UPI App';

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
    setNonUpiDetected(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
      }
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
        setCamError('Camera permission denied.');
      else if (name === 'NotFoundError')
        setCamError('No camera found.');
      else if (name === 'NotReadableError')
        setCamError('Camera in use by another app.');
      else
        setCamError('Could not access camera.');
    }
  }, []);

  // Scan line animation
  useEffect(() => {
    if (!scanning) return;
    let pos = 0;
    const animate = () => {
      pos += 1.5 * scanLineDir.current;
      if (pos >= 90) { pos = 90; scanLineDir.current = -1; }
      if (pos <= 0)  { pos = 0;  scanLineDir.current = 1; }
      setScanLinePos(pos);
      scanLineRaf.current = requestAnimationFrame(animate);
    };
    scanLineRaf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(scanLineRaf.current);
  }, [scanning]);

  // QR frame scanner
  const scanFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
    if (code?.data) {
      const upi = parseUpiQr(code.data);
      if (upi) {
        stopCamera();
        setShowScanner(false);
        setUpiId(upi.pa);
        setPayeeName(upi.pn);
        if (upi.am) setAmount(upi.am);
        return;
      } else {
        setNonUpiDetected(true);
        setTimeout(() => setNonUpiDetected(false), 2000);
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

  // Lifecycle: open/close
  useEffect(() => {
    if (open) {
      setStep('pay');
      setUpiId(''); setPayeeName(''); setAmount('');
      setCategory(''); setSubCat('');
      setShowScanner(true);
      setAppOpenError(false); setCopied(false);
    } else {
      stopCamera();
      setShowScanner(false);
      setStep('pay');
    }
  }, [open]);

  // Start/stop camera based on showScanner
  useEffect(() => {
    if (showScanner && open && step === 'pay') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [showScanner, open, step]);

  // UPI input change — collapse scanner while typing
  const handleUpiChange = (val: string) => {
    setUpiId(val);
    setPayeeName('');
    if (val && showScanner) setShowScanner(false);
  };

  const clearUpi = () => {
    setUpiId(''); setPayeeName(''); setShowScanner(true);
  };

  const isValidUpi = (val: string) =>
    /^\d{10}$/.test(val.trim()) || /^[\w.\-+]+@[\w]+$/.test(val.trim());

  const handlePay = () => {
    if (!settings.preferredPayApp) { setShowAppSetup(true); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!isValidUpi(upiId)) return;

    const primary  = buildPaymentLink(settings.preferredPayApp, upiId, Number(amount), subCat || '', payeeName);
    const fallback = buildFallbackUpiLink(upiId, Number(amount), subCat || '', payeeName);
    setPrimaryLink(primary);
    setFallbackLink(fallback);
    setAppOpenError(false); setCopied(false);
    setStep('confirm');
    if (!isIOS) {
      try { openUpiLink(primary); } catch { setAppOpenError(true); }
    }
  };

  const handleConfirmSuccess = () => {
    addTransaction({
      amount: Number(amount),
      category: cat,
      note: [payeeName || upiId, subCat].filter(Boolean).join(' • '),
    });
    const info = checkBudgetAlert(cat);
    onSuccess();
    onClose();
    if (info.kind !== 'none') setAlert(info);
  };

  const handleConfirmCancel = () => { setStep('pay'); setAppOpenError(false); };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputStyle: React.CSSProperties = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
  };

  return (
    <>
      <BottomSheet
        isOpen={open}
        onClose={onClose}
        title={step === 'pay' ? 'Pay' : 'Confirm Payment'}
      >
        {/* ── STEP: PAY ── */}
        {step === 'pay' && (
          <div className="flex flex-col gap-3 py-1">

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
                {settings.preferredPayApp ? 'Change app' : 'Select app'}
              </button>
            </div>

            {/* UPI ID / Mobile input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pay to</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={inputStyle}>
                <input
                  type="text"
                  value={upiId}
                  onChange={e => handleUpiChange(e.target.value)}
                  placeholder="UPI ID (name@bank) or mobile number"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                {upiId ? (
                  <button onClick={clearUpi} className="shrink-0 p-1 rounded-full"
                    style={{ background: 'hsl(222 35% 22%)' }}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                ) : (
                  <button onClick={() => setShowScanner(s => !s)}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={showScanner
                      ? { background: `${appColor}20`, color: appColor }
                      : { background: 'hsl(222 35% 22%)', color: 'hsl(215 20% 60%)' }}>
                    <ScanLine className="w-3.5 h-3.5" />
                    {showScanner ? 'Hide' : 'Scan'}
                  </button>
                )}
              </div>
              {upiId && isValidUpi(upiId) && (
                <div className="flex items-center gap-1.5">
                  {payeeName && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(0,214,94,0.12)', border: '1px solid rgba(0,214,94,0.2)' }}>
                      <Store className="w-3 h-3" style={{ color: '#00D65E' }} />
                      <span className="text-[11px] font-semibold" style={{ color: '#00D65E' }}>{payeeName}</span>
                    </div>
                  )}
                  <p className="text-xs" style={{ color: '#00D65E' }}>
                    {!payeeName && (/^\d{10}$/.test(upiId.trim()) ? '✓ Mobile number' : '✓ UPI ID')}
                  </p>
                </div>
              )}
            </div>

            {/* Compact Camera Scanner */}
            {showScanner && !upiId && (
              <div className="relative w-full rounded-2xl overflow-hidden"
                style={{ height: 176, background: '#000' }}>
                <video ref={videoRef} muted playsInline autoPlay
                  className="absolute inset-0 w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {scanning && !camError && (
                  <>
                    {['top-2 left-2 border-t-2 border-l-2',
                      'top-2 right-2 border-t-2 border-r-2',
                      'bottom-2 left-2 border-b-2 border-l-2',
                      'bottom-2 right-2 border-b-2 border-r-2'].map((cls, i) => (
                      <div key={i} className={`absolute w-6 h-6 ${cls}`}
                        style={{ borderColor: '#00D65E', borderRadius: 3 }} />
                    ))}
                    <div className="absolute left-3 right-3 h-[2px]" style={{
                      top: `${scanLinePos}%`,
                      background: 'linear-gradient(90deg, transparent, #00D65E, transparent)',
                      boxShadow: '0 0 8px #00D65E',
                    }} />
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                        Point at any UPI / GPay QR code
                      </span>
                    </div>
                  </>
                )}

                {nonUpiDetected && (
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(255,180,0,0.2)', border: '1px solid rgba(255,180,0,0.4)' }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#FFB400' }} />
                    <p className="text-[10px]" style={{ color: '#FFB400' }}>Not a UPI QR — try a merchant code</p>
                  </div>
                )}

                {(camError || (!scanning && !camError)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center"
                    style={{ background: 'hsl(222 40% 10%)' }}>
                    <CameraOff className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {camError || 'Starting camera...'}
                    </p>
                    {camError && (
                      <button onClick={startCamera}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(0,214,94,0.15)', color: '#00D65E' }}>
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="flex flex-col items-center justify-center py-4 rounded-2xl" style={inputStyle}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Amount</span>
              <div className="flex items-center">
                <span className="text-2xl text-muted-foreground mr-1 font-display">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="bg-transparent border-none outline-none w-36 text-4xl text-center font-display font-bold text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {settings.categories.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className="py-1.5 px-3 rounded-full text-[11px] font-semibold transition-all active:scale-95"
                    style={cat === c
                      ? { background: '#00D65E', color: '#000' }
                      : { background: 'hsl(222 35% 18%)', color: 'hsl(215 20% 65%)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-category / Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sub-category / Note <span className="normal-case font-normal opacity-60">(optional)</span>
              </label>
              <input
                type="text"
                value={subCat}
                onChange={e => setSubCat(e.target.value)}
                placeholder={`e.g. Rashan, Coffee, Netflix...`}
                className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
                style={inputStyle}
              />
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={!amount || !isValidUpi(upiId)}
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

            {isIOS ? (
              <>
                <div className="flex flex-col items-center text-center pt-2 gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,149,0,0.15)', border: '2px solid rgba(255,149,0,0.4)' }}>
                    <Smartphone className="w-7 h-7" style={{ color: '#FF9500' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Pay Manually on iPhone</h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[270px]">
                      Safari cannot open UPI apps directly. Open GPay / PhonePe / Paytm and pay using the details below.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl p-4 space-y-3" style={inputStyle}>
                  {payeeName && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Merchant</span>
                      <span className="text-xs font-bold text-foreground">{payeeName}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">UPI ID — tap to copy</p>
                    <button onClick={copyUpiId}
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl active:scale-[0.98]"
                      style={{ background: 'hsl(222 35% 20%)', border: '1px solid hsl(222 30% 28%)' }}>
                      <span className="text-sm font-bold text-foreground font-mono">{upiId}</span>
                      {copied
                        ? <Check className="w-4 h-4 shrink-0" style={{ color: '#00D65E' }} />
                        : <Copy className="w-4 h-4 shrink-0 text-muted-foreground" />}
                    </button>
                    {copied && <p className="text-[11px] mt-1" style={{ color: '#00D65E' }}>✓ Copied!</p>}
                  </div>
                  <div className="flex justify-between items-center"
                    style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                    <span className="text-xs text-muted-foreground">Amount to pay</span>
                    <span className="text-lg font-bold" style={{ color: '#00D65E' }}>
                      ₹{Number(amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {subCat && (
                    <div className="flex justify-between items-center"
                      style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                      <span className="text-xs text-muted-foreground">Note</span>
                      <span className="text-xs text-foreground">{subCat}</span>
                    </div>
                  )}
                </div>

                <p className="text-center text-[11px] text-muted-foreground">
                  After paying in your UPI app, come back here and confirm.
                </p>
              </>
            ) : (
              <>
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

                <div className="rounded-2xl p-4 space-y-2.5" style={inputStyle}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Paying to</span>
                    <div className="text-right">
                      {payeeName && <p className="text-xs font-bold text-foreground">{payeeName}</p>}
                      <p className="text-[11px] text-muted-foreground">{upiId}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center"
                    style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                    <span className="text-xs text-muted-foreground">Amount</span>
                    <span className="text-lg font-bold" style={{ color: '#00D65E' }}>
                      ₹{Number(amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center"
                    style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                    <span className="text-xs text-muted-foreground">Category</span>
                    <span className="text-xs font-semibold text-foreground">
                      {cat}{subCat ? ` • ${subCat}` : ''}
                    </span>
                  </div>
                </div>

                {appOpenError ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)' }}>
                    <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#FF4444' }} />
                    <p className="text-[11px]" style={{ color: '#FF4444' }}>
                      App didn't open.{' '}
                      <button onClick={() => { setAppOpenError(false); openUpiLink(fallbackLink); }}
                        className="underline font-semibold">Try generic UPI</button>
                    </p>
                  </div>
                ) : (
                  <button onClick={() => openUpiLink(fallbackLink)}
                    className="text-center text-xs text-muted-foreground underline underline-offset-2">
                    App didn't open? Try generic UPI link
                  </button>
                )}
              </>
            )}

            <p className="text-center text-xs font-semibold text-muted-foreground">
              Did the payment go through?
            </p>

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
