"use client";

import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Clock3,
  Copy,
  CopyCheck,
  Download,
  FileCheck,
  LoaderCircle,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Footer } from "./components/Footer/Footer";
import { Grid } from "./components/Grid/Grid";
import { Main } from "./components/Main/Main";
import { Nav } from "./components/Nav/Nav";
import { NeuralBackdrop } from "./components/NeuralBackdrop";

type GenerateResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export default function Home() {
  const [textarea, setTextarea] = useState("");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const formatJson = (content: GenerateResponse | null): string => {
    if (!content) return "";

    try {
      return JSON.stringify(content.data, null, 4);
    } catch {
      return "";
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(formatJson(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([formatJson(result)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gerado.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!textarea.trim() || loading || cooldown > 0) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textarea }),
      });

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Erro ao gerar JSON");
      }

      setResult(data);
      setCooldown(15);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <NeuralBackdrop />

      <div className="page-content">
        <Nav>
          <h1>
            <span className="title-soft">Gerador de </span>
            <span className="title-bright">{`{json}`}</span>
            <span className="title-soft"> IA</span>
          </h1>
          <p>
            Geração de <strong>JSON</strong> rápida, gratuita e impecável. Apenas
            descreva o que você precisa e deixe a <strong>IA</strong> cuidar do resto.
          </p>
        </Nav>

        <Main>
          <form onSubmit={handleSubmit}>
            <textarea
              placeholder="Digite suas instruções aqui. Ex.: Crie uma lista de 3 pokémons com nome, tipo e habilidade."
              value={textarea}
              maxLength={600}
              onChange={(event) => {
                setTextarea(event.target.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            />
            {error ? <span>{error}</span> : null}

            <button type="submit" disabled={loading || !textarea.trim() || cooldown > 0}>
              {loading ? (
                <>
                  <LoaderCircle className="loading" />
                  <span>Gerando...</span>
                </>
              ) : cooldown > 0 ? (
                <>
                  <Clock3 />
                  <span>Aguarde {cooldown}s</span>
                </>
              ) : (
                <>
                  <Sparkles />
                  <span>Gerar com IA</span>
                </>
              )}
            </button>
          </form>

          {result && !error ? (
            <section className="result-panel" style={{ width: "100%" }}>
              <SyntaxHighlighter
                language="json"
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{
                  margin: 0,
                  tabSize: 4,
                  fontSize: "13px",
                  borderRadius: "10px",
                  padding: "20px",
                  backgroundColor: "#111111",
                  maxHeight: "450px",
                  overflow: "auto",
                  border: "1px solid rgba(64, 64, 64, 1)",
                }}
              >
                {formatJson(result)}
              </SyntaxHighlighter>

              <div style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
                <button type="button" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <CopyCheck size={18} /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={18} /> Copiar
                    </>
                  )}
                </button>
                <button type="button" onClick={handleDownload}>
                  {downloaded ? (
                    <>
                      <FileCheck size={18} /> Baixado!
                    </>
                  ) : (
                    <>
                      <Download size={18} /> Baixar
                    </>
                  )}
                </button>
              </div>
            </section>
          ) : null}
        </Main>

        <Grid columns={3}>
          <div className="feature-card">
            <PencilLine />
            <h3>Descreva</h3>
            <p>Escreva que tipo de dados você precisa em português ou qualquer outro idioma.</p>
          </div>
          <div className="feature-card">
            <Sparkles />
            <h3>Gere</h3>
            <p>A IA interpreta o texto digitado e monta um JSON coerente com o tema pedido.</p>
          </div>
          <div className="feature-card">
            <ClipboardCheck />
            <h3>Obtenha</h3>
            <p>Copie ou baixe facilmente o arquivo JSON com apenas um clique.</p>
          </div>
        </Grid>

        <Footer>
          <small>
            Elaborado e desenvolvido por{" "}
            <a href="https://www.lumni.dev.br/" target="_blank" rel="noreferrer">
              Lumni
            </a>{" "}
            /{" "}
            <a href="https://www.danielmazzeu.com.br/" target="_blank" rel="noreferrer">
              Daniel Mazzeu
            </a>
            .
            <br />
            API JSON local. Todos os direitos reservados {currentYear}.
          </small>
        </Footer>
      </div>
    </div>
  );
}
