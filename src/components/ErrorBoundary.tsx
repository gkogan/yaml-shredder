import React from "react";

export class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
}, { hasError: boolean; error: unknown }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentDidCatch(error: any, info: any) {
    // Optionally log error
    if (typeof window !== "undefined") {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: "#dc2626", background: "#fff0f0", borderRadius: 16, margin: 32, fontSize: 18, fontWeight: 600 }}>
          <div>⚠️ Something went wrong rendering this page.</div>
          <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
