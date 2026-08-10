export const metadata = {
  title: 'Admin Control Center | Periscope Mining',
  description: 'Workforce management, staff provisioning, and role control',
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {children}
    </div>
  );
}