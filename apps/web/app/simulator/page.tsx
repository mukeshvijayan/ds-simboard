import { Simulator } from "@/features/simulator/Simulator";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function SimulatorPage() {
  return (
    <main className="h-screen">
      <h1 className="sr-only">Simulator</h1>
      <AuthProvider>
        <Simulator />
      </AuthProvider>
    </main>
  );
}
