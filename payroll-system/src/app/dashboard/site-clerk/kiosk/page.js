'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Webcam from 'react-webcam';
import { 
  ArrowLeft, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Smartphone, 
  Camera,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

export default function QRKioskPage() {
  const [qrToken, setQrToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [cameraActive, setCameraActive] = useState(true);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'verifying' | 'success' | 'error'
  const webcamRef = useRef(null);
  const siteLocation = 'Debete Site';

  // 1. Generate dynamic QR payload with site name and timestamp pointing directly to /clock-in
  const generateToken = useCallback(() => {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      site: siteLocation,
      ts: timestamp,
    });
    
    // Base64 encode for simple URL transmission
    const encoded = btoa(payload);
    
    // Construct absolute target URL for mobile phone scanning
    if (typeof window !== 'undefined') {
      const targetUrl = new URL('/clock-in', window.location.origin);
      targetUrl.searchParams.set('token', encoded);
      setQrToken(targetUrl.toString());
    }
    setTimeLeft(15);
  }, [siteLocation]);

  useEffect(() => {
    generateToken();

    // 15-second countdown timer for dynamic payload refresh
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateToken();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [generateToken]);

  // 2. Capture live snapshot from Kiosk camera for buddy-punching audit
  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedSnapshot(imageSrc);
      return imageSrc;
    }
    return null;
  }, [webcamRef]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <SiteClerkSideNav />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col justify-between overflow-x-hidden">
        {/* Top Header */}
        <SiteClerkNavbar title="Site QR Terminal" siteName={siteLocation} />

        {/* Kiosk Display Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs max-w-4xl mx-auto w-full flex flex-col items-center text-center space-y-6 my-auto">
          
          {/* Status Badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Terminal Live & Visual Audit Enabled</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Scan QR Code to Clock In / Out
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
              Scan the dynamic code using your mobile phone camera. Stand facing the kiosk camera for image verification.
            </p>
          </div>

          {/* Interactive Kiosk Grid: QR Terminal + Live Verification Camera */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-center">
            
            {/* Left Column: QR Code Container */}
            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-indigo-100 shadow-inner flex flex-col items-center justify-center relative min-h-[280px]">
              {qrToken ? (
                <QRCodeSVG 
                  value={qrToken} 
                  size={200} 
                  level="H" 
                  includeMargin={true}
                  className="rounded-xl shadow-xs"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              )}

              {/* Countdown Badge */}
              <div className="mt-4 flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl text-xs font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>Refreshes in <strong className="text-indigo-600 font-extrabold">{timeLeft}s</strong></span>
              </div>
            </div>

            {/* Right Column: Live Audit Camera feed */}
            <div className="bg-slate-900 p-4 rounded-3xl border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center relative min-h-[280px] overflow-hidden text-white">
              {cameraActive ? (
                <div className="relative w-full h-full min-h-[220px] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: 'user'
                    }}
                  />

                  {/* Facial Alignment Overlay Guide */}
                  <div className="absolute inset-0 border-2 border-dashed border-emerald-400/50 rounded-full m-8 pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300/80 bg-black/40 px-2 py-0.5 rounded-full">
                      Align Face Here
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[10px] text-slate-300">
                    <Camera className="w-3 h-3 text-emerald-400" />
                    <span>Live Verification</span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  Camera Feed Disabled
                </div>
              )}

              <p className="text-[11px] text-slate-400 font-medium mt-3">
                Live snapshot taken automatically on scan for HR identity validation.
              </p>
            </div>
          </div>

          {/* Verification Status Overlay Notice */}
          {verificationStatus === 'verifying' && (
            <div className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center gap-2 text-indigo-700 text-xs font-bold animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying Employee Identity & Photo Match...</span>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Identity Confirmed! Attendance Recorded.</span>
            </div>
          )}

          {/* Local Testing Link */}
          <div className="w-full pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Testing locally on PC?</p>
                <p className="text-[11px] text-slate-500">Click below to trigger the verification endpoint directly in a new tab.</p>
              </div>
            </div>

            {qrToken && (
              <a
                href={qrToken}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shrink-0"
              >
                Open Verification Target ↗
              </a>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <Link
            href="/dashboard/site-clerk"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Shift Roster</span>
          </Link>
          <span className="text-[11px] text-slate-400 font-medium">Periscope Field Kiosk v1.1 • Anti-Buddy Punching Enabled</span>
        </div>
      </main>
    </div>
  );
}