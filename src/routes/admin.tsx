import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Center, Loader } from "@mantine/core";
const AdminPage = lazy(() => import("../components/admin/AdminPage"));
export const Route = createFileRoute("/admin")({ component: AdminRoute });
function AdminRoute() {
  return (
    <Suspense
      fallback={
        <Center mih={240}>
          <Loader />
        </Center>
      }
    >
      <AdminPage />
    </Suspense>
  );
}
