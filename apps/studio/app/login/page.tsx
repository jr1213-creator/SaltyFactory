import LoginForm from "./LoginForm";

export default async function Login({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="main">
      <h1>SaltyFactory Studio Login</h1>
      {params?.error ? <LoginForm initialError={params.error} /> : <LoginForm />}
    </main>
  );
}
