"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  tabName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AdminErrorBoundary caught error in tab", this.props.tabName, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center space-y-4 my-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Impossibile visualizzare la sezione {this.props.tabName ? `"${this.props.tabName}"` : ""}
          </h3>
          <p className="max-w-md mx-auto text-xs text-zinc-400">
            {this.state.error?.message || "Si è verificato un errore imprevisto durante il rendering dei componenti."}
          </p>
          <div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 active:scale-95 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Riprova a caricare</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
