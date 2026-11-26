import { createRootRoute, Outlet } from "@tanstack/react-router";
import { SiteProvider } from "@/lib/site";
import { Toaster } from "sonner";

export const Route = createRootRoute({
  component: () => <SiteProvider><Outlet/><Toaster position="bottom-center" richColors/></SiteProvider>,
});
