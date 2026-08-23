"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_STARTING_PROFILE_ID, STARTING_PROFILE_LIST, type StartingProfileId } from "@patrimoine-jeu/domain";
import { register, AuthError } from "../../lib/auth-client";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [startingProfileId, setStartingProfileId] = useState<StartingProfileId>(DEFAULT_STARTING_PROFILE_ID);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, pseudo, password, startingProfileId);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>🚀 Créer un compte</h1>
      <p className={styles.subtitle}>Commence à bâtir ton patrimoine.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="pseudo">Pseudo</label>
          <input
            id="pseudo"
            type="text"
            autoComplete="username"
            minLength={3}
            maxLength={32}
            required
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Profil de départ</label>
          <div className={styles.profileOptions}>
            {STARTING_PROFILE_LIST.map((profile) => (
              <label
                key={profile.id}
                className={`${styles.profileOption} ${startingProfileId === profile.id ? styles.profileOptionSelected : ""}`}
              >
                <input
                  type="radio"
                  name="startingProfile"
                  value={profile.id}
                  checked={startingProfileId === profile.id}
                  onChange={() => setStartingProfileId(profile.id)}
                />
                <div>
                  <div className={styles.profileOptionLabel}>{profile.label}</div>
                  <div className={styles.profileOptionDescription}>{profile.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? "…" : "Créer mon compte →"}
        </button>
      </form>

      <p className={styles.switch}>
        Déjà un compte ? <Link href="/login">Se connecter</Link>
      </p>
    </main>
  );
}
