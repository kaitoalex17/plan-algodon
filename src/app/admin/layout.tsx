import type { Metadata } from "next";
import AdminThemeWrapper from "./AdminThemeWrapper";

export const metadata: Metadata = {
  title: "Administración - Plan Algodón",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminThemeWrapper />
      {children}
    </>
  );
}
