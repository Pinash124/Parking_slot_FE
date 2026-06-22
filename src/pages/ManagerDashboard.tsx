import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/managerService';

export default function ManagerDashboard() {

  const { data, isLoading } = useQuery({
    queryKey: ['managerDashboard'],
    queryFn: dashboardService.getManagerDashboard
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      <h1 className="text-3xl font-bold mb-8">
        Manager Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-6">

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3>Utilization</h3>
          <p className="text-4xl font-bold">
            {data?.utilizationRate}%
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3>Total Slots</h3>
          <p className="text-4xl font-bold">
            {data?.totalSlots}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3>Available Slots</h3>
          <p className="text-4xl font-bold text-emerald-400">
            {data?.availableSlots}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3>Revenue Today</h3>
          <p className="text-4xl font-bold text-indigo-400">
            {data?.todayRevenue.toLocaleString()} VND
          </p>
        </div>

      </div>

    </div>
  );
}