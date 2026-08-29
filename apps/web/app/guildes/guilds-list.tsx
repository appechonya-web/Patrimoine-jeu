"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  GUILD_BASE_DETECTION_RATE,
  GUILD_DETECTION_SENSITIVITY,
  GUILD_FOUNDING_COST,
  GUILD_MAX_DETECTION_PROBABILITY,
  GUILD_PER_MEMBER_DETECTION_INCREMENT,
  MAX_GUILD_MESSAGE_LENGTH,
  REFERENCE_UNIT_PRICE,
} from "@patrimoine-jeu/domain";
import type { Company, GuildMessageView, GuildView } from "../../lib/session";
import { GameError, foundGuild, joinGuild, leaveGuild, postGuildMessage, setGuildPriceFloor } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

function previewDetectionProbability(priceFloor: number, memberCount: number): number {
  const excessRatio = Math.max(0, priceFloor / REFERENCE_UNIT_PRICE - 1);
  const probability =
    GUILD_BASE_DETECTION_RATE +
    excessRatio * GUILD_DETECTION_SENSITIVITY +
    Math.max(0, memberCount - 1) * GUILD_PER_MEMBER_DETECTION_INCREMENT;
  return Math.min(GUILD_MAX_DETECTION_PROBABILITY, probability);
}

function FoundGuildForm({ myCompanies, onDone }: { myCompanies: Company[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(myCompanies[0]?.id ?? "");
  const [priceFloor, setPriceFloor] = useState(REFERENCE_UNIT_PRICE * 1.5);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await foundGuild(name, companyId, priceFloor);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  if (myCompanies.length === 0) {
    return <p className={styles.jobMeta}>Il te faut au moins une entreprise pour fonder un cartel.</p>;
  }

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="text"
        placeholder="Nom du cartel"
        minLength={2}
        maxLength={64}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select className={styles.formInput} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
        {myCompanies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name} ({company.sector})
          </option>
        ))}
      </select>
      <input
        className={styles.formInput}
        type="number"
        min={0.01}
        step={1}
        value={priceFloor}
        onChange={(e) => setPriceFloor(Number(e.target.value))}
      />
      <p className={styles.jobMeta}>
        Risque de détection estimé à 1 membre : {(previewDetectionProbability(priceFloor, 1) * 100).toFixed(1)}%
        (montera avec chaque nouveau membre)
      </p>
      <button className={styles.apply} type="submit" disabled={pending || !companyId}>
        {pending ? "…" : `Fonder (${currencyFormatter.format(GUILD_FOUNDING_COST)})`}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function GuildMessageBoard({ guildId, initialMessages }: { guildId: string; initialMessages: GuildMessageView[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const updated = await postGuildMessage(guildId, body);
      setMessages(updated);
      setBody("");
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h3 className={styles.jobMeta}>💬 Espace de coordination (membres uniquement)</h3>
      {messages.length > 0 && (
        <div className={styles.jobList}>
          {messages.map((message) => (
            <div key={message.id} className={styles.jobCard}>
              <div>
                <div className={styles.jobTitle}>{message.authorPseudo}</div>
                <div className={styles.jobMeta}>{message.body}</div>
                <div className={styles.jobStats}>
                  <span>Cycle n°{message.cycle}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <form noValidate className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.formInput}
          type="text"
          placeholder="Prix indicatif, projet collectif..."
          maxLength={MAX_GUILD_MESSAGE_LENGTH}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <button className={styles.apply} type="submit" disabled={pending}>
          {pending ? "…" : "Envoyer"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </>
  );
}

function GuildCard({
  guild,
  myCompanies,
  playerId,
  messages,
  onDone,
}: {
  guild: GuildView;
  myCompanies: Company[];
  playerId: string;
  messages: GuildMessageView[];
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floor, setFloor] = useState(guild.priceFloor);

  const isFounder = guild.founderPlayerId === playerId;
  const myMembership = guild.members.find((m) => m.playerId === playerId);
  const memberCompanyIds = new Set(guild.members.map((m) => m.companyId));
  const eligibleCompanies = myCompanies.filter(
    (company) => company.sector === guild.sectorName && !memberCompanyIds.has(company.id),
  );
  const [joinCompanyId, setJoinCompanyId] = useState(eligibleCompanies[0]?.id ?? "");

  async function handleJoin() {
    setError(null);
    setPending(true);
    try {
      await joinGuild(guild.id, joinCompanyId);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  async function handleLeave(companyId: string) {
    setError(null);
    setPending(true);
    try {
      await leaveGuild(guild.id, companyId);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  async function handleSetFloor(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await setGuildPriceFloor(guild.id, floor);
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
        <div className={styles.jobTitle}>
          {guild.name} {isFounder && "👑"}
        </div>
        <div className={styles.jobMeta}>
          {guild.sectorName} — prix plancher {currencyFormatter.format(guild.priceFloor)} —{" "}
          {guild.members.length} membre{guild.members.length > 1 ? "s" : ""}
        </div>
        <div className={styles.jobStats}>
          {guild.members.map((member) => (
            <span key={member.companyId}>
              {member.companyName}
              {member.playerId === playerId && " (moi)"}
            </span>
          ))}
        </div>
        <div className={styles.jobStats}>
          <span>
            {guild.detectionRisk.probability >= 0.15 ? "🔴" : guild.detectionRisk.probability >= 0.07 ? "🟠" : "🟢"}{" "}
            Risque de détection ce cycle : {(guild.detectionRisk.probability * 100).toFixed(1)}%
            {guild.detectionRisk.cappedAtMax && " (plafond atteint)"}
          </span>
        </div>
        <div className={styles.jobMeta}>
          Dont {(guild.detectionRisk.baseRate * 100).toFixed(1)}% de base
          {guild.detectionRisk.priceExcessContribution > 0 &&
            `, +${(guild.detectionRisk.priceExcessContribution * 100).toFixed(1)}% pour l'écart de prix`}
          {guild.detectionRisk.memberCountContribution > 0 &&
            `, +${(guild.detectionRisk.memberCountContribution * 100).toFixed(1)}% pour le nombre de membres`}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        {isFounder && (
          <form noValidate className={styles.form} onSubmit={handleSetFloor}>
            <input
              className={styles.formInput}
              type="number"
              min={0.01}
              step={1}
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
            />
            <button className={styles.apply} type="submit" disabled={pending}>
              {pending ? "…" : "Ajuster le plancher"}
            </button>
            {floor !== guild.priceFloor && (
              <span className={styles.jobMeta} style={{ width: "100%" }}>
                Nouveau risque estimé : {(previewDetectionProbability(floor, guild.members.length) * 100).toFixed(1)}%
                (actuellement {(guild.detectionRisk.probability * 100).toFixed(1)}%)
              </span>
            )}
          </form>
        )}
        {myMembership && (
          <button
            className={styles.logout}
            type="button"
            disabled={pending}
            onClick={() => handleLeave(myMembership.companyId)}
          >
            {pending ? "…" : "Quitter"}
          </button>
        )}
        {!myMembership && eligibleCompanies.length > 0 && (
          <>
            <select
              className={styles.formInput}
              value={joinCompanyId}
              onChange={(e) => setJoinCompanyId(e.target.value)}
            >
              {eligibleCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <button className={styles.apply} type="button" disabled={pending} onClick={handleJoin}>
              {pending ? "…" : "Rejoindre"}
            </button>
          </>
        )}
      </div>

      {myMembership && (
        <div style={{ width: "100%" }}>
          <GuildMessageBoard guildId={guild.id} initialMessages={messages} />
        </div>
      )}
    </div>
  );
}

export function GuildsList({
  guilds,
  myCompanies,
  playerId,
  messagesByGuildId,
}: {
  guilds: GuildView[];
  myCompanies: Company[];
  playerId: string;
  messagesByGuildId: Record<string, GuildMessageView[]>;
}) {
  const router = useRouter();

  function handleDone() {
    router.refresh();
  }

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🤝"
            title="Cartels actifs"
            mechanic="Les membres s'engagent à ne jamais vendre leur gamme de base sous un prix plancher commun — une entente sur les prix. Détection automatique chaque cycle, probabilité croissante avec l'écart au prix de référence et le nombre de membres (plus un cartel est gros et agressif sur les prix, plus il est repérable) — affiché en direct sur chaque cartel, décomposé pour voir ce qui pèse le plus."
            realWorld="C'est une vraie entente illégale sur les prix (cartel), avec un vrai risque de démantèlement — amende par entreprise membre et perte de réputation pour chaque propriétaire si détecté, exactement comme une autorité de la concurrence réelle."
          />
          <span>Cartels actifs</span>
        </h2>
        {guilds.length === 0 ? (
          <p className={styles.jobMeta}>Aucun cartel actif pour l'instant.</p>
        ) : (
          <div className={styles.jobList}>
            {guilds.map((guild) => (
              <GuildCard
                key={guild.id}
                guild={guild}
                myCompanies={myCompanies}
                playerId={playerId}
                messages={messagesByGuildId[guild.id] ?? []}
                onDone={handleDone}
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>➕ Fonder un cartel</h2>
        <FoundGuildForm myCompanies={myCompanies} onDone={handleDone} />
      </section>
    </>
  );
}
