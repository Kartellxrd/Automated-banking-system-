"use client";

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  QrCode, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  ArrowLeft, 
  Smartphone, 
  ShieldAlert,
  Play
} from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

export default function SiteClerkKioskPage() {
  const searchParams = useSearchParams();
  const initialSite = searchParams.get('site') || 'Site A';

  const [selectedSite, setSelectedSite] = useState(initialSite);
  const [timestamp, setTimestamp] = useState('');
  const [countdown, setCountdown] = useState(15);
  const [qrPayload, setQrPayload] = useState('');
  const [recentScans, setRecentScans] = useState([
    { id: 1, name: 'Kabo Tau', code: 'EMP-082', time: '07:14:02 AM', status: 'Clock In Verified' },
    { id: 2, name: 'Lame Dube', code: 'EMP-104', time: '07:11:45 AM', status: 'Clock In Verified' },
  ]);
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef(null);

  const sites = ['Site A', 'Site B', 'Site C', 'Site D', 'Site E'];

  // Initialize and update dynamic QR payload every 15 seconds
  useEffect(() => {
    const updatePayload = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      const isoString = now.toISOString();
      const payload = JSON.stringify({
        site: selectedSite,
        timestamp: isoString,
        terminal_id: `TERM-${selectedSite.replace(' ', '')}-01`
      });

      setTimestamp(timeString);
      setQrPayload(payload);
      setCountdown(15);
    };

    updatePayload();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          updatePayload();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSite]);

  // Handle live camera access
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setWebcamActive(true);
      }
    } catch (err) {
      console.warn('Camera access denied or unmounted:', err);
      setWebcamActive(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Desktop manual scan trigger for local testing
  const handleManualTestScan = () => {
    const testNames = ['Tebogo Moeti', 'Thato Kgosi', 'Oarabile Seretse', 'Neo Molosiwa'];
    const randomName = testNames[Math.floor(Math.random() * testNames.length)];
    const randomCode = `EMP-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toLocaleTimeString();

    const newScan = {
      id: Date.now(),
      name: randomName,
      code: randomCode,
      time: now,
      status: 'Clock In Verified'
    };

    setRecentScans([newScan, ...recentScans.slice(0, 4)]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <SiteClerkSideNav />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Kiosk Terminal" siteName={selectedSite} />

        {/* Back Link & Site Selector Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <Link
            href="/dashboard/site-clerk"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Kiosk Target Site:</span>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
            >
              {sites.map((site) => (
                <option key={site} value={site}>
                  {site} Terminal
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dynamic QR Code Generator Card */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-between text-center space-y-6">
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <QrCode className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Dynamic Scan QR</span>
              </div>
              <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-semibold">
                Refreshes in {countdown}s
              </span>
            </div>

            {/* Simulated QR Code Graphic */}
            <div className="relative p-6 bg-slate-900 rounded-3xl shadow-inner border-4 border-indigo-500/20 group">
              <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white p-3 rounded-2xl flex flex-col items-center justify-center space-y-2">
                {/* SVG Mock QR Code Grid */}
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="5" y="5" width="25" height="25" rx="3" />
                  <rect x="10" y="10" width="15" height="15" fill="white" />
                  <rect x="13" y="13" width="9" height="9" />
                  
                  <rect x="70" y="5" width="25" height="25" rx="3" />
                  <rect x="75" y="10" width="15" height="15" fill="white" />
                  <rect x="78" y="13" width="9" height="9" />
                  
                  <rect x="5" y="70" width="25" height="25" rx="3" />
                  <rect x="10" y="75" width="15" height="15" fill="white" />
                  <rect x="13" y="78" width="9" height="9" />
                  
                  {/* Pattern elements */}
                  <rect x="35" y="10" width="10" height="10" />
                  <rect x="50" y="15" width="15" height="8" />
                  <rect x="35" y="35" width="30" height="30" rx="2" />
                  <rect x="70" y="40" width="15" height="15" />
                  <rect x="40" y="75" width="20" height="15" />
                  <rect x="75" y="75" width="15" height="15" />
                </svg>
              </div>

              {/* Center Refresh Indicator */}
              <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1.5 rounded-full shadow-md animate-pulse">
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Payload Metadata Footer */}
            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Active Payload Timestamp</span>
                <span className="text-indigo-600">{timestamp}</span>
              </div>
              <p className="font-mono text-[11px] text-slate-600 truncate">{qrPayload}</p>
            </div>

            {/* Desktop Manual Trigger Button */}
            <button
              onClick={handleManualTestScan}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Trigger Desktop Scan Simulation
            </button>
          </div>

          {/* Live Webcam Audit & Recent Scans Stream */}
          <div className="lg:col-span-6 space-y-6 flex flex-col">
            {/* Webcam Frame Box */}
            <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 text-white space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Audit Webcam</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Buddy-Punch Protection
                </span>
              </div>

              {/* Video Overlay Stream */}
              <div className="relative w-full h-48 sm:h-56 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* Facial Frame Overlay Target */}
                <div className="absolute inset-0 border-2 border-dashed border-indigo-400/50 rounded-2xl m-6 pointer-events-none flex items-center justify-center">
                  <div className="w-24 h-24 border-2 border-indigo-400 rounded-full opacity-60 animate-ping" />
                </div>

                {!webcamActive && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center space-y-2 text-center p-4">
                    <ShieldAlert className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-slate-300 font-semibold">Webcam stream standby or simulated mode.</p>
                    <button
                      onClick={startCamera}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg border border-slate-700"
                    >
                      Enable Camera
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Scan Audit Stream */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex-1 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Verification Log</span>
                <span className="text-[10px] font-bold text-slate-400">Real-Time</span>
              </div>

              <div className="space-y-2.5">
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-extrabold text-slate-900">{scan.name}</h5>
                        <p className="text-[10px] text-slate-500 font-mono">{scan.code}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-800 block">{scan.time}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{scan.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center text-[11px] text-slate-400 font-medium">
                Scans automatically register timecard entries to <span className="font-bold text-slate-700">{selectedSite}</span>.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}