import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api";
import { Logo } from "../components/Logo";
import { Button, Card, ErrorMessage, Field, Input } from "../components/ui";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isLogin = mode === "login";

  const submit = useMutation({
    mutationFn: () => (isLogin ? api.login(email, password) : api.register(email, password)),
    onSuccess: ({ user }) => {
      qc.setQueryData(["me"], { user });
      navigate("/app");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo />
      <Card className="mt-8 w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold">{isLogin ? "Connexion" : "Créer un compte"}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Adresse e-mail">
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mot de passe" hint={isLogin ? undefined : "8 caractères minimum"}>
            <Input
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={isLogin ? undefined : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <ErrorMessage error={submit.error} />
          <Button type="submit" className="w-full" loading={submit.isPending}>
            {isLogin ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-sm text-slate-600">
        {isLogin ? "Pas encore de compte ? " : "Déjà inscrit ? "}
        <Link to={isLogin ? "/register" : "/login"} className="font-medium text-brand-600 hover:underline">
          {isLogin ? "Créer un compte" : "Se connecter"}
        </Link>
      </p>
    </div>
  );
}
