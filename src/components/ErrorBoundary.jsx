import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
            gpp_maybe
          </span>
          <h1 className="text-2xl font-black text-gray-900 mb-2">
            Sistem Sedang Gangguan
          </h1>
          <p className="text-gray-600 text-center mb-4">
            Komponen ini mengalami kendala teknis. Tim kami sedang menanganinya.
          </p>
          {this.state.error && (
            <div className="max-w-md w-full p-3 bg-red-100/80 border border-red-300 rounded-xl mb-6 text-left font-mono text-xs text-red-900 overflow-x-auto">
              <strong className="block font-sans font-black mb-1 text-red-950">Detail Masalah:</strong>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-neo active:translate-y-0.5 transition-all"
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
