"use client";

import { useEffect } from "react";

export default function AdminThemeWrapper() {
  useEffect(() => {
    document.documentElement.classList.add("admin-page");
    document.body.classList.add("admin-page");

    return () => {
      document.documentElement.classList.remove("admin-page");
      document.body.classList.remove("admin-page");
    };
  }, []);

  return null;
}
