import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { useMe } from "./auth";
import { AppLayout } from "./components/AppLayout";
import { Spinner } from "./components/ui";
import { AccountPage } from "./pages/AccountPage";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-brand-600">
      <Spinner className="size-6" />
    </div>
  );
}

function RequireAuth() {
  const { data, isPending } = useMe();
  if (isPending) return <FullPageSpinner />;
  if (!data?.user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function GuestOnly() {
  const { data, isPending } = useMe();
  if (isPending) return <FullPageSpinner />;
  if (data?.user) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <AuthPage mode="login" /> },
      { path: "/register", element: <AuthPage mode="register" /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/app",
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "calendars/:id/:tab?", element: <CalendarPage /> },
          { path: "account", element: <AccountPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
