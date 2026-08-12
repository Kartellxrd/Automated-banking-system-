'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowLeft, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  RefreshCw, 
  Smartphone, 
  CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

export default function QRKioskPage() {
  const [qrToken, setQrToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const siteLocation = 'Debete Site';

  // Generate dynamic QR payload with site name and timestamp
  const generateToken = () => {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      site: siteLocation,
      ts: timestamp,
    });
    
    // Base64 encode for simple URL transmission
    const encoded = btoa(payload);
    
    // Construct the absolute landing URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    setQrToken(`${baseUrl}/clock-in?token=${encoded}`);
    setTimeLeft(15);
  };

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
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* 1. Consistent Sidebar */}
      <SiteClerkSideNav />

      {/* 2. Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col justify-between overflow-x-hidden">
        {/* Top Header */}
        <SiteClerkNavbar title="Site QR Terminal" siteName={siteLocation} />

        {/* Kiosk Display Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs max-w-2xl mx-auto w-full flex flex-col items-center text-center space-y-6 my-auto">
          {/* Status Badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Terminal Live & Secure</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Scan QR Code to Clock In / Out
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
              Ask employees to open their mobile camera and point it at the screen below to submit attendance.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border-2 border-indigo-100 shadow-inner flex flex-col items-center justify-center relative">
            {qrToken ? (
              <QRCodeSVG 
                value={qrToken} 
                size={220} 
                level="H" 
                includeMargin={true}
                className="rounded-xl shadow-xs"
              />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            )}
          </div>

          {/* Auto-Refresh Counter */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2 rounded-2xl text-xs font-semibold text-slate-700">
            <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>Payload refreshes in <strong className="text-indigo-600 font-extrabold">{timeLeft}s</strong></span>
          </div>

          {/* Quick Testing Link Box */}
          <div className="w-full pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Testing locally on PC?</p>
                <p className="text-[11px] text-slate-500">Click below to open the mobile target directly in a new tab.</p>
              </div>
            </div>

            {qrToken && (
              <a
                href={qrToken}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shrink-0"
              >
                Open Clock-In Page ↗
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
          <span className="text-[11px] text-slate-400 font-medium">Periscope Field Kiosk v1.0</span>
        </div>
      </main>
    </div>
  );
}