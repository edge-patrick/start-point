import DashboardWidgets from '@/components/DashboardWidgets';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-950">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4) contrast(1.1)',
        }}
      />

      <DashboardWidgets />
    </div>
  );
}
