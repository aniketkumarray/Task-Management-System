import { ClipboardCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center p-4">
      <ThemeToggle className="absolute top-3 right-3" />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ClipboardCheck size={20} />
          </span>
          <span className="text-lg font-semibold">Task Tracker</span>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </div>
  );
}
