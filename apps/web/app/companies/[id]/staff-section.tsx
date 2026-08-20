"use client";

import { useState, type FormEvent } from "react";
import { PLAYER_JOB_MAX_PRESSURE, PLAYER_JOB_MIN_PRESSURE } from "@patrimoine-jeu/domain";
import type { CompanyStaffView } from "../../../lib/session";
import { GameError, cancelJobPosting, createJobPosting, fireCompanyEmployee } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function PostingRow({ posting, onDone }: { posting: CompanyStaffView["openPostings"][number]; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    setPending(true);
    try {
      await cancelJobPosting(posting.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{posting.role}</div>
        <div className={styles.jobStats}>
          <span>🔥 Pression {posting.pressure}/100</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(posting.salaryPerCycle)} / cycle</div>
        <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
          {pending ? "…" : "🚫 Retirer"}
        </button>
      </div>
    </div>
  );
}

function EmployeeRow({ employee, onDone }: { employee: CompanyStaffView["employees"][number]; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFire() {
    setError(null);
    setPending(true);
    try {
      await fireCompanyEmployee(employee.employmentId);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{employee.role}</div>
        <div className={styles.jobMeta}>
          {employee.playerPseudo} — depuis le cycle n°{employee.startedCycle}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(employee.salaryPerCycle)} / cycle</div>
        <button className={styles.logout} type="button" disabled={pending} onClick={handleFire}>
          {pending ? "…" : "🚪 Licencier"}
        </button>
      </div>
    </div>
  );
}

function CreatePostingForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState(50);
  const [pressure, setPressure] = useState(50);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createJobPosting(companyId, role, salary, pressure);
      setRole("");
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="text"
        placeholder="Intitulé du poste"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        minLength={2}
        maxLength={60}
        required
      />
      <input
        className={styles.formInput}
        type="number"
        min={1}
        step={1}
        value={salary}
        onChange={(e) => setSalary(Number(e.target.value))}
      />
      <input
        className={styles.formInput}
        type="number"
        min={PLAYER_JOB_MIN_PRESSURE}
        max={PLAYER_JOB_MAX_PRESSURE}
        step={5}
        value={pressure}
        onChange={(e) => setPressure(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🧑‍💼 Publier l'offre"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function StaffSection({
  companyId,
  isPrimaryOwner,
  staff,
  onDone,
}: {
  companyId: string;
  isPrimaryOwner: boolean;
  staff: CompanyStaffView | null;
  onDone: () => void;
}) {
  if (!isPrimaryOwner || !staff) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🧑‍💼"
          title="Recrutement entre joueurs"
          mechanic="Le salaire d'un employé-joueur est payé depuis la trésorerie réelle de l'entreprise, cycle après cycle — pas depuis le profit comptable. Si la trésorerie ne couvre plus la masse salariale totale un cycle donné, tous les employés-joueurs sont licenciés d'un coup."
          realWorld="C'est la différence entre profit et trésorerie qui coule (cash flow) : une entreprise 'rentable sur le papier' peut quand même manquer de liquidités pour payer ses salaires si l'argent est immobilisé ailleurs — une cause réelle et fréquente de faillite, même pour des entreprises en croissance."
          tip="Vérifie ta trésorerie disponible avant de publier une offre — un salaire que tu ne peux plus payer dans quelques cycles licenciera brutalement l'employé et abîme ta réputation d'employeur."
        />
        <span>Recrutement entre joueurs</span>
      </h2>
      <p className={styles.jobMeta}>
        Publie une offre d'emploi ouverte à tous les joueurs — le salaire est payé depuis la trésorerie réelle de
        l'entreprise à chaque cycle. Si la trésorerie ne suffit plus, tes employés sont automatiquement licenciés.
      </p>

      {staff.employees.length > 0 && (
        <div className={styles.jobList}>
          {staff.employees.map((employee) => (
            <EmployeeRow key={employee.employmentId} employee={employee} onDone={onDone} />
          ))}
        </div>
      )}

      {staff.openPostings.length > 0 && (
        <div className={styles.jobList}>
          {staff.openPostings.map((posting) => (
            <PostingRow key={posting.id} posting={posting} onDone={onDone} />
          ))}
        </div>
      )}

      <CreatePostingForm companyId={companyId} onDone={onDone} />
    </section>
  );
}
