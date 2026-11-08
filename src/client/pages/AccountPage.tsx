import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api } from "../api";
import { useMe } from "../auth";
import { Button, Card, ErrorMessage, Field, Input } from "../components/ui";

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const change = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => {
      setCurrent("");
      setNext("");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    change.mutate();
  };

  return (
    <Card className="p-6">
      <h2 className="font-semibold">Mot de passe</h2>
      <p className="mt-1 text-sm text-slate-500">Les autres sessions seront déconnectées.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <Field label="Mot de passe actuel">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="Nouveau mot de passe" hint="8 caractères minimum">
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <ErrorMessage error={change.error} />
        {change.isSuccess && <p className="text-sm text-emerald-700">Mot de passe mis à jour.</p>}
        <Button type="submit" loading={change.isPending}>
          Mettre à jour
        </Button>
      </form>
    </Card>
  );
}

function ExportData() {
  return (
    <Card className="p-6">
      <h2 className="font-semibold">Vos données</h2>
      <p className="mt-1 text-sm text-slate-500">
        Téléchargez tout ce que SchedulePilot conserve sur vous : compte, calendriers et réglages (fichier JSON).
      </p>
      <a
        href="/api/auth/me/export"
        download
        className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50"
      >
        Télécharger mes données
      </a>
    </Card>
  );
}

function DeleteAccount() {
  const [password, setPassword] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const remove = useMutation({
    mutationFn: () => api.deleteAccount(password),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(["me"], { user: null });
      navigate("/");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (confirm("Supprimer définitivement votre compte et tous vos calendriers ?")) remove.mutate();
  };

  return (
    <Card className="p-6 ring-red-200">
      <h2 className="font-semibold text-red-700">Supprimer le compte</h2>
      <p className="mt-1 text-sm text-slate-500">
        Vos calendriers, règles et liens d'abonnement seront supprimés. Cette action est irréversible.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Mot de passe">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>
        <Button type="submit" variant="danger" loading={remove.isPending}>
          Supprimer
        </Button>
      </form>
      <div className="mt-3">
        <ErrorMessage error={remove.error} />
      </div>
    </Card>
  );
}

export function AccountPage() {
  const { data } = useMe();
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compte</h1>
        <p className="mt-1 text-sm text-slate-500">{data?.user?.email}</p>
      </div>
      <ChangePassword />
      <ExportData />
      <DeleteAccount />
    </div>
  );
}
