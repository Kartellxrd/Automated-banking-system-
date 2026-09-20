import { Geist, Geist_Mono } from "next/font/google";
import IdleSessionGuard from "@/components/shared/IdleSessionGuard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Periscope Mining System",
  description: "Attendance, payroll, approvals, payments and expense control for Periscope operations.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <IdleSessionGuard />
        {children}
      </body>
    </html>
  );
}
