import { parseEnv, redactConfig } from "@saltyfactory/config";
export default function Page() { const cfg = redactConfig(parseEnv()); return <><h1>settings</h1><section className="card"><pre>{JSON.stringify((cfg as any).providers, null, 2)}</pre></section></>; }
