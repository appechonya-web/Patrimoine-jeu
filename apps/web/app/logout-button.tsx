"use client";

import { useRouter } from "next/navigation";
import { logout } from "../lib/auth-client";
import styles from "./page.module.css";

export function LogoutButton() {
  const router = useRouter();

  async function handleClick() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <button className={styles.logout} type="button" onClick={handleClick}>
      Se déconnecter
    </button>
  );
}
